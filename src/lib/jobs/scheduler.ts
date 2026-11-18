import 'server-only';
import {randomUUID} from 'node:crypto';
import type {RowDataPacket} from 'mysql2/promise';
import {getDatabasePool} from '@/lib/db';
import {enqueueJob,jobDigest} from './repository';
import {automationPolicy} from './registry';
import type {JobType} from './types';
const decode=(v:unknown)=>typeof v==='string'?JSON.parse(v):v;
/** Stable keys persist terminal outcomes: repeated ticks do not reset exhausted work. */
export async function scheduleJobs(types?:JobType[],onlyBookingIds?:string[]){
  if(onlyBookingIds&&(!onlyBookingIds.length||onlyBookingIds.length>20))throw Error('Invalid scheduler scope');
  const scope=(column:string)=>onlyBookingIds?' AND '+column+' IN ('+onlyBookingIds.map(()=>'?').join(',')+')':'';
  const db=getDatabasePool();let considered=0;const wanted=(t:JobType)=>!types||types.includes(t);
  if(wanted('OUTBOX')){
    const [r]=await db.query<RowDataPacket[]>("SELECT n.notification_id FROM notifications n LEFT JOIN cab_jobs j ON j.dedupe_key=SHA2(CONCAT('outbox:',n.notification_id),256) WHERE n.delivery_status IN ('queued','sending') AND j.job_id IS NULL"+scope('n.booking_id')+" ORDER BY n.delivery_status,n.created_at LIMIT 25",onlyBookingIds||[]);
    for(const row of r){await enqueueJob('OUTBOX',{notificationId:row.notification_id},'outbox:'+row.notification_id);considered++;}
  }
  if(wanted('RETENTION')){
    const [r]=await db.query<RowDataPacket[]>("SELECT d.document_id,d.booking_id FROM cab_private_documents d WHERE d.delete_after<=UTC_TIMESTAMP(3) AND d.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM cab_jobs j WHERE j.dedupe_key=SHA2(CONCAT('retention:',d.document_id),256))"+scope('d.booking_id')+" ORDER BY d.delete_after LIMIT 25",onlyBookingIds||[]);
    for(const row of r){await enqueueJob('RETENTION',{documentId:row.document_id,bookingId:row.booking_id},'retention:'+row.document_id);considered++;}
  }
  // Bounded keyset pages avoid repeatedly scanning every JSON quotation/payment row per tick.
  for(const name of ['quotes','payments','reminders']){
    const type:JobType=name==='quotes'?'QUOTE_EXPIRY':name==='payments'?'PAYMENT_RECOVERY':'REMINDER';if(!wanted(type))continue;
    const key='cab_automation_cursor_'+name;
    const [cursor]=await db.execute<RowDataPacket[]>('SELECT setting_value FROM website_settings WHERE setting_key=?',[key]);const after=onlyBookingIds?'':cursor[0]?String(decode(cursor[0].setting_value)):'';
    const sql=name==='payments'?"SELECT payment_attempt_id id FROM payment_attempts WHERE payment_attempt_id>? AND provider='razorpay' AND attempt_status IN ('PENDING','CREATING','RECONCILIATION_REQUIRED') AND updated_at<TIMESTAMPADD(MINUTE,-5,UTC_TIMESTAMP(3)) ORDER BY payment_attempt_id LIMIT 25":name==='quotes'?"SELECT b.booking_id id,c.commercial_payload FROM bookings b JOIN cab_booking_commercial c ON c.booking_id=b.booking_id WHERE b.booking_id>? AND b.booking_status='QUOTED' ORDER BY b.booking_id LIMIT 25":"SELECT booking_id id,journey_snapshot FROM bookings WHERE booking_id>? AND booking_status IN ('REQUESTED','QUOTED','ACCEPTED','CONFIRMED','ASSIGNED') AND departure_at>UTC_TIMESTAMP(3) ORDER BY booking_id LIMIT 25";
    const scopedSql=sql.replace(' ORDER BY',scope(name==='quotes'?'b.booking_id':'booking_id')+' ORDER BY');
    const [rows]=await db.execute<RowDataPacket[]>(scopedSql,[after,...(onlyBookingIds||[])]);const policy=await automationPolicy();
    for(const row of rows){
      if(name==='payments'){await enqueueJob(type,{attemptId:row.id},'payment-recovery:'+row.id);considered++;}
      else if(name==='quotes'){const co=decode(row.commercial_payload),q=co?.quotations?.at(-1);if(q&&!q.acceptedAt&&Date.parse(q.expiresAt)<=Date.now()&&co.expiryProcessedVersion!==q.version){await enqueueJob(type,{bookingId:row.id,versionHash:jobDigest(q.version)},'quote-expiry:'+row.id+':'+q.version);considered++;}}
      else{const j=decode(row.journey_snapshot),start=Date.parse(j.departure+':00+05:30');if(start<=Date.now()+policy.hours*3600000)for(const kind of ['customer','preparation','action'] as const)if(policy[kind]){await enqueueJob(type,{bookingId:row.id,departure:j.departure,kind,policyVersion:policy.version},['reminder',row.id,j.departure,kind,policy.version].join(':'));considered++;}}
    }
    if(!onlyBookingIds)await db.execute('INSERT INTO website_settings (setting_key,setting_value,is_public) VALUES (?,?,FALSE) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)',[key,JSON.stringify(rows.length===25?rows.at(-1)!.id:'')]);
  }
  return {considered,tick:randomUUID()};
}
