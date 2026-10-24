/** Account-scoped cache; it is never an authentication source. */
let owner:string|null=null;
const sharedKeys=new Set(['bbb_exercises']);
export function setCacheOwner(id:string|null){owner=id;}
export function getCacheOwner(){return owner;}
export function scopedKey(key:string){return sharedKeys.has(key)?key:owner?`bbb_account_${owner}:${key}`:null;}
export function storage<T>(key:string,fallback:T):T{try{const k=scopedKey(key);if(!k)return fallback;const raw=localStorage.getItem(k);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}
export function setStorage<T>(key:string,value:T){const k=scopedKey(key);if(!k)return;try{localStorage.setItem(k,JSON.stringify(value));}catch{window.dispatchEvent(new CustomEvent('bbb-cache-error'));}}
export function removeStorage(key:string){const k=scopedKey(key);if(k)localStorage.removeItem(k);}
export function scrubLegacyPasswords(){for(const key of Object.keys(localStorage)){if(!key.endsWith('bbb_users')&&key!=='bbb_users')continue;try{const rows=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(rows))localStorage.setItem(key,JSON.stringify(rows.map(({password,...safe}:any)=>safe)));}catch{/* Invalid historic cache is ignored. */}}}
export function removeExact<T extends {id:string;remote_id?:string}>(rows:T[],target:T){return rows.filter(row=>row.id!==target.id&&!(target.remote_id&&row.remote_id===target.remote_id));}
export function mergeById<T extends {id:string;remote_id?:string}>(rows:T[],incoming:T){const found=rows.some(r=>r.id===incoming.id||!!incoming.remote_id&&r.remote_id===incoming.remote_id);return found?rows.map(r=>r.id===incoming.id||!!incoming.remote_id&&r.remote_id===incoming.remote_id?{...r,...incoming}:r):[incoming,...rows];}
export function mergePending<T extends {id:string;remote_id?:string;sync_state?:string}>(remote:T[],cached:T[],queuedIds?:Set<string>){const cloudIds=new Set(remote.flatMap(r=>[r.id,r.remote_id].filter(Boolean)));const pending=cached.filter(r=>r.sync_state==='failed'||r.sync_state==='pending'&&(!queuedIds||queuedIds.has(r.id)||!!r.remote_id&&queuedIds.has(r.remote_id)||!cloudIds.has(r.remote_id||r.id)));const ids=new Set(pending.flatMap(r=>[r.id,r.remote_id].filter(Boolean)));return [...pending,...remote.filter(r=>!ids.has(r.id))];}
