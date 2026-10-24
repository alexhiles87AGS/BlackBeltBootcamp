import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const modules=new Map();let checks=0;
const memory=new Map();const localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
function load(path){if(modules.has(path))return modules.get(path);const out={};modules.set(path,out);const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;const relative=(specifier)=>specifier==='./cache'||specifier==='../services/cache'?load('src/services/cache.ts'):require(specifier);vm.runInNewContext(`(function(exports,require){${js}\n})`,{localStorage,window:{dispatchEvent(){}},CustomEvent:class{},console,Date,Map,Set,Object,JSON,setTimeout,clearTimeout})(out,relative);return out;}
const check=(a,b)=>{assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));checks++};
const cache=load('src/services/cache.ts');cache.setCacheOwner('alex');cache.setStorage('bbb_logs',[{id:'alex-log'}]);cache.setCacheOwner('james');check(cache.storage('bbb_logs',[]),[]);cache.setStorage('bbb_logs',[{id:'james-log'}]);cache.setCacheOwner('alex');check(cache.storage('bbb_logs',[]),[{id:'alex-log'}]);cache.setCacheOwner(null);check(cache.storage('bbb_logs',[]),[]);
const a={id:'a'},b={id:'b'},c={id:'c',remote_id:'cloud-c'};check(cache.removeExact([a,b,c],a),[b,c]);check(cache.removeExact([a,b,c],c),[a,b]);check(cache.mergeById([a,b],{id:'a',name:'updated'}),[{id:'a',name:'updated'},b]);check(cache.mergePending([{id:'a',sync_state:'saved'},{id:'b',sync_state:'saved'}],[{id:'a',sync_state:'pending',name:'local'}]),[{id:'a',sync_state:'pending',name:'local'},{id:'b',sync_state:'saved'}]);
check(cache.mergePending([{id:'a',sync_state:'saved',sync_version:2}],[{id:'a',sync_state:'pending'}],new Set()),[{id:'a',sync_state:'saved',sync_version:2}]);
const domain=load('src/services/domain.ts');for(const tz of ['Europe/London','Pacific/Auckland','America/Los_Angeles']){process.env.TZ=tz;for(const day of ['2026-03-29','2026-10-25','2026-12-31']){check(domain.dateOnly(day),day);check(domain.iso(domain.dateFromIso(day)),day);check(domain.toGmtSessionDate(day),day+'T12:00:00+00:00');}check(domain.iso(domain.addDays('2026-12-31',1)),'2027-01-01');}
const {remainingSeconds}=load('src/hooks/useWorkoutDraft.ts');check(remainingSeconds(100000,10000),90);check(remainingSeconds(100000,99999),1);check(remainingSeconds(100000,200000),0);
const {WriteQueue}=load('src/services/outbox-core.ts');const job=(id,key='workout:1')=>({id,entity:'programme',key,payload:{},expectedVersion:0,status:'pending',createdAt:'same-millisecond'});
let jobs=[],calls=[],complete=[],active=true,release;let pause=new Promise(r=>release=r);
const adapter={read:()=>jobs,write:j=>{jobs=j},changed:()=>{},current:()=>active,completed:(j,r)=>complete.push([j.id,r.sync_version]),send:async j=>{calls.push([j.id,j.expectedVersion]);if(j.id==='one')await pause;return {sync_version:j.expectedVersion+1}}};
const queue=new WriteQueue(adapter);const first=queue.enqueue(job('one'));const second=queue.enqueue(job('two'));release();await Promise.all([first,second]);check(calls,[['one',0],['two',1]]);check(jobs,[]);check(complete,[['one',1],['two',2]]);
// A transient failure stays durable across a new queue instance and uses the same mutation ID.
jobs=[];calls=[];let offline=true;const offlineAdapter={...adapter,send:async j=>{calls.push(j.id);if(offline)throw Object.assign(new Error('offline'),{transient:true});return {sync_version:1}}};
let offlineQueue=new WriteQueue(offlineAdapter);check((await offlineQueue.enqueue(job('durable'))).state,'pending');check(jobs.length,1);offline=false;offlineQueue=new WriteQueue(offlineAdapter);await offlineQueue.flush();check(calls,['durable','durable']);check(jobs.length,0);
// A conflict blocks later writes to that record, even with identical timestamps.
jobs=[];calls=[];const conflictAdapter={...adapter,send:async j=>{calls.push(j.id);if(j.id==='conflict')throw new Error('BBB_CONFLICT');return {sync_version:1}}};const conflictQueue=new WriteQueue(conflictAdapter);await conflictQueue.enqueue(job('conflict'));await conflictQueue.enqueue(job('later'));await conflictQueue.enqueue(job('unrelated','nutrition:2'));check(calls,['conflict','unrelated']);check(jobs.map(j=>[j.id,j.status]),[['conflict','blocked'],['later','pending']]);
// In-flight results cannot hydrate a different account after switching.
jobs=[];complete=[];active=true;pause=new Promise(r=>release=r);const switchQueue=new WriteQueue({...adapter,send:async()=>{await pause;return {sync_version:1}}});const pending=switchQueue.enqueue(job('account-a'));active=false;release();await pending;check(jobs.length,1);check(complete,[]);active=true;
const quotaQueue=new WriteQueue({...adapter,write:()=>{throw new Error('storage quota')}});await assert.rejects(quotaQueue.enqueue(job('no-space')),/quota/);checks++;
console.log(`PASS cache isolation, deletion, merge, dates, rest timer and durable outbox (${checks} checks)`);
await import('./database.mjs');
