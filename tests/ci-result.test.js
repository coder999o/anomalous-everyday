import test from 'node:test';
import assert from 'node:assert/strict';
import {assertBrowserResults} from '../ci/browser-result.mjs';
const complete = Array.from({length:8},(_,i)=>'PASS test '+i).join('\n')+'\nALL PASS (8 browser transaction tests)';
test('CI accepts only eight completed browser tests',()=>assert.doesNotThrow(()=>assertBrowserResults(complete)));
test('CI fails on caught browser assertions, even with a success marker',()=>assert.throws(()=>assertBrowserResults(complete+'\nFAIL lost progress')));
test('CI fails on incomplete or stalled runs',()=>{for(const value of ['尚未运行','运行中','PASS one',complete.replace('PASS test 0\n','')])assert.throws(()=>assertBrowserResults(value));});
