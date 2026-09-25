const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8')
  .replace('  game = initialGame();', '  game = initialGame(); muted = true; globalThis.testGame = {get:()=>game, getInput:()=>input, update, nextStage, beginStage, callDad};');

function element() {
  return {textContent:'',innerHTML:'',style:{},classList:{add(){},remove(){}},addEventListener(){},setAttribute(){},removeAttribute(){}};
}
const nodes = new Map();
const gameSurfaceEvents = new Map();
const gameSurface = element();
gameSurface.addEventListener = (name, listener, options) => gameSurfaceEvents.set(name, {listener, options});
function control(name) {
  const button = element();
  button.dataset = {control:name};
  button.events = new Map();
  button.addEventListener = (event, listener) => button.events.set(event, listener);
  button.setPointerCapture = () => {};
  return button;
}
const leftControl = control('left');
const jumpControl = control('jump');
const document = {
  getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, id === 'game' ? {getContext(){return {}}} : element());
    return nodes.get(id);
  },
  querySelector(selector){return selector === '.shell' ? gameSurface : null},
  querySelectorAll(selector){return selector === '[data-control]' ? [leftControl,jumpControl] : []},
  addEventListener(){}
};
class Image { set src(value){this._src=value;this.complete=false;this.naturalWidth=0} }
const sandbox = {document,window:{addEventListener(){}},Image,setTimeout(){},clearTimeout(){},requestAnimationFrame(){},console};
vm.runInNewContext(source,sandbox,{filename:'game.js'});
for (const name of ['touchstart','touchmove','gesturestart','gesturechange']) {
  assert.equal(gameSurfaceEvents.get(name)?.options?.passive, false, `${name} must be cancelable`);
}
let prevented = false;
gameSurfaceEvents.get('touchstart').listener({touches:[{},{}],preventDefault(){prevented=true}});
assert.equal(prevented, true, 'a second finger must not trigger browser zoom');
prevented = false;
gameSurfaceEvents.get('touchstart').listener({touches:[{}],preventDefault(){prevented=true}});
assert.equal(prevented, false, 'a single-finger button press must remain usable');
gameSurfaceEvents.get('gesturestart').listener({preventDefault(){prevented=true}});
assert.equal(prevented, true, 'Safari pinch gestures must be canceled');

const firstStage=sandbox.testGame.get();
assert.equal(firstStage.hearts,5);
firstStage.mode='playing';
firstStage.player.onGround=true;
leftControl.events.get('pointerdown')({preventDefault(){},pointerId:1});
jumpControl.events.get('pointerdown')({preventDefault(){},pointerId:2});
assert.equal(sandbox.testGame.getInput().left,true,'move stays pressed during jump');
assert.ok(firstStage.player.vy<0,'jump works with move held');
leftControl.events.get('pointerup')();
assert.equal(sandbox.testGame.getInput().left,false,'move releases normally');
const petStartY=firstStage.pet.y;
const petStartX=firstStage.pet.x;
firstStage.player.x+=80;
firstStage.player.onGround=false;
firstStage.player.vy=-650;
sandbox.testGame.update(.05);
assert.ok(firstStage.pet.y<petStartY,'companion follows an upward jump');
assert.ok(firstStage.pet.x>petStartX,'companion follows horizontal movement');
firstStage.player.y=466-firstStage.player.h;
firstStage.player.vy=0;
firstStage.player.onGround=true;
const firstEnemy=firstStage.enemies[0];
sandbox.testGame.callDad();
assert.ok(firstStage.dad,'V summons Dad');
const dadStartX=firstStage.dad.x;
sandbox.testGame.update(.033);
assert.ok(Math.abs(firstStage.dad.x-dadStartX-275*.033)<.001,'Dad matches Juan movement speed');
for(let i=0;i<125&&firstEnemy.stunned===0;i++)sandbox.testGame.update(.033);
assert.ok(firstEnemy.stunned>4.9,'Dad bonks the first dinosaur to the right for five seconds');
assert.ok(firstStage.bonk,'bonk effect appears');
sandbox.testGame.update(.033);
assert.ok(firstStage.dad.bonked&&firstStage.dad.walkAge>0,'Dad walks after bonking');
for(let i=0;i<120;i++)sandbox.testGame.update(.033);
assert.ok(firstEnemy.stunned>0,'dinosaur remains stunned before five seconds');
for(let i=0;i<35;i++)sandbox.testGame.update(.033);
assert.equal(firstEnemy.stunned,0,'dinosaur recovers after five seconds');

for (let stageIndex=0;stageIndex<5;stageIndex++) {
  const game=sandbox.testGame.get();
  assert.equal(game.stageIndex,stageIndex);
  assert.equal(game.hearts,5);
  game.mode='playing';
  game.eggs.forEach(egg=>egg.taken=true);
  game.collected=game.eggs.length;
  game.player.x=game.stage.world-190;
  sandbox.testGame.update(.016);
  assert.equal(game.mode,stageIndex===4?'won':'stageclear',`stage ${stageIndex+1} completion`);
  if(stageIndex<4)sandbox.testGame.nextStage();
}
sandbox.testGame.beginStage(1);
const leftTargetGame=sandbox.testGame.get();
leftTargetGame.player.x=1300;
leftTargetGame.player.invincible=10;
const leftEnemy=leftTargetGame.enemies[0];
sandbox.testGame.callDad();
assert.equal(leftTargetGame.dad.target.enemy,leftEnemy,'Dad chooses the closest dinosaur on the left');
assert.ok(leftTargetGame.dad.x<leftEnemy.x,'Dad enters to the left of the selected dinosaur');
for(let i=0;i<100&&leftEnemy.stunned===0;i++)sandbox.testGame.update(.033);
assert.ok(leftEnemy.stunned>0,'Dad can bonk a dinosaur left of the player');

sandbox.testGame.beginStage(4);
const rexGame=sandbox.testGame.get();
rexGame.player.x=1200;
rexGame.player.invincible=10;
rexGame.chaseDelay=0;
rexGame.tyranno=1000;
sandbox.testGame.callDad();
assert.equal(rexGame.dad.target.kind,'rex','active T-rex can be the nearest target');
for(let i=0;i<160&&rexGame.tyrannoStunned===0;i++)sandbox.testGame.update(.033);
assert.ok(rexGame.tyrannoStunned>0,'Dad can stun T-rex for five seconds');
console.log('Multitouch controls, 5 stage transitions, and Dad target selection passed.');
