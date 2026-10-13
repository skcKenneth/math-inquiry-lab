/* Shared browser-local mathematics storage. No network or cross-device service. */
(function (host) {
  'use strict';
  if (host.MathStorage) return;
  var LOCK = 'math-learning:writer:v1', PREFIX = 'math-learning-sync-v1:', stores = new Set();
  var copy = function (value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); };
  var equal = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
  var uuid = function () { return host.crypto && host.crypto.randomUUID ? host.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); };
  var safePath = function (path) { return Array.isArray(path) && path.length > 0 && path.length < 12 && path.every(function (p) { return typeof p === 'string' && p.length < 200 && !['__proto__', 'prototype', 'constructor'].includes(p); }); };
  function get(document, path) { return path.reduce(function (v, p) { return v && typeof v === 'object' ? v[p] : undefined; }, document); }
  function set(document, path, value) {
    var target = document;
    path.slice(0, -1).forEach(function (p) { if (!target[p] || typeof target[p] !== 'object' || Array.isArray(target[p])) target[p] = {}; target = target[p]; });
    if (value === undefined) delete target[path[path.length - 1]]; else target[path[path.length - 1]] = copy(value);
  }
  function fingerprint(raw) { var value = raw || '', hash = 2166136261; for (var i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619); return value.length + ':' + (hash >>> 0).toString(16); }
  function keyMeta(key) { return PREFIX + 'meta-key:' + encodeURIComponent(key); }
  function stamp(storage,key,raw,writer) { var value=JSON.stringify({version:1,revision:uuid(),writer:writer,fingerprint:fingerprint(raw)});storage.setItem(keyMeta(key),value);return value; }
  function seed(target,source){Object.keys(source||{}).forEach(function(key){if(['__proto__','prototype','constructor'].includes(key))return;if(target[key]===undefined)target[key]=copy(source[key]);else if(target[key]&&source[key]&&typeof target[key]==='object'&&typeof source[key]==='object'&&!Array.isArray(target[key])&&!Array.isArray(source[key]))seed(target[key],source[key]);});return target;}
  function apply(documents, operation) {
    var document = documents[operation.key], current = get(document, operation.path), value = operation.value;
    if (operation.kind === 'seed') { if(!operation.path.length){documents[operation.key]=seed(document||{},value);return;}set(document,operation.path,seed(current&&typeof current==='object'?copy(current):{},value));return; }
    if (operation.kind === 'remove-key') { documents[operation.key] = undefined; return; }
    if (!operation.path.length) { documents[operation.key] = copy(value); return; }
    if (!document) document = documents[operation.key] = {};
    if (operation.kind === 'increment') set(document, operation.path, (Number(current) || 0) + value);
    else if (operation.kind === 'max') set(document, operation.path, Math.max(Number(current) || 0, value));
    else if (operation.kind === 'append') {
      var events = Array.isArray(current) ? current.slice() : [];
      if (!events.some(function (event) { return event && event.eventId === value.eventId; })) events.push(copy(value));
      set(document, operation.path, events);
    } else if (operation.kind === 'event-remove') {
      // Event identities survive fresh JSON reads; object references do not.
      // Legacy rows without an identity remain untouched and exportable.
      set(document, operation.path, (Array.isArray(current) ? current : []).filter(function (event) { return !event || event.eventId !== value.eventId; }));
    } else if (operation.kind === 'array-add') { var added = Array.isArray(current) ? current.slice() : []; if (!added.includes(value)) added.push(value); set(document, operation.path, added); }
    else if (operation.kind === 'array-remove') set(document, operation.path, (Array.isArray(current) ? current : []).filter(function (v) { return v !== value; }));
    else if (operation.kind === 'array-move') {
      var ordered = Array.isArray(current) ? current.slice() : [];
      if (ordered.includes(value.id)) { ordered = ordered.filter(function (id) { return id !== value.id; }); var at = value.beforeId === null ? ordered.length : ordered.indexOf(value.beforeId); ordered.splice(at < 0 ? ordered.length : at, 0, value.id); }
      set(document, operation.path, ordered);
    } else set(document, operation.path, value);
  }
  function createStore(options) {
    var keys = Object.keys(options.defaults || {}), namespace = options.namespace;
    if (!/^[a-z0-9-]+$/.test(namespace || '') || !keys.length) throw Error('Storage namespace and defaults are required');
    var storage = options.storage, writer = uuid(), recoveryKey = PREFIX + 'recovery:' + namespace + ':' + writer;
    var locks = options.locks === undefined ? host.navigator && host.navigator.locks : options.locks;
    var listeners = new Set(), pending = [], variants = [], sequence = 0, tail = Promise.resolve(), disposed = false, external = false, unreadable = false;
    var status = storage && locks && typeof locks.request === 'function' ? 'saved' : 'session-only', recoveryEnabled = options.recovery !== false;
    var documents = {}, committed = {}, lastError = null, recoverySaved = false;
    function normalize(all) { keys.forEach(function (key) { if (all[key] !== undefined) all[key] = options.normalize ? options.normalize(key, all[key]) : all[key]; }); return all; }
    function read() {
      var result = {}, raws = {};
      keys.forEach(function (key) {
        var raw = storage ? storage.getItem(key) : null; raws[key] = raw;
        result[key] = raw === null ? copy(options.defaults[key]) : options.decode ? options.decode(key, raw) : JSON.parse(raw);
        if (!result[key] || typeof result[key] !== 'object' || Array.isArray(result[key])) throw Error('Unreadable stored document: ' + key);
      });
      return { documents: normalize(result), raws: raws };
    }
    function state() { return { snapshot: copy(documents), status: status, conflicts: copy(variants), pending: pending.length, recoverySaved: recoverySaved, error: lastError }; }
    function recoverySnapshot(operations){var result=copy(options.defaults);operations.forEach(function(op){var path=op.path;if(!path.length){result[op.key]=copy(documents[op.key]);return;}var selected=path[0]==='answers'||['history','categories','reviews','hints','selfAssessments','everWrong'].includes(path[0])?path.slice(0,2):path.slice(0,1);set(result[op.key],selected,get(documents[op.key],selected));});variants.forEach(function(item){if(!item.path.length)result[item.key]=copy(item.local);else{var path=item.path[0]==='answers'?item.path.slice(0,2):item.path.slice(0,1);set(result[item.key],path,get(documents[item.key],path));}});return result;}
    function notify() { var current = state(); listeners.forEach(function (listener) { try { listener(current); } catch (_) { /* A consumer cannot block other subscribers. */ } }); }
    function checkpoint() {
      if (!recoveryEnabled) return true;
      if (!pending.length && !variants.length) return true;
      try { if (!storage) throw Error('Storage unavailable'); storage.setItem(recoveryKey, JSON.stringify({ version: 1, namespace: namespace, writer: writer, at: new Date().toISOString(), pending: pending, conflicts: variants, snapshot: recoverySnapshot(pending) })); recoverySaved = true; return true; }
      catch (error) { recoverySaved = false; lastError = String(error); status = 'session-only'; return false; }
    }
    function metadataMatches(raws) {
      return keys.every(function (key) { var raw=storage&&storage.getItem(keyMeta(key));if(!raw)return true;try{return JSON.parse(raw).fingerprint===fingerprint(raws[key]);}catch(_){return false;} });
    }
    function conflict(operation, remote) {
      var existing = variants.find(function (item) { return item.key === operation.key && equal(item.path, operation.path); });
      if (existing) { existing.local = copy(operation.value); existing.remote = copy(remote); existing.sequence = operation.sequence; }
      else variants.push({ id: writer + ':' + operation.sequence, key: operation.key, path: copy(operation.path), base: copy(operation.base), local: copy(operation.value), remote: copy(remote), sequence: operation.sequence });
    }
    function merge(fresh, operations) {
      var result = copy(fresh), accepted = [], rejected = [];
      operations.forEach(function (operation) {
        var current = get(result[operation.key], operation.path);
        if(current===undefined&&Object.prototype.hasOwnProperty.call(operation,'defaultValue'))current=operation.defaultValue;
        if (['set','remove-key'].includes(operation.kind) && !operation.force && !equal(current, operation.base) && !equal(current, operation.value)) { conflict(operation, current); rejected.push(operation); }
        else { apply(result, operation); accepted.push(operation); }
      });
      return { documents: normalize(result), accepted: accepted, rejected: rejected };
    }
    function localView(fresh) { var result = copy(fresh); pending.forEach(function (operation) { apply(result, operation); }); variants.forEach(function (item) { apply(result, {key:item.key,path:item.path,value:item.local}); }); return normalize(result); }
    function retainExternal(fresh) {
      external = true; status = 'external-change';
      // Keep the prior committed version as well as any pending local draft.
      keys.forEach(function (key) { if (!equal(fresh[key], committed[key])) { var id = 'external:' + key; if (!variants.some(function (v) { return v.id === id; })) variants.push({ id: id, key: key, path: [], local: copy(documents[key]), remote: copy(fresh[key]), external: true }); } });
    }
    function write(next, previous) {
      var written = [], metadataWritten=[], expected = {};
      try {
        keys.forEach(function (key) { var raw = equal(next[key], previous.documents[key]) ? previous.raws[key] : next[key] === undefined ? null : JSON.stringify(next[key]); expected[key] = raw; if (raw !== previous.raws[key]) { if (raw === null) storage.removeItem(key); else storage.setItem(key, raw); written.push({ key: key, raw: raw }); } });
        var raws = {}; keys.forEach(function (key) { raws[key] = storage.getItem(key); if (raws[key] !== expected[key]) throw Error('Uncoordinated writer changed stored work'); });
        keys.forEach(function(key){var before=storage.getItem(keyMeta(key)),raw=stamp(storage,key,raws[key],writer);metadataWritten.push({key:keyMeta(key),before:before,raw:raw});});
        committed = copy(next); return true;
      } catch (error) {
        // Roll back only bytes this transaction still owns; never replace a newer external write.
        written.reverse().forEach(function (item) { try { if (storage.getItem(item.key) === item.raw) { if (previous.raws[item.key] === null) storage.removeItem(item.key); else storage.setItem(item.key, previous.raws[item.key]); } } catch (_) { /* Recovery snapshot remains available. */ } });
        metadataWritten.reverse().forEach(function(item){try{if(storage.getItem(item.key)===item.raw){if(item.before===null)storage.removeItem(item.key);else storage.setItem(item.key,item.before);}}catch(_){}});
        throw error;
      }
    }
    function enqueue(work) { var run = tail.then(work, work); tail = run.catch(function () {}); return run; }
    function locked(work) { return locks && typeof locks.request === 'function' ? locks.request(LOCK, work) : Promise.resolve({ ok: false, status: 'session-only', conflicts: copy(variants) }); }
    async function reconcile() {
      if (disposed || unreadable || !storage) return;
      try {
        var fresh = read();
        if (!metadataMatches(fresh.raws)) retainExternal(fresh.documents);
        if (!external) committed = copy(fresh.documents);
        documents = localView(fresh.documents); checkpoint(); notify();
      } catch (error) { unreadable = true; status = 'unreadable'; lastError = String(error); checkpoint(); notify(); }
    }
    try { var initial = read(); documents = initial.documents; committed = copy(documents); if (!metadataMatches(initial.raws)) retainExternal(initial.documents); }
    catch (error) { documents = copy(options.defaults); committed = copy(documents); unreadable = true; status = 'unreadable'; lastError = String(error); }
    function edit(operation) {
      if (!keys.includes(operation.key) || !(Array.isArray(operation.path) && !operation.path.length || safePath(operation.path)) || !['set', 'increment', 'max', 'seed', 'append', 'event-remove', 'array-add', 'array-remove', 'array-move', 'remove-key'].includes(operation.kind || 'set')) throw Error('Invalid storage operation');
      if (operation.kind === 'increment' && (!Number.isSafeInteger(operation.value) || operation.value < 0)) throw Error('Invalid increment');
      if (operation.kind === 'max' && !Number.isFinite(operation.value)) throw Error('Invalid maximum');
      if (operation.kind === 'append' && (!operation.value || typeof operation.value.eventId !== 'string')) throw Error('An event ID is required');
      if (operation.kind === 'event-remove' && (!safePath(operation.path) || !operation.value || typeof operation.value.eventId !== 'string' || !operation.value.eventId.length)) throw Error('A stable event ID and array path are required for removal');
      var op = copy(operation); op.kind = op.kind || 'set'; op.sequence = ++sequence; op.writer = writer;
      if (!Object.prototype.hasOwnProperty.call(operation, 'base')) op.base = copy(get(documents[op.key], op.path));
      // Coalesce only consecutive unsaved assignments, retaining their original base.
      var previous = pending[pending.length - 1];
      if (op.kind === 'set' && previous && previous.kind === 'set' && previous.key === op.key && equal(previous.path, op.path)) { op.base = previous.base; pending[pending.length - 1] = op; }
      else pending.push(op);
      apply(documents, op); normalize(documents); if (status === 'saved') status = 'pending'; checkpoint(); notify(); return op.sequence;
    }
    function flush() {
      checkpoint();
      return enqueue(function () { return locked(async function () {
        if (unreadable || external || !storage) return { ok: false, status: status, conflicts: copy(variants) };
        if (!pending.length) return { ok: !variants.length, status: status, conflicts: copy(variants) };
        var captured = pending.slice(), through = captured[captured.length - 1].sequence;
        try {
          var fresh = read(); if (!metadataMatches(fresh.raws)) { retainExternal(fresh.documents); documents = localView(fresh.documents); checkpoint(); notify(); return { ok: false, status: status, conflicts: copy(variants) }; }
          var merged = merge(fresh.documents, captured);
          if (!checkpoint()) return { ok: false, status: status, conflicts: copy(variants) };
          write(merged.documents, fresh);
          pending = pending.filter(function (op) { return op.sequence > through; });
          documents = localView(merged.documents); status = variants.length ? 'conflict' : pending.length ? 'pending' : 'saved'; lastError = null;
          // Keep the latest checkpoint after success for recovery from an older uncoordinated tab.
          try { if (recoveryEnabled) { storage.setItem(recoveryKey, JSON.stringify({ version: 1, namespace: namespace, writer: writer, at: new Date().toISOString(), pending: pending, conflicts: variants, snapshot: recoverySnapshot(captured.concat(pending)), committed: true })); recoverySaved = true; } } catch (_) { recoverySaved = false; }
          notify(); return { ok: !variants.length, status: status, conflicts: copy(variants) };
        } catch (error) { status = 'session-only'; lastError = String(error); checkpoint(); notify(); return { ok: false, status: status, conflicts: copy(variants), error: lastError }; }
      }); });
    }
    function subscribe(listener) { listeners.add(listener); return function () { listeners.delete(listener); }; }
    function recoveries() {
      var found = []; if (!storage) return found;
      try { for (var i = 0; i < storage.length; i++) { var key = storage.key(i); if (key && key.startsWith(PREFIX + 'recovery:' + namespace + ':')) { try { var value = JSON.parse(storage.getItem(key)); if (value && value.version === 1 && value.namespace === namespace) found.push(value); } catch (_) { /* Preserve malformed recovery bytes. */ } } } } catch (_) { /* Storage denied. */ }
      return copy(found);
    }
    function resolve(id, choice) {
      var item = variants.find(function (v) { return v.id === id; }); if (!item || item.external || !['local', 'remote'].includes(choice)) return Promise.resolve({ ok: false, status: status });
      variants = variants.filter(function (v) { return v.id !== id; });
      edit({ key: item.key, path: item.path, kind: 'set', base: item.remote, value: choice === 'local' ? item.local : item.remote });
      status = 'pending'; return flush();
    }
    function transact(mutator) {
      return enqueue(function () { return locked(async function () {
        if (unreadable || external || pending.length || variants.length || !storage) return { ok: false, status: status };
        try { var fresh = read(); if (!metadataMatches(fresh.raws)) { retainExternal(fresh.documents); checkpoint(); notify(); return { ok: false, status: status }; }
          var next = normalize(await mutator(copy(fresh.documents)));
          if (!checkpointTransaction(next)) return { ok: false, status: status };
          write(next, fresh); documents = localView(next); status = pending.length?'pending':'saved'; notify(); return { ok: true, status: status, snapshot: copy(documents) };
        } catch (error) { status = 'session-only'; lastError = String(error); notify(); return { ok: false, status: status, error: lastError }; }
      }); });
    }
    function checkpointTransaction(next) { if (!recoveryEnabled) return true; try { storage.setItem(recoveryKey, JSON.stringify({ version: 1, namespace: namespace, writer: writer, at: new Date().toISOString(), snapshot: localView(next), pending: pending, conflicts: variants, transaction: true })); recoverySaved = true; return true; } catch (error) { lastError = String(error); status = 'session-only'; return false; } }
    function resume() {
      return enqueue(function () { return locked(async function () { try { var fresh = read(); external = false; variants = variants.filter(function (v) { return !v.external; }); committed = copy(fresh.documents); keys.forEach(function(key){stamp(storage,key,fresh.raws[key],writer);}); documents = localView(fresh.documents); status = pending.length ? 'pending' : variants.length ? 'conflict' : 'saved'; checkpoint(); notify(); return { ok: true, status: status }; } catch (error) { status = 'session-only'; lastError = String(error); return { ok: false, status: status }; } }); });
    }
    function storageEvent(event) { if (event.storageArea && event.storageArea !== storage) return; if (event.key === null || keys.includes(event.key) || keys.some(function(key){return event.key===keyMeta(key);})) enqueue(function () { return locked(reconcile); }); }
    function refresh() { enqueue(function () { return locked(reconcile); }); }
    if (host.addEventListener) { host.addEventListener('storage', storageEvent); host.addEventListener('pageshow', refresh); host.addEventListener('focus', refresh); host.addEventListener('pagehide', checkpoint); }
    var api = { namespace: namespace, writer:writer, keys: keys.slice(), storage: storage, snapshot: function () { return copy(documents); }, state: state, edit: edit, flush: flush, subscribe: subscribe, conflicts: function () { return copy(variants); }, checkpoint: checkpoint, recoveries: recoveries, exportRecovery: function () { return { version: 1, namespace: namespace, pending: copy(pending), conflicts: copy(variants), recoveries: recoveries() }; }, resolve: resolve, transact: transact, resume: resume, refresh: refresh, setRecoveryEnabled: function (enabled) { recoveryEnabled = enabled === true;if(!recoveryEnabled&&storage){try{storage.removeItem(recoveryKey);recoverySaved=false;}catch(_){}} }, acceptRestored: function () { var fresh = read(); committed = copy(fresh.documents); documents = localView(fresh.documents); external = false; status = pending.length?'pending':'saved'; notify(); }, dispose: function () { disposed = true; stores.delete(api); listeners.clear(); if (host.removeEventListener) { host.removeEventListener('storage', storageEvent); host.removeEventListener('pageshow', refresh); host.removeEventListener('focus', refresh); host.removeEventListener('pagehide', checkpoint); } } };
    stores.add(api); return api;
  }
  async function flushAll() { return Promise.all(Array.from(stores).map(function (store) { return store.flush(); })); }
  async function withWriterLock(work) { var locks = host.navigator && host.navigator.locks; if (!locks || typeof locks.request !== 'function') return {ok:false,status:'session-only'}; return locks.request(LOCK, work); }
  async function restoreRaw(options) {
    var flushed = await flushAll(); if (flushed.some(function (result) { return !result.ok; })) return {ok:false,status:'pending-or-conflict'};
    return withWriterLock(async function () {
      var storage = options.storage, replacements = options.replacements, before = {}, written = [],metadataWritten=[];
      if (Array.from(stores).some(function (store) { return store.state().pending || store.conflicts().length; })) return {ok:false,status:'pending-or-conflict'};
      try {
        Object.keys(replacements).forEach(function (key) { before[key] = storage.getItem(key); if (options.expected && Object.prototype.hasOwnProperty.call(options.expected,key) && options.expected[key] !== before[key]) throw Error('Records changed after import preview'); });
        if (options.before) await options.before(copy(before));
        Object.keys(replacements).forEach(function (key) { var raw = replacements[key]; if (raw !== null && typeof raw !== 'string') throw Error('Raw restore requires strings or null'); if (raw === null) storage.removeItem(key); else storage.setItem(key,raw); written.push(key); });
        if (options.applyOther) await options.applyOther();
        Object.keys(replacements).forEach(function(key){var old=storage.getItem(keyMeta(key)),raw=stamp(storage,key,storage.getItem(key),'restore');metadataWritten.push({key:keyMeta(key),before:old,raw:raw});});
        Array.from(stores).filter(function (store) { return store.storage === storage && store.keys.some(function (key) { return Object.prototype.hasOwnProperty.call(replacements,key); }); }).forEach(function (store) { store.acceptRestored(); });
        return {ok:true,status:'saved'};
      } catch (error) {
        var rollbackErrors=[];written.reverse().forEach(function (key) { try { if (storage.getItem(key) === replacements[key]) { if (before[key] === null) storage.removeItem(key); else storage.setItem(key,before[key]); }else rollbackErrors.push('Newer writer retained: '+key); } catch (rollbackError) { rollbackErrors.push(String(rollbackError)); } });
        metadataWritten.reverse().forEach(function(item){try{if(storage.getItem(item.key)===item.raw){if(item.before===null)storage.removeItem(item.key);else storage.setItem(item.key,item.before);}}catch(rollbackError){rollbackErrors.push(String(rollbackError));}});
        if (options.rollbackOther) { try { await options.rollbackOther(); } catch (rollbackError) { rollbackErrors.push(String(rollbackError)); } }
        return {ok:false,status:'restore-failed',error:String(error),rollbackIncomplete:rollbackErrors.length>0,rollbackErrors:rollbackErrors};
      }
    });
  }
  host.MathStorage = { version: 1, createStore: createStore, lockName: LOCK, recoveryPrefix: PREFIX + 'recovery:', flushAll: flushAll, withWriterLock: withWriterLock, restoreRaw: restoreRaw, exportAllRecovery:function(){return Array.from(stores).map(function(store){return store.exportRecovery();});}, snapshotAll:function(){return Array.from(stores).map(function(store){return {namespace:store.namespace,keys:store.keys,snapshot:store.snapshot(),state:store.state()};});} };
  if (typeof module !== 'undefined' && module.exports) module.exports = host.MathStorage;
})(typeof window !== 'undefined' ? window : globalThis);
