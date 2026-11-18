import 'server-only';
import {randomUUID} from 'node:crypto';
import {getDatabasePool} from '@/lib/db';
import {claimJob,heartbeat,finishJob,type Job} from './repository';
import {JobFailure,payloadSchemas,safeJobFailure,type JobType} from './types';
export type JobHandler=(job:Job)=>Promise<unknown>;
/** Named execution lock prevents overlapping handlers even when a paused process loses its lease. */
export async function runBatch(handler:JobHandler,options:{limit?:number;concurrency?:number;signal?:AbortSignal;types?:JobType[];actor?:string;onlyIds?:string[]}={}){
  const limit=options.limit??10,concurrency=options.concurrency??1;
  if(!Number.isInteger(limit)||limit<1||limit>50||!Number.isInteger(concurrency)||concurrency<1||concurrency>2)throw Error('Invalid worker bounds');
  let claimed=0,completed=0,failed=0;const worker=randomUUID();
  await Promise.all(Array.from({length:concurrency},async()=>{
    while(!options.signal?.aborted&&claimed<limit){claimed++;const j=await claimJob(worker,options.actor||'SYSTEM',options.types,90,options.onlyIds);if(!j)break;
      const db=await getDatabasePool().getConnection();let locked=false,timer:ReturnType<typeof setInterval>|undefined;
      try{
        const [locks]=await db.query<import('mysql2/promise').RowDataPacket[]>('SELECT GET_LOCK(?,0) acquired',['cab-job:'+j.job_id]);locked=Number(locks[0].acquired)===1;
        if(!locked)throw new JobFailure('EXECUTOR_BUSY',true,'Previous executor is still active.');
        if(!await heartbeat(j))throw new JobFailure('LEASE_LOST',true);
        timer=setInterval(()=>{void heartbeat(j).catch(()=>{});},20000);
        if(j.payload_version!==1)throw new JobFailure('PAYLOAD_VERSION',false,'Unsupported payload version.');
        payloadSchemas[j.job_type].parse(j.payload);
        await handler(j);
        if(await finishJob(j))completed++;
      }catch(e){const error=safeJobFailure(e);if(await finishJob(j,error))failed++;}
      finally{if(timer)clearInterval(timer);if(locked)await db.query('SELECT RELEASE_LOCK(?)',['cab-job:'+j.job_id]);db.release();}
      console.info(JSON.stringify({event:'job_batch_progress',worker,jobId:j.job_id,type:j.job_type,attempt:j.attempts}));
    }
  }));return {completed,failed};
}
