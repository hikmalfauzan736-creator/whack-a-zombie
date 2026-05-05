// AUDIO ENGINE
let audioCtx=null, soundEnabled=true;

// Game BGM state
let bgmNode=null, bgmGain=null, bgmStarted=false;

// Menu BGM state 
let menuCtx=null, menuMasterGain=null, menuOscillators=[], menuThudTimer=null, menuRunning=false;

function getAudioCtx(){
  if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(type,freq,duration,gainVal,opts={}){
  if(!soundEnabled)return;
  try{const ctx=getAudioCtx();const osc=ctx.createOscillator();const gain=ctx.createGain();
  osc.connect(gain);gain.connect(ctx.destination);osc.type=type;
  osc.frequency.setValueAtTime(freq,ctx.currentTime);
  if(opts.freqEnd)osc.frequency.exponentialRampToValueAtTime(opts.freqEnd,ctx.currentTime+duration);
  gain.gain.setValueAtTime(gainVal,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+duration);
  osc.start(ctx.currentTime);osc.stop(ctx.currentTime+duration);}catch(e){}
}
function playNoise(duration,gainVal,filterFreq=800){
  if(!soundEnabled)return;
  try{const ctx=getAudioCtx();const bufSize=ctx.sampleRate*duration;
  const buf=ctx.createBuffer(1,bufSize,ctx.sampleRate);const data=buf.getChannelData(0);
  for(let i=0;i<bufSize;i++)data[i]=Math.random()*2-1;
  const source=ctx.createBufferSource();source.buffer=buf;
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=filterFreq;
  const gain=ctx.createGain();gain.gain.setValueAtTime(gainVal,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+duration);
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
  source.start();source.stop(ctx.currentTime+duration);}catch(e){}
}

const SFX={
  whack(){playNoise(0.08,0.6,400);playTone('square',180,0.12,0.3,{freqEnd:80});},
  comboUp(c){const freqs=[440,550,660,880,1100];playTone('sine',freqs[Math.min(c-2,freqs.length-1)],0.18,0.25);},
  trap(){playTone('sawtooth',120,0.3,0.4,{freqEnd:60});playNoise(0.15,0.3,200);},
  levelUp(){const ctx=getAudioCtx();if(!soundEnabled)return;[0,0.15,0.3].forEach((delay,i)=>{const freq=[523,659,784][i];try{const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='triangle';osc.frequency.value=freq;gain.gain.setValueAtTime(0.001,ctx.currentTime+delay);gain.gain.linearRampToValueAtTime(0.3,ctx.currentTime+delay+0.05);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+delay+0.35);osc.start(ctx.currentTime+delay);osc.stop(ctx.currentTime+delay+0.4);}catch(e){}});},
  gameOver(){playTone('sawtooth',200,0.6,0.35,{freqEnd:60});setTimeout(()=>playTone('square',100,0.5,0.25,{freqEnd:50}),200);},
  pop(){playTone('sine',880,0.08,0.15,{freqEnd:1200});},
  countdown(){playTone('sine',660,0.12,0.2);},
  waveStart(){playTone('square',300,0.1,0.3,{freqEnd:600});setTimeout(()=>playTone('square',600,0.15,0.25),120);},
  powerupSlow(){playTone('sine',600,0.25,0.3,{freqEnd:300});},
  powerupBomb(){playNoise(0.06,0.8,600);playTone('square',400,0.2,0.4,{freqEnd:100});},
  powerupShield(){playTone('triangle',500,0.2,0.25,{freqEnd:800});setTimeout(()=>playTone('triangle',800,0.2,0.2,{freqEnd:1100}),150);},
  multUp(m){const f=200+m*60;playTone('sine',f,0.1,0.2,{freqEnd:f*1.3});}
};

// GAME BGM
function startBGM(){
  if(!soundEnabled||bgmStarted)return; bgmStarted=true;
  try{
    const ctx=getAudioCtx();
    bgmGain=ctx.createGain(); bgmGain.gain.value=0.08; bgmGain.connect(ctx.destination);
    const drone=ctx.createOscillator(); drone.type='sawtooth'; drone.frequency.value=55;
    const droneFilter=ctx.createBiquadFilter(); droneFilter.type='lowpass'; droneFilter.frequency.value=120;
    const droneLfo=ctx.createOscillator(); droneLfo.frequency.value=0.2;
    const droneLfoGain=ctx.createGain(); droneLfoGain.gain.value=15;
    droneLfo.connect(droneLfoGain); droneLfoGain.connect(droneFilter.frequency);
    drone.connect(droneFilter); droneFilter.connect(bgmGain);
    drone.start(); droneLfo.start(); bgmNode=drone;
    schedulePulse(ctx);
  }catch(e){}
}
function schedulePulse(ctx){
  if(!bgmStarted||!soundEnabled)return;
  const pulse=()=>{
    if(!bgmStarted||!bgmGain)return;
    try{const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type='sine';osc.frequency.value=70;
    gain.gain.setValueAtTime(0.3,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.18);
    osc.connect(gain);gain.connect(bgmGain);osc.start();osc.stop(ctx.currentTime+0.2);}catch(e){}
    setTimeout(pulse,700);
  }; setTimeout(pulse,300);
}
function stopBGM(){
  bgmStarted=false;
  if(bgmNode){try{bgmNode.stop();}catch(e){} bgmNode=null;}
  if(bgmGain){try{bgmGain.disconnect();}catch(e){} bgmGain=null;}
}

function startMenuBGM(){
  if(!soundEnabled||menuRunning) return;
  try{
    const ctx=getAudioCtx();
    if(ctx.state==='suspended') ctx.resume();

    menuRunning=true;
    menuMasterGain=ctx.createGain();
    menuMasterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    menuMasterGain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime+2.0);
    menuMasterGain.connect(ctx.destination);

    const sub=ctx.createOscillator(); sub.type='sine'; sub.frequency.value=41;
    const subG=ctx.createGain(); subG.gain.value=0.55;
    sub.connect(subG); subG.connect(menuMasterGain); sub.start();

    const mid=ctx.createOscillator(); mid.type='sawtooth'; mid.frequency.value=82;
    const midF=ctx.createBiquadFilter(); midF.type='lowpass'; midF.frequency.value=180;
    const midG=ctx.createGain(); midG.gain.value=0.28;
    const lfo=ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.07;
    const lfoG=ctx.createGain(); lfoG.gain.value=14;
    lfo.connect(lfoG); lfoG.connect(mid.frequency);
    mid.connect(midF); midF.connect(midG); midG.connect(menuMasterGain);
    mid.start(); lfo.start();

    const hi=ctx.createOscillator(); hi.type='triangle'; hi.frequency.value=328;
    const hiF=ctx.createBiquadFilter(); hiF.type='bandpass'; hiF.frequency.value=380; hiF.Q.value=4;
    const hiG=ctx.createGain(); hiG.gain.value=0.045;
    const hiLfo=ctx.createOscillator(); hiLfo.type='sine'; hiLfo.frequency.value=0.13;
    const hiLfoG=ctx.createGain(); hiLfoG.gain.value=28;
    hiLfo.connect(hiLfoG); hiLfoG.connect(hi.frequency);
    hi.connect(hiF); hiF.connect(hiG); hiG.connect(menuMasterGain);
    hi.start(); hiLfo.start();

    menuOscillators=[sub, mid, lfo, hi, hiLfo];

    function doThud(){
      if(!menuRunning||!menuMasterGain) return;
      try{
        const o=ctx.createOscillator(); const g=ctx.createGain();
        o.type='sine';
        o.frequency.setValueAtTime(75, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(28, ctx.currentTime+0.45);
        g.gain.setValueAtTime(0.28, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.5);
        o.connect(g); g.connect(menuMasterGain);
        o.start(); o.stop(ctx.currentTime+0.55);
      }catch(e){}
      menuThudTimer=setTimeout(doThud, 1800+Math.random()*2800);
    }
    menuThudTimer=setTimeout(doThud, 1000);

  }catch(e){ menuRunning=false; console.error('MenuBGM error:',e); }
}

function stopMenuBGM(){
  if(!menuRunning) return;
  menuRunning=false;
  clearTimeout(menuThudTimer); menuThudTimer=null;
  menuOscillators.forEach(n=>{ try{n.stop(0);}catch(e){} });
  menuOscillators=[];
  if(menuMasterGain){ try{menuMasterGain.disconnect();}catch(e){} menuMasterGain=null; }
}

function toggleSound(){
  soundEnabled=!soundEnabled;
  document.getElementById('soundToggle').textContent=soundEnabled?'🔊':'🔇';
  document.getElementById('vuMeter').classList.toggle('muted',!soundEnabled);
  if(!soundEnabled){
    stopBGM(); stopMenuBGM();
  } else {
    const ac=document.querySelector('.screen.active');
    if(ac && ac.id!=='game') startMenuBGM();
  }
}

// SKINS
const SKINS=[
  {id:'classic',emoji:'🧟',name:'Classic',unlockLv:1,trapEmoji:'💣'},
  {id:'skull',emoji:'💀',name:'Skull',unlockLv:3,trapEmoji:'🕷️'},
  {id:'vampire',emoji:'🧛',name:'Vampire',unlockLv:5,trapEmoji:'🧲'},
  {id:'demon',emoji:'😈',name:'Demon',unlockLv:8,trapEmoji:'🔥'},
  {id:'alien',emoji:'👽',name:'Alien',unlockLv:12,trapEmoji:'☢️'},
  {id:'ghost',emoji:'👻',name:'Ghost',unlockLv:15,trapEmoji:'⚡'},
  {id:'witch',emoji:'🧙',name:'Witch',unlockLv:20,trapEmoji:'🕳️'},
  {id:'dragon',emoji:'🐲',name:'Dragon',unlockLv:25,trapEmoji:'💥'},
];

// PLAYER / LEVEL
function getPlayer(){try{return JSON.parse(localStorage.getItem('waz_player')||'null')||{xp:0,level:1,skinId:'classic'};}catch{return{xp:0,level:1,skinId:'classic'};}}
function savePlayer(d){localStorage.setItem('waz_player',JSON.stringify(d));}
function xpForLevel(lv){return Math.floor(80*Math.pow(lv,1.35));}
function addXP(amount){const d=getPlayer();d.xp+=amount;const prevLv=d.level;while(d.xp>=xpForLevel(d.level)){d.xp-=xpForLevel(d.level);d.level++;}savePlayer(d);return{newLv:d.level,leveled:d.level>prevLv,prevLv};}
function refreshMenuLevel(){const d=getPlayer();const needed=xpForLevel(d.level);document.getElementById('menuLvNum').textContent=d.level;document.getElementById('menuXpBar').style.width=(d.xp/needed*100)+'%';document.getElementById('menuXpText').textContent=`${d.xp} / ${needed} XP`;const skin=SKINS.find(s=>s.id===d.skinId)||SKINS[0];document.getElementById('menuDeco').textContent=skin.emoji;}
function getActiveSkin(){const d=getPlayer();return SKINS.find(s=>s.id===d.skinId)||SKINS[0];}

// STATISTICS
const STAT_KEY='waz_stats';
function getStats(){try{return JSON.parse(localStorage.getItem(STAT_KEY)||'null')||{totalGames:0,bestScore:0,totalHits:0,totalTraps:0,totalClicks:0,bestCombo:0,currentStreak:0,bestStreak:0,byDiff:{easy:0,normal:0,hard:0,insane:0}};}catch{return{totalGames:0,bestScore:0,totalHits:0,totalTraps:0,totalClicks:0,bestCombo:0,currentStreak:0,bestStreak:0,byDiff:{easy:0,normal:0,hard:0,insane:0}};}}
function saveStats(s){localStorage.setItem(STAT_KEY,JSON.stringify(s));}
function recordGame(sc,h,t,mc,clicks,diff){const s=getStats();s.totalGames++;s.bestScore=Math.max(s.bestScore,sc);s.totalHits+=h;s.totalTraps+=t;s.totalClicks+=clicks;s.bestCombo=Math.max(s.bestCombo,mc);s.byDiff[diff]=(s.byDiff[diff]||0)+1;if(t===0){s.currentStreak++;s.bestStreak=Math.max(s.bestStreak,s.currentStreak);}else{s.currentStreak=0;}saveStats(s);}
function renderStats(){const s=getStats();document.getElementById('st-best').textContent=s.bestScore;document.getElementById('st-games').textContent=s.totalGames;document.getElementById('st-hits').textContent=s.totalHits;document.getElementById('st-traps').textContent=s.totalTraps;document.getElementById('st-combo').textContent=s.bestCombo?`x${s.bestCombo}`:'0';const acc=s.totalClicks>0?Math.round(s.totalHits/s.totalClicks*100):0;document.getElementById('st-acc').textContent=acc+'%';document.getElementById('st-streak').textContent=s.bestStreak;const maxD=Math.max(...Object.values(s.byDiff),1);['easy','normal','hard','insane'].forEach(d=>{const cnt=s.byDiff[d]||0;document.getElementById(`cnt-${d}`).textContent=cnt;document.getElementById(`bar-${d}`).style.width=(cnt/maxD*100)+'%';});}

// SKIN SCREEN
function buildSkinScreen(){const d=getPlayer();const grid=document.getElementById('skinGrid');grid.innerHTML='';SKINS.forEach(skin=>{const unlocked=d.level>=skin.unlockLv;const selected=d.skinId===skin.id;const card=document.createElement('div');card.className='skin-card'+(unlocked?'':' locked')+(selected?' selected':'');card.innerHTML=`${selected?'<span class="skin-active-tag">✔ AKTIF</span>':''}${!unlocked?'<span class="skin-lock-ico">🔒</span>':''}<span class="skin-emoji">${skin.emoji}</span><span class="skin-name">${skin.name}</span><span class="skin-req ${unlocked?'ok':''}">Lv ${skin.unlockLv}${unlocked?' ✓':''}</span>`;if(unlocked){card.addEventListener('click',()=>{d.skinId=skin.id;savePlayer(d);SFX.pop();buildSkinScreen();showNotif(`${skin.emoji} ${skin.name} dipakai!`);refreshMenuLevel();});}grid.appendChild(card);});}

// LEADERBOARD
function getLB(){try{return JSON.parse(localStorage.getItem('waz_lb')||'[]');}catch{return[];}}
function saveLB(lb){localStorage.setItem('waz_lb',JSON.stringify(lb));}
function addLBScore(name,pts){const lb=getLB();lb.push({name:(name.trim()||'Anonymous'),score:pts,diff:selectedDiff});lb.sort((a,b)=>b.score-a.score);saveLB(lb.slice(0,10));}
function renderLB(cid,highlight=null){const lb=getLB();const el=document.getElementById(cid);if(!lb.length){el.innerHTML='<div style="color:#2a2a2a;font-size:12px;text-align:center">Belum ada skor...</div>';return;}const medals=['gold','silver','bronze'];el.innerHTML=lb.slice(0,8).map((e,i)=>`<div class="lb-row"><span class="lb-rank ${medals[i]||''}">${i+1}</span><span class="lb-name">${e.name} <small style="color:#3a3a3a;font-size:10px">[${e.diff||'?'}]</small></span><span class="lb-pts">${e.score}${highlight!==null&&e.score===highlight&&i===lb.findIndex(x=>x.score===highlight)?'<span class="lb-new">NEW</span>':''}</span></div>`).join('');}

// GAME CONFIG + WAVE SYSTEM
const DIFF={
  easy:  {spawnMin:1200,spawnMax:2000,showMin:2300,showMax:3600,trapChance:.08,duration:45,penalty:0,xpMult:.8,waveKills:8,  puChance:.12},
  normal:{spawnMin:800, spawnMax:1500,showMin:1600,showMax:2700,trapChance:.15,duration:30,penalty:3,xpMult:1,  waveKills:10, puChance:.10},
  hard:  {spawnMin:480, spawnMax:980, showMin:1000,showMax:1900,trapChance:.22,duration:30,penalty:5,xpMult:1.5,waveKills:12, puChance:.08},
  insane:{spawnMin:260, spawnMax:640, showMin:650, showMax:1300,trapChance:.30,duration:30,penalty:8,xpMult:2.2,waveKills:15, puChance:.06},
};

// Power-up
const POWERUPS={
  slow: {emoji:'❄️', label:'SLOW',    desc:'⏱ Zombie Melambat!',   color:'slow',   duration:6000},
  bomb: {emoji:'💥', label:'BOMB',    desc:'💥 Semua Zombie Meledak!', color:'bomb', duration:0},
  shield:{emoji:'🛡️',label:'SHIELD',  desc:'🛡 Kebal Jebakan 8s!', color:'shield', duration:8000},
};

const HOLES=9;
let cfg=DIFF.normal,selectedDiff='normal';
let score=0,hits=0,trapsHit=0,totalClicks=0,combo=1,maxCombo=1,timeLeft=30;
let gameActive=false;
let holeStates=Array(HOLES).fill(null),holeTimers=Array(HOLES).fill(null);
let spawnTimer=null,countdownTimer=null;

// Wave state
let currentWave=1,waveKillCount=0,waveKillTarget=10;
let waveSpeedMult=1.0;

// Live multiplier 
let liveMult=1;
const MULT_THRESHOLDS=[1,3,5,8,10];
const MULT_VALUES=[1,2,3,5,10];
function getMultFromCombo(c){
  let m=1;
  for(let i=0;i<MULT_THRESHOLDS.length;i++){if(c>=MULT_THRESHOLDS[i])m=MULT_VALUES[i];}
  return m;
}
function getMultClass(m){
  if(m>=10)return'mult-x10';if(m>=5)return'mult-x5';if(m>=3)return'mult-x3';if(m>=2)return'mult-x2';return'mult-x1';
}
function getZombieSize(m){
  if(m>=10)return'mult-huge';if(m>=5)return'mult-big';return'';
}

//  Power-up state 
let activePowerups={slow:null,shield:null};
let puCooldown=false;

// GRID BUILD
function buildGrid(){
  const grid=document.getElementById('grid');grid.innerHTML='';
  for(let i=0;i<HOLES;i++){
    const hole=document.createElement('div');hole.className='hole';hole.dataset.idx=i;
    hole.innerHTML=`<div class="character" id="char${i}"></div><div class="hole-pit"></div><div class="hole-ground"></div><div class="hole-grass"></div>`;
    hole.addEventListener('click',()=>onHoleClick(i));
    grid.appendChild(hole);
  }
}

function setCharContent(idx,type){
  const el=document.getElementById(`char${idx}`);
  const skin=getActiveSkin();
  const m=liveMult;
  const sizeClass=getZombieSize(m);
  if(type==='zombie'){
    el.innerHTML=`<span class="char-emoji ${sizeClass}">${skin.emoji}</span>`;
  } else if(type==='trap'){
    el.innerHTML=`<span class="char-emoji trap-e ${sizeClass}">${skin.trapEmoji}</span><div class="trap-label">⚠ JEBAKAN</div>`;
  } else {
    // powerup
    const pu=POWERUPS[type.replace('powerup_','')];
    el.innerHTML=`<span class="char-emoji powerup-${type.replace('powerup_','')}-e">${pu.emoji}</span><div class="powerup-label ${type.replace('powerup_','')}">${pu.label}</div>`;
  }
}

// WAVE SYSTEM
function advanceWave(){
  currentWave++;
  waveKillCount=0;
  waveKillTarget=Math.floor(cfg.waveKills*Math.pow(1.2,currentWave-1));
  waveSpeedMult=Math.max(0.3,1.0-((currentWave-1)*0.12));
  SFX.waveStart();
  showWaveBanner(currentWave);
  updateWaveHUD();
  
  if(bgmGain&&soundEnabled){
    bgmGain.gain.setTargetAtTime(Math.min(0.08+currentWave*0.015,0.22),getAudioCtx().currentTime,0.5);
  }
}

function onWaveKill(){
  waveKillCount++;
  updateWaveHUD();
  if(waveKillCount>=waveKillTarget){advanceWave();}
}

function updateWaveHUD(){
  document.getElementById('waveBadge').textContent=`🌊 Wave ${currentWave}`;
  const pct=Math.min((waveKillCount/waveKillTarget)*100,100);
  document.getElementById('waveProgressBar').style.width=pct+'%';
  document.getElementById('waveInfo').textContent=`${waveKillCount} / ${waveKillTarget} kills`;
}

function showWaveBanner(waveNum){
  const b=document.createElement('div');b.className='wave-banner';
  const msgs=['','Horde Pertama!','Mereka Bertambah!','Tak Ada Henti!','Mimpi Buruk!','Armageddon!'];
  const sub=msgs[Math.min(waveNum,msgs.length-1)]||`Intensitas ${waveNum}x`;
  b.innerHTML=`<div class="wave-banner-text">🌊 WAVE ${waveNum}</div><div class="wave-banner-sub"><span>${sub}</span> — Lebih Cepat!</div>`;
  document.body.appendChild(b);setTimeout(()=>b.remove(),2300);
}

// POWER-UP SYSTEM
function activatePowerup(type){
  const pu=POWERUPS[type];
  SFX[`powerup${type.charAt(0).toUpperCase()+type.slice(1)}`]?.();
  showPuBanner(pu.desc,pu.color);
  flashOverlay(type);

  if(type==='slow'){
    if(activePowerups.slow){clearTimeout(activePowerups.slow.timerId);}
    activePowerups.slow={expires:Date.now()+pu.duration,timerId:setTimeout(()=>{activePowerups.slow=null;updatePuBar();},pu.duration)};
    updatePuBar();
  } else if(type==='bomb'){
    let bonusKills=0;
    for(let i=0;i<HOLES;i++){
      if(holeStates[i]==='zombie'){
        clearTimeout(holeTimers[i]);holeTimers[i]=null;
        const el=document.getElementById(`char${i}`);
        el.classList.remove('up');el.classList.add('whacked');
        setTimeout(()=>el.classList.remove('whacked'),240);
        holeStates[i]=null;bonusKills++;
      } else if(holeStates[i]==='trap'){
        clearTimeout(holeTimers[i]);holeTimers[i]=null;
        const el=document.getElementById(`char${i}`);el.classList.remove('up');holeStates[i]=null;
      }
    }
    const pts=bonusKills*10*combo;score+=pts;hits+=bonusKills;
    for(let k=0;k<bonusKills;k++)onWaveKill();
    if(bonusKills>0){
      const grid=document.getElementById('grid');
      const p=document.createElement('div');p.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:Creepster,cursive;font-size:36px;color:#ff4400;text-shadow:0 0 20px #ff4400;pointer-events:none;animation:popUp .9s ease-out forwards;z-index:200;';
      p.textContent=`BOOM! +${pts}`;document.body.appendChild(p);setTimeout(()=>p.remove(),1000);
    }
    updateHUD();
  } else if(type==='shield'){
    if(activePowerups.shield){clearTimeout(activePowerups.shield.timerId);}
    activePowerups.shield={expires:Date.now()+pu.duration,timerId:setTimeout(()=>{activePowerups.shield=null;updatePuBar();document.querySelectorAll('.hole').forEach(h=>h.classList.remove('shielded'));},pu.duration)};
    document.querySelectorAll('.hole').forEach(h=>h.classList.add('shielded'));
    updatePuBar();
  }
}

function updatePuBar(){
  const bar=document.getElementById('powerupBar');bar.innerHTML='';
  if(activePowerups.slow){
    const rem=Math.ceil((activePowerups.slow.expires-Date.now())/1000);
    const slot=document.createElement('div');slot.className='powerup-slot slow-active';
    slot.innerHTML=`❄️ SLOW <span class="powerup-timer">${rem}s</span>`;
    bar.appendChild(slot);
  }
  if(activePowerups.shield){
    const rem=Math.ceil((activePowerups.shield.expires-Date.now())/1000);
    const slot=document.createElement('div');slot.className='powerup-slot shield-active';
    slot.innerHTML=`🛡️ SHIELD <span class="powerup-timer">${rem}s</span>`;
    bar.appendChild(slot);
  }
}

let puBarInterval=null;
function startPuBarRefresh(){puBarInterval=setInterval(()=>{if(gameActive)updatePuBar();},500);}
function stopPuBarRefresh(){clearInterval(puBarInterval);puBarInterval=null;}

function showPuBanner(desc,color){
  const b=document.createElement('div');b.className='pu-banner';
  b.innerHTML=`<div class="pu-banner-text ${color}">${desc}</div>`;
  document.body.appendChild(b);setTimeout(()=>b.remove(),2000);
}

function flashOverlay(type){
  const ov=document.createElement('div');ov.className=`overlay-hit ${type}`;
  document.body.appendChild(ov);setTimeout(()=>ov.remove(),400);
}

// GAME LOGIC
function showChar(idx,type){
  if(!gameActive||holeStates[idx])return;
  holeStates[idx]=type;setCharContent(idx,type);
  const el=document.getElementById(`char${idx}`);
  el.classList.remove('up','whacked');void el.offsetWidth;
  requestAnimationFrame(()=>el.classList.add('up'));
  const slowMult=activePowerups.slow?2.0:1.0;
  const showDur=rand(cfg.showMin,cfg.showMax)*slowMult*waveSpeedMult;
  holeTimers[idx]=setTimeout(()=>hideChar(idx,false),showDur);
}

function hideChar(idx,clicked){
  clearTimeout(holeTimers[idx]);holeTimers[idx]=null;
  if(!clicked){const el=document.getElementById(`char${idx}`);el.classList.remove('up');}
  holeStates[idx]=null;
}

function spawnNext(){
  if(!gameActive)return;
  const empty=[];for(let i=0;i<HOLES;i++)if(!holeStates[i])empty.push(i);
  if(empty.length){
    const idx=empty[Math.floor(Math.random()*empty.length)];
    let type='zombie';
    const r=Math.random();
    const puChance=(!puCooldown&&!activePowerups.slow&&!activePowerups.shield)?cfg.puChance:0;
    if(r<puChance){
      const puTypes=['slow','bomb','shield'];
      type='powerup_'+puTypes[Math.floor(Math.random()*puTypes.length)];
      puCooldown=true;setTimeout(()=>puCooldown=false,8000);
    } else if(r<puChance+cfg.trapChance*(1+currentWave*0.05)){
      type='trap';
    }
    showChar(idx,type);
  }
  const spawnDelay=rand(cfg.spawnMin,cfg.spawnMax)*waveSpeedMult;
  const extraSpawns=Math.floor((currentWave-1)/2);
  spawnTimer=setTimeout(()=>{
    spawnNext();
    for(let e=0;e<extraSpawns;e++){
      setTimeout(()=>{if(gameActive){
        const empty2=[];for(let i=0;i<HOLES;i++)if(!holeStates[i])empty2.push(i);
        if(empty2.length){
          const idx2=empty2[Math.floor(Math.random()*empty2.length)];
          showChar(idx2,Math.random()<cfg.trapChance*(1+currentWave*0.05)?'trap':'zombie');
        }
      }},e*180+100);
    }
  },spawnDelay);
}

function onHoleClick(idx){
  if(!gameActive||!holeStates[idx])return;
  const type=holeStates[idx];
  const el=document.getElementById(`char${idx}`);
  const hole=document.querySelector(`.hole[data-idx="${idx}"]`);
  clearTimeout(holeTimers[idx]);holeStates[idx]=null;
  el.classList.remove('up');el.classList.add('whacked');
  setTimeout(()=>el.classList.remove('whacked'),240);
  totalClicks++;

  if(type==='zombie'){
    const prevMult=liveMult;
    combo=Math.min(combo+1,12);maxCombo=Math.max(maxCombo,combo);
    liveMult=getMultFromCombo(combo);

    if(liveMult>prevMult){
      SFX.multUp(liveMult);
      showNotif(`⚡ x${liveMult} MULTIPLIER!`);
    } else if(combo>2){
      SFX.comboUp(combo);
    }

    const pts=10*combo*liveMult;score+=pts;hits++;
    showPop(hole,`+${pts}`,'plus');
    SFX.whack();
    onWaveKill();

    for(let i=0;i<HOLES;i++){
      if(holeStates[i]==='zombie'){
        const ce=document.querySelector(`#char${i} .char-emoji`);
        if(ce){ce.className=`char-emoji ${getZombieSize(liveMult)}`;}
      }
    }
  } else if(type==='trap'){
    if(activePowerups.shield){
      showPop(hole,'🛡 BLOCKED!','powerup');
      SFX.pop();
    } else {
      score=Math.max(0,score-cfg.penalty);combo=1;liveMult=1;trapsHit++;
      if(cfg.penalty>0)showPop(hole,`-${cfg.penalty}`,'minus');
      SFX.trap();flashOverlay('red');
    }
  } else if(type.startsWith('powerup_')){
    const puType=type.replace('powerup_','');
    activatePowerup(puType);
    showPop(hole,POWERUPS[puType].label,'powerup');
  }
  updateHUD();
}

function showPop(hole,txt,cls){const p=document.createElement('div');p.className=`score-pop ${cls}`;p.textContent=txt;hole.appendChild(p);setTimeout(()=>p.remove(),900);}
function showNotif(msg){const n=document.createElement('div');n.className='notif';n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),3100);}
function showLvUpBanner(lv){SFX.levelUp();const b=document.createElement('div');b.className='levelup-banner';b.innerHTML=`<div class="lu-text">⬆ LEVEL UP!</div><div class="lu-sub">LEVEL ${lv} TERCAPAI</div>`;document.body.appendChild(b);setTimeout(()=>b.remove(),2700);}

function updateHUD(){
  const d=getPlayer();
  document.getElementById('scoreDisplay').textContent=score;
  const multClass=getMultClass(liveMult);
  document.getElementById('comboDisplay').className=`hud-value mult-display ${multClass}`;
  document.getElementById('comboDisplay').textContent=`x${combo}`;
  document.getElementById('hitsDisplay').textContent=hits;
  document.getElementById('hudLv').textContent=d.level;
  const td=document.getElementById('timerDisplay');
  td.textContent=timeLeft;
  td.className='hud-value'+(timeLeft<=5?' timer-red':'');
}

function rand(mn,mx){return Math.floor(Math.random()*(mx-mn+1))+mn;}

// GAME FLOW
function startGame(){
  getAudioCtx();
  cfg=DIFF[selectedDiff];
  score=0;hits=0;trapsHit=0;totalClicks=0;combo=1;maxCombo=1;timeLeft=cfg.duration;liveMult=1;
  holeStates=Array(HOLES).fill(null);holeTimers=Array(HOLES).fill(null);
  currentWave=1;waveKillCount=0;waveKillTarget=cfg.waveKills;waveSpeedMult=1.0;
  activePowerups={slow:null,shield:null};puCooldown=false;
  gameActive=true;

  showScreen('game');buildGrid();updateHUD();updateWaveHUD();
  document.getElementById('powerupBar').innerHTML='';
  document.querySelectorAll('.hole').forEach(h=>h.classList.remove('shielded'));

  stopMenuBGM();
  stopBGM();
  if(soundEnabled){setTimeout(()=>{if(gameActive){startBGM();document.getElementById('vuMeter').classList.remove('muted');}},300);}

  startPuBarRefresh();
  spawnNext();
  countdownTimer=setInterval(()=>{
    timeLeft--;
    if(timeLeft<=5&&timeLeft>0)SFX.countdown();
    updateHUD();
    if(timeLeft<=0)endGame();
  },1000);
}

function endGame(){
  gameActive=false;
  clearTimeout(spawnTimer);clearInterval(countdownTimer);stopPuBarRefresh();
  // Clear powerup timers
  if(activePowerups.slow)clearTimeout(activePowerups.slow.timerId);
  if(activePowerups.shield)clearTimeout(activePowerups.shield.timerId);
  for(let i=0;i<HOLES;i++)clearTimeout(holeTimers[i]);
  stopBGM();document.getElementById('vuMeter').classList.add('muted');
  if(soundEnabled){setTimeout(()=>{startMenuBGM();},900);}
  SFX.gameOver();

  recordGame(score,hits,trapsHit,maxCombo,totalClicks,selectedDiff);
  const earnedXP=Math.floor(score*cfg.xpMult*0.3+hits*5+currentWave*20);
  const{newLv,leveled,prevLv}=addXP(earnedXP);

  document.getElementById('finalScore').textContent=score;
  document.getElementById('finalStats').textContent=
    `${hits} zombi • Wave ${currentWave} tercapai • Max combo x${maxCombo} • Max mult x${MULT_VALUES[Math.min(maxCombo,MULT_THRESHOLDS.length)-1]||1} • ${trapsHit} jebakan`;
  document.getElementById('xpGained').textContent=`+${earnedXP} XP diperoleh!`;

  if(leveled){
    setTimeout(()=>{showLvUpBanner(newLv);SKINS.forEach(sk=>{if(sk.unlockLv>prevLv&&sk.unlockLv<=newLv)setTimeout(()=>showNotif(`🎨 Skin "${sk.name}" ${sk.emoji} terbuka!`),1800);});},600);
  }

  renderLB('lbRows',null);
  document.getElementById('playerName').value='';
  document.getElementById('saveScoreBtn').textContent='💾 Simpan';
  document.getElementById('saveScoreBtn').disabled=false;
  showScreen('end');
}

// SCREEN ROUTING
let skinFrom='menu',statFrom='menu';
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='menu'){renderLB('menuLbRows');refreshMenuLevel();}
  if(id==='skinScreen')buildSkinScreen();
  if(id==='statsScreen')renderStats();
}

// EVENTS                    ║
document.body.addEventListener('click',()=>{
  if(!menuBgmStarted&&soundEnabled){
    const active=document.querySelector('.screen.active');
    if(active&&active.id!=='game')startMenuBGM();
  }
},{once:true});

document.getElementById('startBtn').addEventListener('click',startGame);
document.getElementById('restartBtn').addEventListener('click',startGame);
document.getElementById('menuSkinBtn').addEventListener('click',()=>{skinFrom='menu';showScreen('skinScreen');});
document.getElementById('endSkinBtn').addEventListener('click',()=>{skinFrom='end';showScreen('skinScreen');});
document.getElementById('skinBackBtn').addEventListener('click',()=>showScreen(skinFrom));
document.getElementById('menuStatBtn').addEventListener('click',()=>{statFrom='menu';showScreen('statsScreen');});
document.getElementById('endStatBtn').addEventListener('click',()=>{statFrom='end';showScreen('statsScreen');});
document.getElementById('statBackBtn').addEventListener('click',()=>showScreen(statFrom));
document.getElementById('menuBtn').addEventListener('click',()=>{gameActive=false;clearTimeout(spawnTimer);clearInterval(countdownTimer);stopBGM();stopMenuBGM();showScreen('menu');if(soundEnabled)setTimeout(()=>startMenuBGM(),300);});
document.querySelectorAll('.diff-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedDiff=btn.dataset.diff;});});
document.getElementById('saveScoreBtn').addEventListener('click',()=>{const name=document.getElementById('playerName').value;addLBScore(name,score);renderLB('lbRows',score);document.getElementById('saveScoreBtn').textContent='✅ Tersimpan!';document.getElementById('saveScoreBtn').disabled=true;});
document.getElementById('soundToggle').addEventListener('click',toggleSound);
document.getElementById('resetStatsBtn').addEventListener('click',()=>{
  showConfirm('🗑 Reset Stats','Semua statistik akan dihapus permanen. Yakin?','Reset',()=>{
    localStorage.removeItem(STAT_KEY);renderStats();showNotif('📊 Statistik direset!');
  });
});

function showConfirm(title,msg,okLabel,onOk){
  const ov=document.createElement('div');ov.className='modal-overlay';
  ov.innerHTML=`<div class="modal-box"><div class="modal-title">${title}</div><div class="modal-msg">${msg}</div><div class="modal-btns"><button class="modal-btn cancel" id="mc">Batal</button><button class="modal-btn confirm" id="mo">${okLabel}</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#mc').addEventListener('click',()=>ov.remove());
  ov.querySelector('#mo').addEventListener('click',()=>{ov.remove();onOk();});
  ov.addEventListener('click',(e)=>{if(e.target===ov)ov.remove();});
}

// INIT
refreshMenuLevel();
renderLB('menuLbRows');
