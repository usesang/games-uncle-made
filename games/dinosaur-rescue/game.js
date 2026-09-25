(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const ui = {
    overlay: document.getElementById('gameOverlay'),
    kicker: document.getElementById('overlayKicker'),
    title: document.getElementById('overlayTitle'),
    text: document.getElementById('overlayText'),
    hint: document.getElementById('overlayHint'),
    play: document.getElementById('playButton'),
    announcement: document.getElementById('announcement'),
    sound: document.getElementById('soundButton'),
    stage: document.getElementById('stagePill'),
    eggs: document.getElementById('eggCount'),
    eggTotal: document.getElementById('eggTotal'),
    score: document.getElementById('scoreCount'),
    hearts: document.getElementById('heartCount'),
    hero: document.getElementById('heroName')
  };
  const W = 960, H = 540, FLOOR = 466;
  const STAGES = [
    {name:'햇살 초원',world:1850,ground:['#76ad58','#765440'],platforms:[[455,365,175],[1260,355,190]],eggs:[[330,410],[545,319],[1060,410],[1350,309]],rocks:[780],thorns:[],fossils:[220,680,1180,1580],enemies:[['raptor',1030,80,1.4]],chase:false},
    {name:'버섯 숲',world:2250,ground:['#78a16a','#594935'],platforms:[[420,365,175],[850,315,180],[1430,355,190],[1840,320,175]],eggs:[[280,410],[510,319],[940,269],[1180,410],[1520,309],[1920,274]],rocks:[690,1680],thorns:[1270],fossils:[210,740,1100,1600,2020],enemies:[['raptor',1060,95,1.7],['ptero',1630,90,1.25]],chase:false},
    {name:'화산 계곡',world:2550,ground:['#c9804f','#744942'],platforms:[[390,360,180],[800,310,185],[1280,350,170],[1760,310,190],[2160,350,170]],eggs:[[260,410],[480,314],[890,264],[1140,410],[1360,304],[1850,264],[2250,304]],rocks:[670,1590],thorns:[1030,1980],fossils:[210,740,1200,1710,2300],enemies:[['ptero',1120,100,1.6],['raptor',1500,90,1.9],['trike',2080,70,1.15]],chase:false},
    {name:'수정 동굴',world:2850,ground:['#668aa2','#3d526e'],platforms:[[430,360,180],[820,310,180],[1240,350,190],[1630,310,180],[2090,345,185],[2470,305,180]],eggs:[[270,410],[520,314],[910,264],[1330,304],[1715,264],[2180,299],[2550,259],[2680,410]],rocks:[690,1480,2320],thorns:[1080,1900,2630],fossils:[220,770,1200,1780,2230,2740],enemies:[['raptor',970,100,2],['ptero',1580,125,1.8],['trike',2220,85,1.45]],chase:false},
    {name:'달빛 둥지',world:3200,ground:['#648f73','#344b5b'],platforms:[[410,360,180],[810,310,180],[1210,350,180],[1600,305,185],[2030,345,180],[2440,305,190],[2810,350,170]],eggs:[[300,410],[500,314],[900,264],[1290,304],[1685,259],[2110,299],[2525,259],[2890,304],[3030,410]],rocks:[670,1440,2260],thorns:[1060,1870,2700],fossils:[220,760,1190,1760,2190,2580,2990],enemies:[['raptor',980,100,2.2],['ptero',1530,120,2],['trike',2090,100,1.6],['ptero',2570,100,2.2]],chase:true}
  ];
  const sprites = {
    juan:{image:new Image(),crop:{x:127,y:13,w:813,h:1491}},
    sian:{image:new Image(),crop:{x:65,y:34,w:899,h:1502}}
  };
  sprites.juan.image.src='assets/sprites/juan.png';
  sprites.sian.image.src='assets/sprites/sian.png';
  for(const [name,file] of [['juan','juan-actions.png'],['sian','sian-actions.png']]){
    sprites[name].actions=new Image();sprites[name].actions.src='assets/sprites/'+file;
  }
  const enemyAtlas=new Image();enemyAtlas.src='assets/sprites/enemies.png';
  const worldProps=new Image();worldProps.src='assets/sprites/world-props.png';
  const babyDinoActions=new Image();babyDinoActions.src='assets/sprites/baby-dino-actions.png';
  const dadActions=new Image();dadActions.src='assets/sprites/dad-actions.png';
  const dadWalk=new Image();dadWalk.src='assets/sprites/dad-walk-v2.png';
  const groundArt=new Image();groundArt.src='assets/sprites/ground-v2.png';
  const platformArt=new Image();platformArt.src='assets/sprites/platforms-v2.png';
  const backgroundSources=STAGES.map((_,i)=>'assets/backgrounds/'+String(i+1).padStart(2,'0')+'-'+['meadow','mushroom','canyon','cave','moonlight'][i]+'.png');
  const backgrounds=STAGES.map(()=>new Image());
  const backgroundLoaded=new Set();
  function loadBackground(index){if(!backgroundLoaded.has(index)){backgrounds[index].src=backgroundSources[index];backgroundLoaded.add(index)}}
  loadBackground(0);
  const input = {left:false,right:false,jump:false};
  let game, lastTime = 0, audioContext, muted = false, announceTimer;

  function initialGame(stageIndex=0,score=0,rescuedBefore=0,mode='ready') {
    const stage=STAGES[stageIndex];
    return {
      mode,stageIndex,stage,stageStartScore:score,rescuedBefore,
      player:{x:108,y:FLOOR-68,w:39,h:68,vx:0,vy:0,onGround:true,jumps:0,face:1,invincible:0},
      pet:{x:58,y:FLOOR-12},
      camera:0,hero:'juan',eggs:stage.eggs.map(([x,y])=>({x,y,taken:false})),
      platforms:stage.platforms.map(([x,y,w])=>({x,y,w})),
      rocks:stage.rocks.map(x=>({x,broken:false})),
      fossils:stage.fossils.map(x=>({x,taken:false})),
      enemies:stage.enemies.map(([type,base,range,speed],i)=>({type,base,range,speed,phase:i*1.7,x:base,y:FLOOR-60,stunned:0,face:-1})),
      tyranno:-300,tyrannoStunned:0,chaseDelay:5,score,hearts:5,collected:0,t:0,shake:0,dad:null,bonk:null
    };
  }
  game = initialGame();

  function showOverlay(kicker,title,text,button,hint) {
    ui.overlay.classList.remove('intro');
    ui.kicker.textContent=kicker; ui.title.innerHTML=title; ui.text.textContent=text;
    ui.play.textContent=button; ui.hint.textContent=hint || '';
    ui.overlay.inert=false;ui.overlay.removeAttribute('aria-hidden');
    ui.overlay.classList.remove('hidden');
  }
  function hideOverlay(){ui.overlay.classList.add('hidden');ui.overlay.inert=true;ui.overlay.setAttribute('aria-hidden','true')}
  function announce(text){
    ui.announcement.textContent=text; ui.announcement.classList.add('show');
    clearTimeout(announceTimer); announceTimer=setTimeout(()=>ui.announcement.classList.remove('show'),1400);
  }
  function updateHud(){
    ui.eggs.textContent=game.collected; ui.score.textContent=game.score.toLocaleString('ko-KR');
    ui.eggTotal.textContent=game.eggs.length;
    ui.stage.textContent=(game.stageIndex+1)+' / 5 · '+game.stage.name;
    ui.hearts.textContent='♥ '.repeat(game.hearts).trim() || '—';
    ui.hero.textContent=game.hero==='juan'?'주안이':'시안이';
    ui.hero.style.color=game.hero==='juan'?'#248e82':'#326ac1';
  }
  function tone(freq=440,duration=.08,type='sine',volume=.07){
    if(muted) return;
    try{
      audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
      if(audioContext.state==='suspended') audioContext.resume();
      const osc=audioContext.createOscillator(),gain=audioContext.createGain();
      osc.type=type;osc.frequency.setValueAtTime(freq,audioContext.currentTime);
      gain.gain.setValueAtTime(volume,audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);
      osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration);
    }catch{}
  }
  function beginStage(index=0,score=0,rescuedBefore=0){
    loadBackground(index);
    input.left=false;input.right=false;
    game=initialGame(index,score,rescuedBefore,'playing');hideOverlay();updateHud();
    tone(523,.1);setTimeout(()=>tone(784,.15),100);
    announce((index+1)+'단계 · '+game.stage.name);
  }
  function start(){beginStage(0,0,0)}
  function retryStage(){beginStage(game.stageIndex,game.stageStartScore,game.rescuedBefore)}
  function nextStage(){beginStage(game.stageIndex+1,game.score,game.rescuedBefore+game.collected)}
  function clearStage(){
    input.left=false;input.right=false;
    game.score+=game.hearts*100;updateHud();tone(659,.16);setTimeout(()=>tone(880,.22),140);
    if(game.stageIndex===STAGES.length-1){end(true);return}
    loadBackground(game.stageIndex+1);
    game.mode='stageclear';
    showOverlay('스테이지 완료 · '+(game.stageIndex+1)+'/5',game.stage.name+'<br>통과!','공룡알 '+game.collected+'개 구조 · 다음 지역은 '+STAGES[game.stageIndex+1].name+'입니다.','다음 스테이지','하트가 다시 5개로 채워집니다.');
  }
  function end(won){
    input.left=false;input.right=false;
    game.mode=won?'won':'lost';
    if(won)showOverlay('5개 스테이지 완료!','공룡알 구조<br>대성공!','총 '+(game.rescuedBefore+game.collected)+'개의 공룡알 · 최종 점수 '+game.score.toLocaleString('ko-KR')+'점','처음부터 다시','주안이와 시안이가 모든 둥지를 지켰어요!');
    else{tone(220,.22,'triangle');showOverlay('다시 도전!','이번 스테이지를<br>다시 해봐요!','현재 '+(game.stageIndex+1)+'단계 · '+game.stage.name+'에서 공룡알 '+game.collected+'개를 구했어요.','이 스테이지 재도전','시작할 때의 점수와 하트 5개로 돌아갑니다.')}
  }
  function pause(){
    if(game.mode==='playing'){game.mode='paused';showOverlay('잠시 쉬어요','일시정지','준비되면 탐험을 이어가세요.','계속하기','P 키를 눌러도 계속할 수 있어요.')}
    else if(game.mode==='paused'){game.mode='playing';hideOverlay()}
  }
  function switchHero(){
    if(game.mode!=='playing')return;
    game.hero=game.hero==='juan'?'sian':'juan';
    tone(game.hero==='juan'?400:570,.09,'triangle');
    announce(game.hero==='juan'?'주안이! 바위를 부숴요':'시안이! 이중 점프가 가능해요');updateHud();
  }
  function callDad(){
    if(game.mode!=='playing'||game.dad)return;
    const p=game.player;
    const center=p.x+p.w/2;
    const candidates=game.enemies.filter(enemy=>enemy.stunned<=0).map(enemy=>({kind:'enemy',enemy,x:enemy.x}));
    if(game.stage.chase&&game.chaseDelay===0&&game.tyranno>-100&&game.tyrannoStunned<=0)candidates.push({kind:'rex',x:game.tyranno});
    const target=candidates.sort((a,b)=>Math.abs(a.x-center)-Math.abs(b.x-center))[0]||null;
    const targetX=target?.x??p.x+220;
    game.dad={x:Math.max(-110,Math.min(p.x-220,targetX-180)),age:0,walkAge:0,target,bonked:false,exitX:Math.min(game.stage.world+120,Math.max(p.x+W*.85,targetX+310))};
    tone(440,.1,'triangle');announce('아빠가 왔다!');
  }
  function jump(){
    if(game.mode!=='playing')return;
    const p=game.player;
    if(p.onGround || (game.hero==='sian'&&p.jumps<2)){
      p.vy=game.hero==='sian'&&p.jumps===1?-675:-650;
      p.y-=2;p.onGround=false;p.jumps++;
      tone(p.jumps===2?660:520,.08,'square',.025);
    }
  }
  function damage(message){
    const p=game.player;if(p.invincible>0||game.mode!=='playing')return;
    game.hearts--;p.invincible=1.6;p.vy=-360;game.shake=14;game.tyranno=p.x-340;game.chaseDelay=3;
    announce(message);tone(170,.2,'sawtooth',.04);updateHud();
    if(game.hearts<=0)end(false);
  }
  function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function update(dt){
    if(game.mode!=='playing')return;
    game.t+=dt;game.shake=Math.max(0,game.shake-45*dt);
    if(game.bonk){game.bonk.time-=dt;if(game.bonk.time<=0)game.bonk=null}
    const p=game.player,prevY=p.y;
    p.invincible=Math.max(0,p.invincible-dt);
    const direction=Number(input.right)-Number(input.left);
    p.vx=direction*(game.hero==='sian'?300:275);
    if(direction)p.face=direction;
    p.x=Math.max(30,Math.min(game.stage.world-80,p.x+p.vx*dt));
    p.vy=Math.min(880,p.vy+1700*dt);p.y+=p.vy*dt;
    p.onGround=false;
    if(p.y+p.h>=FLOOR){p.y=FLOOR-p.h;p.vy=0;p.onGround=true;p.jumps=0}
    if(p.vy>=0){
      for(const plat of game.platforms){
        if(p.x+p.w>plat.x+8&&p.x<plat.x+plat.w-8&&prevY+p.h<=plat.y+12&&p.y+p.h>=plat.y){
          p.y=plat.y-p.h;p.vy=0;p.onGround=true;p.jumps=0;break;
        }
      }
    }
    const petTargetX=p.face>0?p.x-45:p.x+p.w+45;
    const petTargetY=p.y+p.h-12;
    game.pet.x+=(petTargetX-game.pet.x)*Math.min(1,dt*9);
    game.pet.y+=(petTargetY-game.pet.y)*Math.min(1,dt*11);
    for(const egg of game.eggs){
      if(!egg.taken&&Math.abs(p.x+p.w/2-egg.x)<31&&Math.abs(p.y+p.h/2-egg.y)<52){
        egg.taken=true;game.collected++;game.score+=100;updateHud();
        tone(740,.12);setTimeout(()=>tone(1030,.13),80);announce('공룡알 구조! +100');
      }
    }
    for(const fossil of game.fossils){
      if(!fossil.taken&&Math.abs(p.x+p.w/2-fossil.x)<29&&p.y+p.h>385){
        fossil.taken=true;game.score+=25;updateHud();tone(870,.065,'triangle',.04);
      }
    }
    for(const rock of game.rocks){
      if(rock.broken)continue;
      const box={x:rock.x,y:FLOOR-47,w:48,h:47};
      if(overlaps(p,box)){
        if(game.hero==='juan'&&Math.abs(p.vx)>0){rock.broken=true;game.score+=40;game.shake=5;updateHud();announce('주안이가 바위를 부쉈어요! +40');tone(120,.13,'square',.04)}
        else {p.x=p.face===1?box.x-p.w:box.x+box.w;p.vx=0;if(game.hero==='sian')announce('주안이로 교대해 바위를 부숴요!')}
      }
    }
    for(const x of game.stage.thorns){if(overlaps(p,{x,y:FLOOR-25,w:56,h:25}))damage('가시에 닿았어요!')}
    for(const enemy of game.enemies){
      enemy.stunned=Math.max(0,enemy.stunned-dt);
      if(enemy.stunned>0)continue;
      const phase=game.t*enemy.speed+enemy.phase;
      enemy.x=enemy.base+Math.sin(phase)*enemy.range;
      enemy.face=Math.cos(phase)>0?1:-1;
      enemy.y=enemy.type==='ptero'?250+Math.sin(phase*1.4)*35:FLOOR-(enemy.type==='trike'?77:70);
      const box=enemy.type==='ptero'?{x:enemy.x-43,y:enemy.y-33,w:86,h:62}:enemy.type==='trike'?{x:enemy.x-53,y:FLOOR-74,w:106,h:74}:{x:enemy.x-33,y:FLOOR-67,w:66,h:67};
      if(overlaps(p,box)){
        if(p.vy>120&&prevY+p.h<=box.y+20){enemy.stunned=3;p.vy=-480;game.score+=50;updateHud();announce('공룡을 뛰어넘었어요! +50');tone(610,.1)}
        else damage(enemy.type==='ptero'?'익룡을 조심해요!':enemy.type==='trike'?'트리케라톱스를 피하세요!':'랩터를 피하세요!');
      }
    }
    if(game.dad){
      const dad=game.dad;
      dad.age+=dt;dad.x+=(game.hero==='sian'?300:275)*dt;
      const targetX=dad.target?.kind==='rex'?game.tyranno:dad.target?.enemy.x;
      if(dad.target&&!dad.bonked&&dad.x>=targetX-48){
        if(dad.target.kind==='rex')game.tyrannoStunned=5;
        else dad.target.enemy.stunned=5;
        dad.bonked=true;dad.walkAge=0;
        game.bonk={x:targetX,y:dad.target.enemy?.type==='ptero'?dad.target.enemy.y-20:FLOOR-108,time:.5};
        game.score+=75;game.shake=7;updateHud();tone(190,.09,'square',.045);
        setTimeout(()=>tone(610,.15,'triangle'),65);
      }
      if(dad.bonked)dad.walkAge+=dt;
      if(dad.x>dad.exitX)game.dad=null;
    }
    if(game.stage.chase){
      game.chaseDelay=Math.max(0,game.chaseDelay-dt);
      game.tyrannoStunned=Math.max(0,game.tyrannoStunned-dt);
      if(game.chaseDelay===0&&game.tyrannoStunned===0){
        const catchUp=Math.max(0,(p.x-game.tyranno-270)*.2);
        game.tyranno+=Math.min(225,150+catchUp)*dt;
        if(game.tyranno+90>p.x&&p.y+p.h>FLOOR-72&&p.invincible<=0)damage('티라노가 따라잡았어요!');
      }
    }
    if(game.mode!=='playing')return;
    if(p.x>game.stage.world-215){
      if(game.collected===game.eggs.length)clearStage();
      else if(game.t%2<dt)announce('남은 공룡알을 모두 구해 주세요!');
    }
    game.camera=Math.max(0,Math.min(game.stage.world-W,p.x-270));
  }

  function rounded(x,y,w,h,r,fill,stroke,line=1){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}
  }
  function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
  function line(points,color,width=2){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke()}
  function polygon(points,fill){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill()}
  function cloud(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(0,0,38,15,'#ffffffb8');ellipse(-20,-6,20,17,'#ffffffb8');ellipse(9,-10,27,20,'#ffffffb8');ctx.restore()}
  function tree(x,scale,layer){
    ctx.save();ctx.translate(x,FLOOR);ctx.scale(scale,scale);
    rounded(-7,-172,14,177,7,layer?'#6daaa4':'#599884');
    for(const [ox,oy,r] of [[-33,-169,36],[7,-184,46],[40,-158,34],[-5,-218,32]])ellipse(ox,oy,r,r*.77,layer?'#95cfc0':'#55aa83');
    if(!layer){ellipse(-15,-195,6,5,'#c7e2a5');ellipse(30,-175,6,5,'#c7e2a5')}
    ctx.restore();
  }
  function background(camera){
    const image=backgrounds[game.stageIndex];
    if(image.complete&&image.naturalWidth){
      const pan=camera/Math.max(1,game.stage.world-W);
      ctx.drawImage(image,-pan*250,-82,1210,681);
    }else{
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#8fd5e4');sky.addColorStop(1,'#396b76');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      for(let i=0;i<8;i++)tree(i*190-(camera*.2%190),.8,true);
    }
    if(groundArt.complete&&groundArt.naturalWidth){
      const row=game.stageIndex===2?1:game.stageIndex===3?2:0;
      const sy=[128,430,714][row],sh=[302,284,310][row],top=[FLOOR-25,FLOOR-15,FLOOR-5][row];
      const tileW=960,tileH=H-top+7,first=Math.floor(camera/tileW);
      for(let tile=first;tile<=first+1;tile++){
        const screenX=tile*tileW-camera;
        ctx.save();
        if(tile%2){ctx.translate(screenX+tileW,0);ctx.scale(-1,1)}
        else ctx.translate(screenX,0);
        ctx.drawImage(groundArt,0,sy,groundArt.width,sh,0,top,tileW,tileH);
        ctx.restore();
      }
    }else{
      ctx.fillStyle=game.stage.ground[1];ctx.fillRect(0,FLOOR,W,H-FLOOR);
      ctx.fillStyle=game.stage.ground[0];ctx.fillRect(0,FLOOR-5,W,11);
    }
    if(game.stageIndex===3||game.stageIndex===4){
      for(let i=0;i<12;i++){
        const x=(i*101-camera*.14+W*5)%W,y=95+(i*47)%290;
        ellipse(x,y,2+(i%2),2+(i%2),game.stageIndex===3?'#a6f9ff99':'#ffe89699');
      }
    }
  }
  const propCrops=[
    {x:97,y:31,w:303,h:481},{x:49,y:75,w:411,h:437},{x:7,y:36,w:469,h:476},
    {x:43,y:50,w:423,h:428},{x:1,y:17,w:511,h:495},{x:0,y:150,w:496,h:336}
  ];
  function propSprite(index,x,y,w,h){
    if(!worldProps.complete||!worldProps.naturalWidth)return false;
    const crop=propCrops[index],cellW=worldProps.width/3,cellH=worldProps.height/2;
    ctx.drawImage(worldProps,(index%3)*cellW+crop.x,Math.floor(index/3)*cellH+crop.y,crop.w,crop.h,x,y,w,h);
    return true;
  }
  function platform(p){
    const x=p.x-game.camera;if(x<-p.w||x>W)return;
    if(platformArt.complete&&platformArt.naturalWidth){
      const cellW=platformArt.width/3,cellH=platformArt.height/2;
      const cell=[5,4,1,2,3][game.stageIndex],col=cell%3,row=Math.floor(cell/3);
      ctx.drawImage(platformArt,col*cellW, row*cellH+145,cellW,270,x-13,p.y-13,p.w+26,53);
      return;
    }
    const rock=game.stageIndex===3?'#566589':game.stageIndex===2?'#9b5e46':'#806346';
    const top=game.stageIndex===3?'#8ecbd7':game.stageIndex===2?'#e6a05f':'#77b569';
    rounded(x,p.y,p.w,24,8,rock,'#304b53',2);rounded(x-5,p.y-9,p.w+10,15,7,top,'#315e5a',2);
    for(let i=0;i<p.w/29;i++){
      ellipse(x+15+i*29,p.y+13,6,2,'#ffffff42');
      if(i%2===0)line([[x+i*29+8,p.y+20],[x+i*29+6,p.y+29]],'#304b5366',2);
    }
  }
  function egg(x,y,bob=0){
    if(propSprite(0,x-20,y-27+bob,40,54))return;
    ctx.save();ctx.translate(x,y+bob);ellipse(0,22,18,5,'#244b4660');
    ellipse(0,0,18,25,'#fff0bf');ellipse(-6,-8,4,6,'#85c2aa');ellipse(8,1,5,7,'#85c2aa');ellipse(-1,12,3,4,'#85c2aa');
    ctx.strokeStyle='#a58260';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,18,25,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  function fossil(x){
    if(propSprite(1,x-15,FLOOR-36+Math.sin(game.t*4+x)*2,30,30))return;
    ctx.save();ctx.translate(x,FLOOR-20);ellipse(0,0,13,13,'#e9b366');ellipse(0,0,9,9,'#fae4aa');
    ctx.beginPath();ctx.arc(0,0,5,-1.4,4.1);ctx.strokeStyle='#9d7659';ctx.lineWidth=3;ctx.stroke();ctx.restore();
  }
  function rock(x){
    if(propSprite(2,x-3,FLOOR-53,54,53))return;
    polygon([[x,FLOOR],[x+4,FLOOR-29],[x+15,FLOOR-47],[x+39,FLOOR-42],[x+49,FLOOR-13],[x+46,FLOOR]],'#767b73');
    line([[x+4,FLOOR-29],[x+15,FLOOR-47],[x+39,FLOOR-42]],'#c5c6a9',3);
    line([[x+21,FLOOR-8],[x+27,FLOOR-22],[x+23,FLOOR-29]],'#495c5d',3);
  }
  function thorns(x){
    if(propSprite(3,x-3,FLOOR-44,62,44))return;
    for(let i=0;i<4;i++)polygon([[x+i*14,FLOOR],[x+7+i*14,FLOOR-25-(i%2)*6],[x+16+i*14,FLOOR]],'#61736b');
  }
  function nest(x){
    if(propSprite(4,x-63,FLOOR-77,126,77))return;
    ctx.save();ctx.translate(x,FLOOR);ellipse(0,-9,71,24,'#8f613b');ellipse(0,-15,57,17,'#c39356');
    for(let i=0;i<9;i++)line([[-55+i*13,-17],[-42+i*13,-31]],'#735738',4);
    ellipse(0,-25,20,23,'#f8e4b8');ellipse(-9,-32,5,7,'#87c4a0');ellipse(9,-20,5,7,'#87c4a0');ctx.restore();
  }
  function dinosaur(x,y,scale=1){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ellipse(0,2,64,12,'#1b635f33');
    polygon([[-31,-55],[-120,-32],[-81,-18],[-19,-23]],'#4d9d70');
    ellipse(-13,-68,65,48,'#58ab78');ellipse(11,-68,35,28,'#75bd87');
    line([[-35,-36],[-39,0]],'#3b795f',15);line([[4,-34],[10,0]],'#3b795f',15);
    ellipse(-41,0,22,8,'#3b795f');ellipse(9,0,23,8,'#3b795f');
    line([[29,-75],[66,-55]],'#3e8969',12);
    ellipse(43,-126,43,43,'#58ab78');ellipse(70,-108,36,20,'#58ab78');
    ellipse(60,-131,8,9,'#fff');ellipse(62,-131,4,5,'#193d43');ellipse(82,-110,4,3,'#2d6f61');
    line([[60,-95],[92,-97]],'#265e56',3);
    for(let i=0;i<4;i++)polygon([[8+i*12,-163],[14+i*12,-180],[20+i*12,-161]],'#35876e');
    ctx.restore();
  }
  function drawEnemy(enemy){
    const x=enemy.x-game.camera;
    if(x<-190||x>W+190)return;
    const species={ptero:{col:0,w:150,h:135},raptor:{col:1,w:116,h:115},trike:{col:2,w:145,h:125},rex:{col:3,w:190,h:160}}[enemy.type];
    if(!species)return;
    const stunned=enemy.stunned>0;
    const row=stunned?0:Math.floor(game.t*(enemy.type==='ptero'?7:6)+enemy.phase)%2;
    const bottom=enemy.type==='ptero'&&!stunned?enemy.y+species.h/2:FLOOR+4;
    ctx.save();ctx.translate(x,bottom);ctx.scale(enemy.face>0?-1:1,1);
    if(stunned){ctx.translate(0,0);ctx.rotate(-.12);ctx.scale(1.08,.67)}
    if(enemyAtlas.complete&&enemyAtlas.naturalWidth){
      const cellW=enemyAtlas.width/4,cellH=enemyAtlas.height/2;
      ctx.drawImage(enemyAtlas,species.col*cellW,row*cellH,cellW,cellH,-species.w/2,-species.h,species.w,species.h);
    }else if(enemy.type==='rex')dinosaur(0,0,1);
    else{ellipse(0,-species.h/2,species.w*.35,species.h*.35,enemy.type==='ptero'?'#53b4a9':enemy.type==='trike'?'#547fbd':'#db915e')}
    ctx.restore();
    if(stunned){
      const starY=bottom-species.h*.72;
      for(let i=0;i<3;i++){
        const a=game.t*3+i*Math.PI*2/3;
        const sx=x+Math.cos(a)*26,sy=starY+Math.sin(a)*9;
        ctx.save();ctx.translate(sx,sy);ctx.rotate(a);ctx.fillStyle='#ffe075';
        polygon([[0,-8],[2,-2],[8,0],[2,2],[0,8],[-2,2],[-8,0],[-2,-2]],'#ffe075');ctx.restore();
      }
    }
  }
  function childFallback(x,y,type,face=1,run=0,inv=0){
    if(inv>0&&Math.floor(inv*12)%2===0)return;
    const juan=type==='juan',jacket=juan?'#248f82':'#356fc4',dark=juan?'#17665f':'#254d9a';
    ctx.save();ctx.translate(x,y);if(face<0)ctx.scale(-1,1);
    ellipse(19,69,25,6,'#1a605443');
    const leg=Math.sin(run)*9;
    line([[11,49],[7-leg,66]],'#344a48',11);line([[27,49],[31+leg,66]],'#344a48',11);
    ellipse(5-leg,66,11,5,juan?'#5a4237':'#fff');ellipse(31+leg,66,11,5,juan?'#5a4237':'#fff');
    rounded(3,19,31,36,8,juan?'#e2c08d':'#526c54','#31565a',2);
    rounded(2,2,34,37,8,juan?'#f9f4df':'#f8f4e9','#31565a',2);
    rounded(1,7,10,30,3,jacket);rounded(26,7,10,30,3,jacket);
    line([[1,15],[-7+Math.sin(run)*5,35]],'#f1bd97',9);line([[35,15],[43-Math.sin(run)*5,34]],'#f1bd97',9);
    ellipse(-8+Math.sin(run)*5,35,5,5,'#f1bd97');ellipse(43-Math.sin(run)*5,34,5,5,'#f1bd97');
    polygon([[13,4],[27,4],[20,19]],juan?'#e88645':'#efc64a');
    ellipse(19,-20,27,28,'#f3c59f');ellipse(-6,-18,5,8,'#e9b58f');ellipse(44,-18,5,8,'#e9b58f');
    ellipse(19,-37,28,16,'#292727');rounded(-7,-40,52,12,5,'#292727');
    for(let i=0;i<5;i++)polygon([[i*10-5,-35],[i*10+3,-26],[i*10+8,-35]],'#292727');
    ellipse(10,-19,3,4,'#252d31');ellipse(29,-19,3,4,'#252d31');
    line([[14,-6],[19,-4],[24,-6]],'#a65d5c',2);
    if(!juan){line([[8,-11],[13,-10]],'#b98175',1.5);line([[27,-10],[32,-11]],'#b98175',1.5)}
    ctx.restore();
  }
  function child(x,y,type,face=1,run=0,inv=0,airborne=false){
    if(inv>0&&Math.floor(inv*12)%2===0)return;
    const sprite=sprites[type];
    if(!sprite.image.complete||!sprite.image.naturalWidth){childFallback(x,y,type,face,run,inv);return}
    const {image,crop,actions}=sprite;
    const height=132,width=height*crop.w/crop.h;
    const bounce=run?Math.abs(Math.sin(run))*2:0;
    ctx.save();
    ctx.translate(x+19,y+66);
    ctx.scale(face<0?-1:1,1);
    if(actions.complete&&actions.naturalWidth&&(run||airborne)){
      const step=Math.floor(run*.55)%4;
      const frame=airborne?(game.player.vy<0?4:5):[0,1,2,3][step];
      const cw=actions.width/3,ch=actions.height/2;
      const aw=136,ah=132;
      ctx.drawImage(actions,(frame%3)*cw,Math.floor(frame/3)*ch,cw,ch,-aw/2,-ah-bounce,aw,ah);
    }else{
      ctx.rotate(airborne?-.07:0);
      ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,-width/2,-height-bounce,width,height);
    }
    ctx.restore();
  }
  function companion(x,y,frame=0,face=1){
    if(babyDinoActions.complete&&babyDinoActions.naturalWidth){
      const cellW=babyDinoActions.width/2,cellH=babyDinoActions.height/2;
      ctx.save();ctx.translate(x,y);ctx.scale(face<0?-1:1,1);
      ctx.drawImage(babyDinoActions,(frame%2)*cellW,Math.floor(frame/2)*cellH,cellW,cellH,-39,-71,78,71);
      ctx.restore();return;
    }
    ctx.save();ctx.translate(x,y);ellipse(0,4,15,5,'#1a605433');
    polygon([[-10,-10],[-25,-1],[-8,0]],'#58b993');ellipse(1,-15,18,16,'#8bd4ac');
    ellipse(15,-25,15,15,'#8bd4ac');ellipse(22,-27,3,4,'#203b3e');ellipse(24,-17,3,2,'#d27d7b');
    for(let i=0;i<3;i++)polygon([[-9+i*9,-29],[-5+i*9,-39],[-1+i*9,-29]],'#53b392');ctx.restore();
  }
  function drawDad(){
    if(!game.dad)return;
    const dad=game.dad,x=dad.x-game.camera;
    if(x<-170||x>W+170)return;
    const hop=dad.bonked?0:Math.abs(Math.sin(dad.age*7.5))*49;
    const hit=dad.bonked&&game.bonk?.time>0;
    const frame=hit?3:hop>24?2:Math.floor(dad.age*8)%2;
    const w=176,h=180,bottom=FLOOR+3-hop;
    ellipse(x,bottom+hop+1,43,8,'#173d4340');
    if(dad.bonked&&!hit&&dadWalk.complete&&dadWalk.naturalWidth){
      const cw=dadWalk.width/2,ch=dadWalk.height;
      const walkFrame=Math.floor(dad.walkAge*5)%2;
      ctx.drawImage(dadWalk,walkFrame*cw,0,cw,ch,x-w/2,bottom-h,w,h);
    }else if(dadActions.complete&&dadActions.naturalWidth){
      const cw=dadActions.width/2,ch=dadActions.height/2;
      ctx.drawImage(dadActions,(frame%2)*cw,Math.floor(frame/2)*ch,cw,ch,x-w/2,bottom-h,w,h);
    }else{
      rounded(x-26,bottom-h+18,52,h-18,16,'#d89a45','#613e28',3);
      ellipse(x,bottom-h+20,22,27,'#efc09d');
    }
    if(dad.age<4.5){
      const bubbleY=Math.max(18,bottom-h-36);
      rounded(x-64,bubbleY,128,31,15,'#fffdf0','#3e6661',2);
      polygon([[x-8,bubbleY+29],[x+5,bubbleY+29],[x-2,bubbleY+37]],'#fffdf0');
      ctx.fillStyle='#173d43';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='bold 15px "Malgun Gothic",sans-serif';ctx.fillText('아빠가 왔다!',x,bubbleY+16);
    }
  }
  function drawBonk(){
    if(!game.bonk)return;
    const {x,y,time}=game.bonk,sx=x-game.camera;
    ctx.save();ctx.translate(sx,y);ctx.rotate((.5-time)*2);ctx.globalAlpha=Math.min(1,time*3);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;line([[Math.cos(a)*15,Math.sin(a)*15],[Math.cos(a)*35,Math.sin(a)*35]],'#ffe075',5)}
    ctx.restore();
  }
  function draw(){
    ctx.save();ctx.clearRect(0,0,W,H);
    if(game.shake)ctx.translate((Math.random()-.5)*game.shake,(Math.random()-.5)*game.shake);
    background(game.camera);
    for(const p of game.platforms)platform(p);
    for(const egg of game.eggs)if(!egg.taken&&egg.x-game.camera>-30&&egg.x-game.camera<W+30)eggDraw(egg);
    for(const f of game.fossils)if(!f.taken&&f.x-game.camera>-20&&f.x-game.camera<W+20)fossil(f.x-game.camera);
    for(const r of game.rocks)if(!r.broken&&r.x-game.camera>-50&&r.x-game.camera<W+50)rock(r.x-game.camera);
    for(const x of game.stage.thorns)if(x-game.camera>-70&&x-game.camera<W+70)thorns(x-game.camera);
    if(game.stage.world-115-game.camera<W+100)nest(game.stage.world-115-game.camera);
    for(const enemy of game.enemies)drawEnemy(enemy);
    if(game.stage.chase)drawEnemy({type:'rex',x:game.tyranno,y:FLOOR,face:1,phase:0,stunned:game.tyrannoStunned});
    drawBonk();drawDad();
    const p=game.player,run=p.onGround&&Math.abs(p.vx)>0?game.t*14:0;
    child(p.x-game.camera,p.y+3,game.hero,p.face,run,p.invincible,!p.onGround);
    const petFrame=!p.onGround?(p.vy<0?2:3):Math.abs(p.vx)>10?(Math.floor(game.t*8)%2):0;
    companion(game.pet.x-game.camera,game.pet.y+Math.sin(game.t*7)*1.5,petFrame,p.face);
    if(game.mode==='ready'){
      child(740,FLOOR-66,'juan',1,0,0);child(825,FLOOR-66,'sian',-1,0,0);companion(796,FLOOR-12);
    }
    ctx.restore();
  }
  function eggDraw(e){egg(e.x-game.camera,e.y,Math.sin(game.t*4+e.x)*3)}
  function frame(now){
    const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;
    update(dt);draw();requestAnimationFrame(frame);
  }
  async function requestMobileLandscape(){
    if(!window.matchMedia?.('(pointer: coarse), (max-width: 760px)').matches)return;
    try{
      if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
        await document.documentElement.requestFullscreen({navigationUI:'hide'});
      }
    }catch{/* Some mobile browsers only allow fullscreen from a Home Screen web app. */}
    try{await window.screen?.orientation?.lock?.('landscape')}
    catch{/* CSS keeps the game in landscape when the browser refuses orientation lock. */}
  }
  ui.play.addEventListener('click',()=>{
    void requestMobileLandscape();
    if(game.mode==='paused')pause();
    else if(game.mode==='stageclear')nextStage();
    else if(game.mode==='lost')retryStage();
    else start();
  });
  ui.sound.addEventListener('click',()=>{muted=!muted;ui.sound.textContent=muted?'🔇':'🔊';ui.sound.setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');ui.sound.title=muted?'소리 켜기':'소리 끄기'});
  document.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(e.code))e.preventDefault();
    if(e.repeat&&['KeyC','KeyP','KeyV'].includes(e.code))return;
    if(e.code==='ArrowLeft'||e.code==='KeyA')input.left=true;
    if(e.code==='ArrowRight'||e.code==='KeyD')input.right=true;
    if((e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')&&!e.repeat)jump();
    if(e.code==='KeyC')switchHero();
    if(e.code==='KeyV')callDad();
    if(e.code==='KeyP')pause();
    if(e.code==='Enter'&&game.mode==='ready')start();
    else if(e.code==='Enter'&&game.mode==='won')start();
    else if(e.code==='Enter'&&game.mode==='lost')retryStage();
    else if(e.code==='Enter'&&game.mode==='stageclear')nextStage();
  });
  document.addEventListener('keyup',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')input.left=false;if(e.code==='ArrowRight'||e.code==='KeyD')input.right=false});
  window.addEventListener('blur',()=>{input.left=false;input.right=false;if(game.mode==='playing')pause()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.mode==='playing')pause()});
  for(const button of document.querySelectorAll('[data-control]')){
    const control=button.dataset.control;
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);button.classList.add('pressed');if(control==='left'||control==='right')input[control]=true;else if(control==='jump')jump();else if(control==='dad')callDad();else switchHero()});
    const release=()=>{button.classList.remove('pressed');if(control==='left'||control==='right')input[control]=false};
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  }
  updateHud();requestAnimationFrame(frame);
})();
