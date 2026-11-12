import {KEY, fresh, normalize, solve, finish} from './engine.js';

export const DATABASE = 'anomalous-everyday-save-v2';
const copy = value => JSON.parse(JSON.stringify(value));
export const initialRecord = (legacy, generation) => ({schema:2, revision:0, generation, data:normalize(legacy)});

// Called only inside one readwrite transaction. It never merges an old run into a new run.
export function transition(current, expected, action, newGeneration) {
  const unchanged = reason => ({record:current, changed:false, reason});
  if (!expected || expected.generation !== current.generation) return unchanged('reset');
  if (action.type === 'reset') {
    if (expected.revision !== current.revision) return unchanged('conflict');
    return {record:{schema:2,revision:current.revision+1,generation:newGeneration,data:fresh()},changed:true};
  }
  if (action.type === 'finish' && expected.revision !== current.revision) return unchanged('conflict');
  let data;
  if (action.type === 'solve') {
    if (current.data.solved[action.id]) return unchanged('already');
    data = solve(current.data,action.id,action.choice);
  } else if (action.type === 'finish') {
    data = finish(current.data,action.ending,action.code);
  } else return unchanged('invalid');
  if (data === current.data) return unchanged('invalid');
  return {record:{...current,revision:current.revision+1,data},changed:true};
}

export function createStore({indexedDB=globalThis.indexedDB, legacyStorage, database=DATABASE,
  makeGeneration=()=>globalThis.crypto.randomUUID(), onChange=()=>{},
  channelFactory=name=>typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null}={}) {
  let db, memory, channel, last;
  const legacy = () => {try{return JSON.parse(legacyStorage?.getItem(KEY) ?? 'null');}catch{return null;}};
  async function open() {
    if (!indexedDB) throw Error('IndexedDB unavailable');
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(database,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('save');
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(Error('Database blocked'));
    });
  }
  function transaction(action, expected) {
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('save','readwrite'), table=tx.objectStore('save');
      let result;
      const get=table.get('current');
      get.onsuccess=()=>{
        try {
          const current=get.result ?? initialRecord(legacy(),makeGeneration());
          // Never replace an unrecognized future save format.
          if(current.schema!==2 || typeof current.generation!=='string' || !Number.isSafeInteger(current.revision)) throw Error('Unsupported save');
          result=action?transition(current,expected,action,action.type==='reset'?makeGeneration():null):{record:current,changed:false};
          if(!get.result || result.changed)table.put(result.record,'current');
        } catch(error) {reject(error);tx.abort();}
      };
      tx.oncomplete=()=>resolve(copy(result));
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error ?? Error('Save aborted'));
    });
  }
  const snapshot = record => ({data:copy(record.data),generation:record.generation,revision:record.revision});
  const api = {
    persistent:false, reloadRequired:false,
    async init() {
      try {
        db=await open();
        db.onversionchange=()=>{db.close();api.persistent=false;api.reloadRequired=true;onChange();};
        last=(await transaction()).record;
        api.persistent=true;
      } catch {memory=initialRecord(legacy(),makeGeneration());last=memory;}
      // Notifications are an optimization only. Transactions provide correctness without them.
      if(api.persistent)try{channel=channelFactory(database);if(channel)channel.onmessage=()=>onChange();}catch{}
      return snapshot(last);
    },
    async read() {
      if(api.persistent)last=(await transaction()).record;
      return snapshot(last);
    },
    async apply(action, expected) {
      let result;
      if(api.persistent) {
        // A failed transaction must not silently become a successful session-only save.
        result=await transaction(action,expected);
      } else if(memory) {
        result=transition(memory,expected,action,action.type==='reset'?makeGeneration():null);memory=result.record;
      } else throw Error('Storage changed; reload required');
      last=result.record;
      if(result.changed)try{channel?.postMessage('changed');}catch{}
      return {...snapshot(last),reason:result.reason};
    },
    close(){channel?.close();db?.close();}
  };
  return api;
}
