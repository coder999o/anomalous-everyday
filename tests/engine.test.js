import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,normalize,solve,finish,completed,balanced,correctCode,jobs} from '../engine.js';
function play(choices){return jobs.reduce((s,j,i)=>solve(s,j.id,choices[i]),fresh());}
test('fresh progress, invalid input and old saves recover safely',()=>{assert.deepEqual(normalize(null),fresh());assert.deepEqual(normalize({version:0}),fresh());assert.deepEqual(normalize({version:1,solved:{bad:'keep',moon:'invalid'},ending:'sea'}),fresh());});
test('all quests can be completed in any order without mutating prior state',()=>{const old=fresh();let s=solve(old,'moon','keep');s=solve(s,'umbrella','return');s=solve(s,'lift','keep');assert.equal(completed(s),3);assert.equal(completed(old),0);assert.equal(balanced(s),true);});
test('repeat clicks and invalid choices cannot overwrite an archive',()=>{let s=solve(fresh(),'moon','keep');assert.equal(solve(s,'moon','return'),s);assert.equal(solve(s,'bogus','keep'),s);assert.equal(solve(s,'lift','bogus'),s);});
test('gate rejects incomplete clues and wrong password',()=>{const s=play(['keep','keep','keep']);assert.equal(finish(fresh(),'garden','留一天').ending,null);assert.equal(finish(s,'garden','wrong').ending,null);assert.equal(correctCode(' 留 一 天 '),true);});
test('both regular endings are reachable for every decision combination',()=>{for(let n=0;n<8;n++){const s=play([0,1,2].map(i=>(n>>i&1)?'keep':'return'));for(const end of ['garden','sea'])assert.equal(finish(s,end,'留一天').ending,end);}});
test('hidden ending needs both types of decisions',()=>{assert.equal(finish(play(['keep','keep','keep']),'window','留一天').ending,null);assert.equal(finish(play(['keep','return','keep']),'window','留一天').ending,'window');});
test('save roundtrip retains valid progress and ending',()=>{const s=finish(play(['keep','return','keep']),'window','留一天');assert.deepEqual(normalize(JSON.parse(JSON.stringify(s))),s);});
test('all narrative cards have complete choices, unique ids and ordered clue',()=>{assert.equal(new Set(jobs.map(j=>j.id)).size,3);assert.equal(jobs.map(j=>j.word).join(''),'留一天');for(const j of jobs){assert.equal(j.choices.length,2);assert.ok(j.intro&&j.clue&&j.prompt&&j.artifact);}});
