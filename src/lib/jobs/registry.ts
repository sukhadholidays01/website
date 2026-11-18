import 'server-only';
import type {RowDataPacket,PoolConnection} from 'mysql2/promise';
import {getDatabasePool} from '@/lib/db';
import {operationalBooking} from '@/lib/cab/operations-query';
import {queueCabEmail} from '@/lib/cab/notifications';
import {processOutboxItem} from '@/lib/cab/outbox';
import {purgeExpiredDocuments} from '@/lib/cab/guest-documents';
import {reconcileOrder} from '@/lib/cab/razorpay';
import type {CabBooking,CabState} from '@/lib/cab/types';
import type {EmailKind,NotificationLog} from '@/lib/cab/models';
import {jobTransaction,jobDigest,type Job} from './repository';
import {JobFailure,type AutomationPolicy} from './types';
const decode=<T>(v:unknown):T=>typeof v==='string'?JSON.parse(v):v as T;
export async function automationPolicy():Promise<AutomationPolicy>{const [r]=await getDatabasePool().execute<RowDataPacket[]>("SELECT setting_value FROM website_settings WHERE setting_key='cab_automation_policy'");return r[0]?decode(r[0].setting_value):{version:'00000000-0000-4000-8000-000000000000',customer:false,preparation:false,action:false,hours:24};}
async function lockState(db:PoolConnection){await db.query('SELECT lock_id FROM cab_state_lock WHERE lock_id=1 FOR UPDATE');}
async function queue(db:PoolConnection,b:CabBooking,kind:EmailKind,event:string){
  const state={operations:{notifications:[] as NotificationLog[],drivers:[]}} as unknown as CabState;
  queueCabEmail(state,b,kind,event);
  for(const n of state.operations.notifications)await db.execute("INSERT IGNORE INTO notifications (notification_id,booking_id,notification_kind,audience,delivery_status,attempts,created_at,dedupe_key,subject,html_body,text_body,recipient) VALUES (?,?,?,?,'queued',0,UTC_TIMESTAMP(3),?,?,?,?,?)",[n.id,b.id,n.kind,n.audience,jobDigest('automatic:'+event+':'+kind),n.subject,n.html,n.text,n.recipient]);
}
async function audit(db:PoolConnection,id:string,action:string){await db.execute("INSERT INTO cab_audit_log (event_id,actor_role,action,entity_id,created_at) VALUES (UUID(),'SYSTEM',?,?,UTC_TIMESTAMP(3))",[action,id]);}
export async function executeJob(j:Job){
  if(j.job_type==='PAYMENT_RECOVERY'){
    const [attempts]=await getDatabasePool().execute<RowDataPacket[]>("SELECT attempt_status,updated_at<=TIMESTAMPADD(MINUTE,-5,UTC_TIMESTAMP(3)) AS ready FROM payment_attempts WHERE payment_attempt_id=? AND provider='razorpay'",[j.payload.attemptId]);
    if(!attempts[0]||['SUCCESSFUL','REFUNDED'].includes(attempts[0].attempt_status))return;
    if(!attempts[0].ready)throw new JobFailure('PAYMENT_COOLDOWN',true,'Payment recovery is waiting for its cooldown.',300);
    await reconcileOrder(j.payload.attemptId,'SYSTEM');
    const [after]=await getDatabasePool().execute<RowDataPacket[]>('SELECT attempt_status FROM payment_attempts WHERE payment_attempt_id=?',[j.payload.attemptId]);
    if(after[0]&&!['SUCCESSFUL','REFUNDED','FAILED'].includes(after[0].attempt_status))throw new JobFailure('PAYMENT_PENDING',true,'Provider capture remains unresolved.',300);
    return;
  }
  if(j.job_type==='OUTBOX')return processOutboxItem(j.payload.notificationId);
  if(j.job_type==='RETENTION')return purgeExpiredDocuments('SYSTEM',[j.payload.documentId],j.payload.bookingId);
  const p=j.payload;
  // Targeted detail only; take existing global mutation lock before eligibility and metadata writes.
  return jobTransaction(async db=>{
    await lockState(db);
    const [rows]=await db.execute<RowDataPacket[]>('SELECT booking_status,departure_at,accepted_version,journey_snapshot FROM bookings WHERE booking_id=? FOR UPDATE',[p.bookingId]);if(!rows[0])return;
    const [co]=await db.execute<RowDataPacket[]>('SELECT commercial_payload FROM cab_booking_commercial WHERE booking_id=? FOR UPDATE',[p.bookingId]);
    const commercial=co[0]?decode<NonNullable<CabBooking['commercial']>&{expiryProcessedVersion?:string}>(co[0].commercial_payload):undefined;
    const b={...await operationalBooking(p.bookingId),commercial} as CabBooking;
    if(j.job_type==='QUOTE_EXPIRY'){
      const q=commercial?.quotations.at(-1);
      if(!q||rows[0].booking_status!=='QUOTED'||q.acceptedAt||rows[0].accepted_version||jobDigest(q.version)!==p.versionHash||Date.parse(q.expiresAt)>Date.now()||commercial?.expiryProcessedVersion===q.version)return;
      await db.execute("UPDATE cab_booking_commercial SET commercial_payload=JSON_SET(commercial_payload,'$.expiryProcessedVersion',?) WHERE booking_id=?",[q.version,p.bookingId]);
      await audit(db,p.bookingId,'CURRENT_QUOTATION_EXPIRY_PROCESSED');
      await queue(db,b,'quote-expired',j.dedupe_key);await queue(db,b,'admin-quote-expired',j.dedupe_key);return;
    }
    if(j.job_type==='REMINDER'){
      const policy=await automationPolicy(),journey=decode<{departure:string}>(rows[0].journey_snapshot);
      if(policy.version!==p.policyVersion||!policy[p.kind as 'customer'|'preparation'|'action']||journey.departure!==p.departure)return;
      const start=new Date(rows[0].departure_at).getTime(),delta=start-Date.now();
      const statuses=p.kind==='customer'?['CONFIRMED','ASSIGNED']:['REQUESTED','QUOTED','ACCEPTED','CONFIRMED','ASSIGNED'];
      if(!statuses.includes(rows[0].booking_status)||delta<=0||delta>policy.hours*3600000)return;
      if(p.kind==='action'&&b.assignment&&rows[0].booking_status==='ASSIGNED')return;
      const [consents]=await db.execute<RowDataPacket[]>("SELECT COUNT(DISTINCT category) total FROM cab_booking_consents WHERE booking_id=? AND category IN ('booking_terms','privacy_notice')",[p.bookingId]);
      if(p.kind==='customer'&&(Number(consents[0].total)!==2||!b.customer.email))return;
      await queue(db,b,p.kind==='customer'?'journey-reminder':'admin-upcoming',j.dedupe_key);await audit(db,p.bookingId,'AUTOMATIC_'+p.kind.toUpperCase()+'_REMINDER_QUEUED');
    }
  });
}
