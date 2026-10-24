import {supabase} from '../supabaseClient';
import {getCacheOwner} from './cache';
import {WriteQueue,type WriteJob} from './outbox-core';
export type SyncInfo={sync_state?:'saved'|'pending'|'failed';sync_error?:string;sync_version?:number;last_mutation_id?:string};
const queues=new Map<string,WriteQueue>();
async function withOutboxLock<T>(owner:string,action:()=>Promise<T>):Promise<T>{return navigator.locks?navigator.locks.request(`bbb-writes-${owner}`,action):action();}
const event=(name:string,detail?:any)=>window.dispatchEvent(new CustomEvent(name,{detail}));
export function pendingWrites(){const owner=getCacheOwner();if(!owner)return [];try{return JSON.parse(localStorage.getItem(`bbb_outbox_${owner}`)||'[]') as WriteJob[];}catch{return [];}}
function queueFor(owner:string){if(queues.has(owner))return queues.get(owner)!;
 const key=`bbb_outbox_${owner}`;
 const queue=new WriteQueue({read:()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}},write:jobs=>{localStorage.setItem(key,JSON.stringify(jobs));},current:()=>getCacheOwner()===owner,changed:()=>event('bbb-outbox'),completed:(job,row)=>event('bbb-write-complete',{owner,job,row}),send:async job=>{
  if(!supabase)throw Object.assign(new Error('Cloud connection is not configured.'),{transient:false});
  if(!navigator.onLine)throw Object.assign(new Error('Offline — retained on this device.'),{transient:true});
  const {data:session}=await supabase.auth.getSession();if(session.session?.user.id!==owner)throw new Error('Sign in to the account that made this change.');
  const args=job.entity==='programme'?{p_programme:job.payload.row,p_exercises:job.payload.exercises,p_expected_version:job.expectedVersion,p_mutation_id:job.id}: {p_table:job.payload.table,p_row:job.payload.row,p_expected_version:job.expectedVersion,p_mutation_id:job.id};
  const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),15000);let response;try{response=await supabase.rpc(job.entity==='programme'?'bbb_save_programme_v43':'bbb_save_record_v43',args).abortSignal(controller.signal)}finally{window.clearTimeout(timeout)}const {data,error}=response;
  if(error){let message=error.message||'Upload failed';if(/PGRST202|function.*not.*exist|schema cache/i.test(message))message='The training service needs an update. Ask your administrator to finish setup before retrying.';if(/BBB_CONFLICT/.test(message))message='This record changed on another device. Keep your local copy, review the cloud version, then choose which to retain.';throw Object.assign(new Error(message),{transient:/fetch|network|timeout|abort|failed to fetch|503|502/i.test(error.message||'')});}
  return Array.isArray(data)?data[0]:data;
 }});queues.set(owner,queue);return queue;
}
export async function writeRecord(entity:string,table:string,row:any,local:any,extra?:{exercises:any[]},expectedOwner=getCacheOwner()){
 const owner=getCacheOwner();if(!owner||owner!==expectedOwner)return {...local,sync_state:'failed',sync_error:'Please sign in again.'};
 const job:WriteJob={id:crypto.randomUUID(),entity,key:`${table}:${row.id}`,payload:{table,row,local_id:local.id,...extra},expectedVersion:local.sync_version??(local.remote_id?0:null),status:'pending',createdAt:new Date().toISOString()};
 try{const result=await withOutboxLock(owner,()=>queueFor(owner).enqueue(job));return {...local,remote_id:row.id,sync_state:result.state,sync_error:result.error,sync_version:result.state==='saved'?(result.row?.sync_version??(local.sync_version??0)+1):local.sync_version};}
 catch(error:any){event('bbb-write-error',error.message);return {...local,sync_state:'failed',sync_error:'Could not preserve this change. Free device storage and retry before closing.'};}
}
export async function flushWrites(retry=false){const owner=getCacheOwner();if(owner)await withOutboxLock(owner,()=>retry?queueFor(owner).retry():queueFor(owner).flush());}
export function syncMessage(row:SyncInfo,label='Change'){return row.sync_state==='saved'?`${label} saved to cloud.`:row.sync_state==='failed'?`${label} needs attention: ${row.sync_error||'Retry upload.'}`:`${label} retained on this device — upload pending.`;}
export async function confirmedDelete(table:string,id:string,version?:number){
 if(!supabase)throw new Error('Cloud connection unavailable. Nothing has been deleted.');
 let query=supabase.from(table).delete().eq('id',id);if(version!==undefined)query=query.eq('sync_version',version);
 const {data,error}=await query.select('id');if(error)throw error;if(!data?.length)throw new Error('The record changed, is unavailable, or deletion is not permitted. Refresh and review before retrying.');
}
export async function resolveAthlete(profile:any){if(profile?.remote_id)return profile.remote_id;if(/^[0-9a-f-]{36}$/i.test(profile?.id||''))return profile.id;if(!supabase)throw new Error('Cloud connection unavailable.');const {data,error}=await supabase.from('athlete_profiles').select('id').eq('email',profile.email).single();if(error||!data)throw new Error('The athlete profile could not be verified.');return data.id;}
export async function reviewPending(job:WriteJob){if(!supabase)throw new Error('Cloud unavailable');const {data,error}=await supabase.from(job.payload.table).select('*').eq('id',job.payload.row.id).maybeSingle();if(error)throw error;if(data&&job.entity==='programme'){const exercises=await supabase.from('workout_programme_exercises').select('*').eq('programme_id',data.id).order('sort_order');if(exercises.error)throw exercises.error;return {...data,_exercises:exercises.data||[]};}if(!data&&job.payload.table==='workout_logs'&&job.payload.row.session_id){const found=await supabase.from('workout_logs').select('*').eq('session_id',job.payload.row.session_id).eq('exercise_id',job.payload.row.exercise_id).maybeSingle();if(found.error)throw found.error;return found.data;}return data;}
export async function resolvePending(job:WriteJob,choice:'local'|'cloud',version:number|null,cloudId?:string){const owner=getCacheOwner();if(!owner)return;
 await withOutboxLock(owner,async()=>{if(getCacheOwner()!==owner)return;const key=`bbb_outbox_${owner}`;const jobs=pendingWrites();const next=choice==='cloud'?jobs.filter(j=>j.key!==job.key):jobs.map(j=>j.key===job.key?{...j,key:cloudId?`${j.payload.table}:${cloudId}`:j.key,payload:{...j.payload,row:{...j.payload.row,id:cloudId||j.payload.row.id}},...(j.id===job.id?{expectedVersion:version,status:'pending',error:undefined}:{} )}:j);localStorage.setItem(key,JSON.stringify(next));event('bbb-outbox');});
 if(choice==='local')await flushWrites();else event('bbb-use-cloud',{key:job.key,id:job.payload.row.id,local_id:job.payload.local_id});}
