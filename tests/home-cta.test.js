import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as engine from '../engine.js';

// Executes the actual app and its registered handlers with a minimal DOM/store adapter.
// This tests routing/rendered markup, not browser layout, focus, or IndexedDB behavior.
async function startMount(saved,{deferInit=false,persistent=true,allowReset=false}={}){
 const nodes=new Map();
 const node=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,focus(){},open:false,close(){this.open=false;},showModal(){this.open=true;}});
  return nodes.get(selector);
 };
 const document={querySelector:node,querySelectorAll:()=>[],addEventListener(){}};
 const window={localStorage:{},scrollTo(){},addEventListener(){}};
 const snapshot={data:structuredClone(saved),generation:'test',revision:1};
 let releaseInit;
 const pending=deferInit ? new Promise(resolve=>{releaseInit=resolve;}) : Promise.resolve();
 let current=snapshot;
 const writes=[];
 const storage={createStore:()=>({persistent,init:async()=>{await pending;return current;},read:async()=>current,apply:async(action,expected)=>{
  writes.push({action,expected});
  if(!allowReset || action.type!=='reset')throw Error('Navigation must not write a save');
  current={data:engine.fresh(),generation:'after-reset',revision:current.revision+1};
  return current;
 }})};
 const source=(await readFile(new URL('../app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const ready=new AsyncFunction('document','window','engine','storage',
  "const {jobs,endings,fresh,completed,balanced,correctCode}=engine;const {createStore}=storage;\n"+source)(document,window,engine,storage);
 return {node,html:()=>node('#main').innerHTML,ready,releaseInit,writes,snapshot};
}
async function mount(saved){
 const app=await startMount(saved);
 await app.ready;
 return app;
}
const solved={umbrella:'keep',lift:'return',moon:'keep'};
for(const ending of ['garden','sea','window']){
 test('saved '+ending+' ending opens directly after a fresh app mount',async()=>{
  const app=await mount({version:1,solved,ending});
  assert.match(app.html(),/id="start">重读你的结局/);
  app.node('#start').onclick();
  assert.match(app.html(),/story ending/);
  assert.ok(app.html().includes(engine.endings[ending].title));
  assert.doesNotMatch(app.html(),/id="code-form"/);
 });
}
test('three clues without ending still requires the password',async()=>{
 const app=await mount({version:1,solved,ending:null});
 app.node('#start').onclick();assert.match(app.html(),/id="code-form"/);
 app.node('#code').value='错误';app.node('#code-form').onsubmit({preventDefault(){}});
 assert.match(app.node('#code-error').textContent,/再看看/);
});
test('zero to two clues still opens the next unfinished quest',async()=>{
 for(let n=0;n<3;n++){
  const progress=Object.fromEntries(Object.entries(solved).slice(0,n));
  const app=await mount({version:1,solved:progress,ending:null});
  app.node('#start').onclick();
  assert.ok(app.html().includes(engine.jobs[n].title));
  assert.match(app.html(),/data-choice=/);
 }
});
test('alternate ending action still opens ending choices',async()=>{
 const app=await mount({version:1,solved,ending:'garden'});
 app.node('#start').onclick();app.node('#alternate').onclick();
 assert.match(app.node('#ending-choices').innerHTML,/data-ending="sea"/);
 assert.equal(app.node('#code-form').hidden,true);
});
test('archive ending shortcut is unchanged',async()=>{
 const app=await mount({version:1,solved,ending:'sea'});
 app.node('#final').onclick();assert.ok(app.html().includes(engine.endings.sea.title));
});

for(const persistent of [true,false]){
 test(`header and reset wait for a delayed ${persistent?'persistent':'temporary'} save`,async()=>{
  const app=await startMount({version:1,solved:{umbrella:'keep'},ending:null},{deferInit:true,persistent,allowReset:true});
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<button id="reset"[^>]*\sdisabled[\s>]/);
  assert.match(app.html(),/正在读取本机进度/);
  app.node('.brand').onclick({preventDefault(){}});
  assert.match(app.html(),/正在读取本机进度/);
  assert.doesNotMatch(app.html(),/id="start"/);
  app.node('#reset').onclick();
  assert.equal(app.node('#reset-dialog').open,false);
  assert.deepEqual(app.writes,[]);

  app.releaseInit();
  await app.ready;
  assert.equal(app.node('#reset').disabled,false);
  assert.match(app.html(),/1 \/ 3 已归档/);
  app.node('#start').onclick();
  app.node('.brand').onclick({preventDefault(){}});
  assert.match(app.html(),/id="start"/);
  app.node('#reset').onclick();
  assert.equal(app.node('#reset-dialog').open,true);
  app.node('#cancel-reset').onclick();
  assert.deepEqual(app.writes,[]);
  app.node('#reset').onclick();
  app.node('#confirm-reset').onclick();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(app.writes,[{action:{type:'reset'},expected:app.snapshot}]);
  assert.equal(app.node('#reset-dialog').open,false);
  assert.match(app.html(),/0 \/ 3 已归档/);
 });
}
