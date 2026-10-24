export type WriteJob={id:string;entity:string;key:string;payload:any;expectedVersion:number|null;status:'pending'|'blocked';error?:string;createdAt:string};
export type QueueAdapter={read:()=>WriteJob[];write:(jobs:WriteJob[])=>void;send:(job:WriteJob)=>Promise<any>;current:()=>boolean;changed:()=>void;completed:(job:WriteJob,result:any)=>void};
/** Serial durable writes. Each RPC uses the stable mutation ID for safe retry. */
export class WriteQueue{
 private running:Promise<void>|null=null;
 private results=new Map<string,any>();
 constructor(private adapter:QueueAdapter){}
 jobs(){return this.adapter.read();}
 async enqueue(job:WriteJob){const existing=this.jobs();this.adapter.write([...existing,job]);this.adapter.changed();await this.flush();const failed=this.jobs().find(j=>j.id===job.id);const row=this.results.get(job.id);this.results.delete(job.id);return failed?{state:failed.status==='blocked'?'failed':'pending',error:failed.error,row:undefined}:{state:'saved',error:undefined,row};}
 async retry(){this.adapter.write(this.jobs().map(j=>({...j,status:'pending',error:undefined})));this.adapter.changed();await this.flush();}
 flush(){if(this.running)return this.running;this.running=this.process().finally(()=>{this.running=null;});return this.running;}
 private async process(){
  while(this.adapter.current()){
   const jobs=this.jobs();const job=jobs.find((j,index)=>j.status==='pending'&&!jobs.slice(0,index).some(prior=>prior.key===j.key&&prior.status==='blocked'));if(!job)return;
   // Preserve operation order for each entity, including unresolved conflicts.
   
   try{const result=await this.adapter.send(job);if(!this.adapter.current())return;
    const next=this.jobs().filter(j=>j.id!==job.id).map(j=>j.key===job.key&&j.expectedVersion===job.expectedVersion?{...j,expectedVersion:result?.sync_version??j.expectedVersion}:j);
    this.results.set(job.id,result);if(this.results.size>50)this.results.delete(this.results.keys().next().value);this.adapter.write(next);this.adapter.completed(job,result);this.adapter.changed();
   }catch(error:any){if(!this.adapter.current())return;const transient=error?.transient===true;this.adapter.write(this.jobs().map(j=>j.id===job.id?{...j,status:transient?'pending':'blocked',error:error?.message||'Upload failed'}:j));this.adapter.changed();return;}
  }
 }
}
