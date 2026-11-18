import 'server-only';
import {randomUUID,createHash} from 'node:crypto';
import type {PoolConnection,RowDataPacket,ResultSetHeader} from 'mysql2/promise';
import {getDatabasePool} from '@/lib/db';
import {jobTypes,payloadSchemas,type JobType,type JobPayload,type JobFailure} from './types';
export const jobDigest=(s:string)=>createHash('sha256').update(s).digest('hex');
export type Job=RowDataPacket & {job_id:string;job_type:JobType;payload_version:number;payload:JobPayload;attempts:number;max_attempts:number;claim_token:string;run_id:string};
export async function jobTransaction<T>(fn:(db:PoolConnection)=>Promise<T>){const db=await getDatabasePool().getConnection();try{await db.beginTransaction();const v=await fn(db);await db.commit();return v;}catch(e){await db.rollback();throw e;}finally{db.release();}}
export async function enqueueJob(type:JobType,payload:unknown,dedupe:string,at=new Date(),maxAttempts=5){
  if(!jobTypes.includes(type)||!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>10||!Number.isFinite(at.getTime()))throw Error('Invalid job');
  const parsed=payloadSchemas[type].parse(payload),id=randomUUID();
  await getDatabasePool().execute('INSERT IGNORE INTO cab_jobs (job_id,job_type,payload_version,payload,dedupe_key,correlation_id,scheduled_at,next_run_at,max_attempts) VALUES (?,?,1,?,?,?,?,?,?)',[id,type,JSON.stringify(parsed),jobDigest(dedupe),Object.values(parsed)[0],at,at,maxAttempts]);
  return id;
}
/** Claim and recovery use database time. Expired final attempts become visible failures. */
export async function claimJob(workerId:string,actor:string,types:JobType[]= [...jobTypes],leaseSeconds=90,onlyIds?:string[]):Promise<Job|null>{
  if(!types.length)return null;
  if(!Number.isInteger(leaseSeconds)||leaseSeconds<15||leaseSeconds>300||types.some(t=>!jobTypes.includes(t)))throw Error('Invalid claim');
  return jobTransaction(async db=>{
    if(onlyIds&&(!onlyIds.length||onlyIds.length>50))return null;
    const [rows]=await db.query<Job[]>(`SELECT * FROM cab_jobs WHERE job_type IN (${types.map(()=>'?').join(',')}) ${onlyIds?'AND job_id IN ('+onlyIds.map(()=>'?').join(',')+')':''} AND ((job_status IN ('PENDING','RETRY_WAIT') AND next_run_at<=UTC_TIMESTAMP(3)) OR (job_status='RUNNING' AND lease_until<UTC_TIMESTAMP(3))) ORDER BY next_run_at,job_id LIMIT 1 FOR UPDATE SKIP LOCKED`,[...types,...(onlyIds||[])]);
    const j=rows[0];if(!j)return null;
    // An expired lease is not evidence that an external side effect did not occur.
    await db.execute("UPDATE cab_job_runs SET run_status='ABANDONED',finished_at=UTC_TIMESTAMP(3),error_category='LEASE_EXPIRED' WHERE job_id=? AND finished_at IS NULL",[j.job_id]);
    if(j.attempts>=j.max_attempts){await db.execute("UPDATE cab_jobs SET job_status='FAILED',claim_token=NULL,lease_until=NULL,error_category='ATTEMPTS_EXHAUSTED',error_summary='Attempt limit reached; review required.',updated_at=UTC_TIMESTAMP(3) WHERE job_id=?",[j.job_id]);return null;}
    const token=randomUUID(),runId=randomUUID();
    await db.execute("UPDATE cab_jobs SET job_status='RUNNING',attempts=attempts+1,claim_token=?,lease_until=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(3)),last_run_at=UTC_TIMESTAMP(3),updated_at=UTC_TIMESTAMP(3) WHERE job_id=?",[token,leaseSeconds,j.job_id]);
    await db.execute("INSERT INTO cab_job_runs (run_id,job_id,attempt,run_status,worker_id,actor) VALUES (?,?,?,'RUNNING',?,?)",[runId,j.job_id,j.attempts+1,workerId,actor]);
    return {...j,payload:typeof j.payload==='string'?JSON.parse(j.payload):j.payload,attempts:j.attempts+1,claim_token:token,run_id:runId};
  });
}
export async function heartbeat(j:Job,seconds=90){const [r]=await getDatabasePool().execute<ResultSetHeader>("UPDATE cab_jobs SET lease_until=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(3)) WHERE job_id=? AND claim_token=? AND job_status='RUNNING' AND lease_until>UTC_TIMESTAMP(3)",[seconds,j.job_id,j.claim_token]);return r.affectedRows===1;}
export const retryDelay=(attempt:number,random=Math.random)=>Math.min(3600,15*2**Math.min(attempt-1,8))+Math.floor(random()*10);
export async function finishJob(j:Job,error?:JobFailure){
  return jobTransaction(async db=>{
    const status=error?(error.retryable&&j.attempts<j.max_attempts?'RETRY_WAIT':'FAILED'):'COMPLETED';
    const [r]=await db.execute<ResultSetHeader>("UPDATE cab_jobs SET job_status=?,claim_token=NULL,lease_until=NULL,completed_at=IF(?='COMPLETED',UTC_TIMESTAMP(3),NULL),next_run_at=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(3)),error_category=?,error_summary=?,updated_at=UTC_TIMESTAMP(3) WHERE job_id=? AND claim_token=? AND job_status='RUNNING' AND lease_until>UTC_TIMESTAMP(3)",[status,status,Math.max(retryDelay(j.attempts),error?.retryAfter||0),error?.category||null,error?.summary||null,j.job_id,j.claim_token]);
    if(!r.affectedRows)return false;
    await db.execute('UPDATE cab_job_runs SET run_status=?,finished_at=UTC_TIMESTAMP(3),error_category=? WHERE run_id=?',[status,error?.category||null,j.run_id]);return true;
  });
}
export async function retryJob(id:string,actor:string){return jobTransaction(async db=>{
  const [rows]=await db.execute<RowDataPacket[]>("SELECT job_type,job_status,error_category FROM cab_jobs WHERE job_id=? FOR UPDATE",[id]);const j=rows[0];
  if(!j||j.job_status!=='FAILED'||['SMTP_UNCERTAIN','OUTBOX_REVIEW','SMTP_REJECTED','PAYLOAD_VERSION'].includes(j.error_category))throw Error('This job requires review or is not retryable.');
  // A manual retry grants one bounded attempt; history is retained.
  await db.execute("UPDATE cab_jobs SET job_status='RETRY_WAIT',max_attempts=attempts+1,next_run_at=UTC_TIMESTAMP(3),updated_at=UTC_TIMESTAMP(3) WHERE job_id=?",[id]);
  await db.execute('INSERT INTO cab_audit_log (event_id,actor_role,action,entity_id,created_at) VALUES (?,\'SYSTEM\',?,?,UTC_TIMESTAMP(3))',[randomUUID(),'Manual job retry by '+actor,id]);return true;
});}
