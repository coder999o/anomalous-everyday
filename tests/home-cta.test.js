import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as engine from '../engine.js';

// Executes the actual app and its registered handlers with a minimal DOM/store adapter.
// This tests routing/rendered markup, not browser layout, focus, or IndexedDB behavior.
async function mount(saved){
 const nodes=new Map();
 const node=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,focus(){},close(){},showModal(){}});
  return nodes.get(selector);
 };
 const document={querySelector:node,querySelectorAll:()=>[],addEventListener(){}};
 const window={localStorage:{},scrollTo(){},addEventListener(){}};
 const snapshot={data:structuredClone(saved),generation:'test',revision:1};
 const storage={createStore:()=>({persistent:true,init:async()=>snapshot,read:async()=>snapshot,apply:async()=>{throw Error('Navigation must not write a save');}})};
 const source=(await readFile(new URL('../app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 await new AsyncFunction('document','window','engine','storage',
  "const {jobs,endings,fresh,completed,balanced,correctCode}=engine;const {createStore}=storage;\n"+source)(document,window,engine,storage);
 return {node,html:()=>node('#main').innerHTML};
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
