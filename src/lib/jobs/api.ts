import 'server-only';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {RowDataPacket} from 'mysql2/promise';
import {getDatabasePool} from '@/lib/db';
import {cabOperationsActor,requireCabPermission,limitRequest,privateJson,readBody,CabError} from '@/lib/cab/security';
import {jobTypes,automationPolicySchema,type JobType} from './types';
import {retryJob} from './repository';
import {runBatch} from './worker';
import {scheduleJobs} from './scheduler';
import {executeJob,automationPolicy} from './registry';
export const jobPermission=(type:JobType)=>type==='PAYMENT_RECOVERY'?'finance':type==='RETENTION'||type==='OUTBOX'?'settings':'dispatch';
export async function automationOverview(params:URLSearchParams){
 const {page,status}=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),status:z.enum(['ALL','PENDING','RUNNING','COMPLETED','RETRY_WAIT','FAILED','CANCELLED']).default('ALL')}).parse(Object.fromEntries(params));const db=getDatabasePool();
 const [counts]=await db.query<RowDataPacket[]>('SELECT job_status status,COUNT(*) total FROM cab_jobs GROUP BY job_status');
 const where=status==='ALL'?'':' WHERE job_status=?',values=status==='ALL'?[]:[status];
 const [count]=await db.query<RowDataPacket[]>('SELECT COUNT(*) total FROM cab_jobs'+where,values);
 const [jobs]=await db.query<RowDataPacket[]>('SELECT job_id id,job_type,job_status,correlation_id reference,attempts,max_attempts,next_run_at nextRun,last_run_at lastRun,completed_at completedAt,error_category errorCategory,error_summary errorSummary FROM cab_jobs'+where+' ORDER BY created_at DESC,job_id LIMIT 8 OFFSET ?',[...values,(page-1)*8]);
 const [outboxCounts]=await db.query<RowDataPacket[]>('SELECT delivery_status status,COUNT(*) total FROM notifications GROUP BY delivery_status');
 const [outbox]=await db.query<RowDataPacket[]>("SELECT n.notification_id id,n.booking_id reference,n.notification_kind kind,n.delivery_status status,n.attempts,j.next_run_at nextRun,j.last_run_at lastRun,j.error_category errorCategory FROM notifications n LEFT JOIN cab_jobs j ON j.dedupe_key=SHA2(CONCAT('outbox:',n.notification_id),256) ORDER BY n.created_at DESC LIMIT 8 OFFSET ?",[(page-1)*8]);
 const [last]=await db.query<RowDataPacket[]>("SELECT MAX(finished_at) lastSuccess FROM cab_job_runs WHERE run_status='COMPLETED'");
 const [recent]=await db.query<RowDataPacket[]>('SELECT r.run_id id,r.job_id jobId,j.job_type type,r.attempt,r.run_status status,r.started_at startedAt,r.finished_at finishedAt,r.error_category errorCategory FROM cab_job_runs r JOIN cab_jobs j ON j.job_id=r.job_id ORDER BY r.started_at DESC LIMIT 8');
 return {jobs,total:Number(count[0].total),page,counts,outboxCounts,outbox,recent,lastSuccess:last[0].lastSuccess,policy:await automationPolicy()};
}
export async function handleAutomationApi(request:Request,parts:string[]):Promise<Response|null>{
 if(parts[0]!=='admin'||parts[1]!=='automation')return null;
 const method=request.method,db=getDatabasePool();
 if(method==='GET'){await requireCabPermission('read');return privateJson(await automationOverview(new URL(request.url).searchParams));}
 await limitRequest(request,'automation-action',6);
 if(parts[2]==='policy'&&method==='PUT'){
   const actor=await cabOperationsActor('settings'),input=automationPolicySchema.parse(await readBody(request));
   const old=await automationPolicy();const unchanged=Object.entries(input).every(([key,value])=>old[key as keyof typeof old]===value);
   const policy={...input,version:unchanged?old.version:randomUUID()};await db.execute("INSERT INTO website_settings (setting_key,setting_value,is_public) VALUES ('cab_automation_policy',?,FALSE) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",[JSON.stringify(policy)]);await audit(actor.userId,'Automation reminder policy saved','automation-policy');return privateJson({saved:true});
 }
 if(parts[2]==='retry'&&method==='POST'){
   const {id}=z.object({id:z.string().uuid()}).strict().parse(await readBody(request));const [r]=await db.execute<RowDataPacket[]>('SELECT job_type FROM cab_jobs WHERE job_id=?',[id]);if(!r[0])throw new CabError('Job not found.',404);
   const actor=await cabOperationsActor(jobPermission(r[0].job_type));try{await retryJob(id,actor.userId);}catch{throw new CabError('This job is not eligible for automatic retry. Inspect its safe error category.',409);}return privateJson({retried:true});
 }
 if(parts[2]==='run'&&method==='POST'){
   const {type}=z.object({type:z.enum(jobTypes)}).strict().parse(await readBody(request));const actor=await cabOperationsActor(jobPermission(type));
   await audit(actor.userId,'Bounded automation requested '+type,'automation');await scheduleJobs([type]);const result=await runBatch(executeJob,{limit:5,concurrency:1,types:[type],actor:actor.userId});await audit(actor.userId,'Automation batch finished '+type,'automation');return privateJson(result);
 }
 throw new CabError('Unsupported automation action.',404);
}
async function audit(actor:string,action:string,target:string){await getDatabasePool().execute("INSERT INTO cab_audit_log (event_id,actor_role,action,entity_id,created_at) VALUES (?,'SYSTEM',?,?,UTC_TIMESTAMP(3))",[randomUUID(),(actor+': '+action).slice(0,80),target]);}
