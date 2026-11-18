import 'server-only';
import {getDatabasePool} from '@/lib/db';
import type {RowDataPacket} from 'mysql2/promise';
import {sendSmtpEmail,safeSmtpFailure} from '@/lib/email/smtp';
import {jobTransaction,enqueueJob} from '@/lib/jobs/repository';
import {JobFailure} from '@/lib/jobs/types';
import {materializeCabMessage} from './notifications';
import type {NotificationLog} from './models';
/** Only errors proving no submission / explicit SMTP rejection are safe for automatic resend. */
export function classifySmtpFailure(error:unknown){
  const e=error as {code?:string;responseCode?:number;command?:string};
  if(e?.responseCode&&e.responseCode>=400&&e.responseCode<500)return new JobFailure('SMTP_TEMPORARY',true,'SMTP explicitly deferred submission.');
  if(e?.responseCode&&e.responseCode>=500)return new JobFailure('SMTP_REJECTED',false,'SMTP rejected the message. Review recipient or sending policy.');
  if(['EAUTH','ENOTFOUND','EDNS','ECONNREFUSED'].includes(e?.code||'')||(e?.code==='ECONNECTION'&&['CONN','EHLO','AUTH'].includes(e.command||'')))return new JobFailure(e.code==='EAUTH'?'SMTP_CONFIGURATION':'SMTP_CONNECTION',e.code!=='EAUTH','SMTP connection or authentication did not complete.');
  if(e?.code==='ETIMEDOUT'&&['CONN','EHLO','AUTH'].includes(e.command||''))return new JobFailure('SMTP_CONNECTION',true,'SMTP connection timed out before submission.');
  return new JobFailure('SMTP_UNCERTAIN',false,'Submission outcome is uncertain. Check provider logs; automatic resend blocked.');
}
export async function processOutboxItem(id:string){
  const item=await jobTransaction(async db=>{
    await db.query('SELECT revision FROM cab_state_lock WHERE lock_id=1 FOR UPDATE');
    const [rows]=await db.execute<RowDataPacket[]>('SELECT * FROM notifications WHERE notification_id=? FOR UPDATE',[id]);const n=rows[0];
    if(!n||['sent','preview'].includes(n.delivery_status))return null;
    if(n.delivery_status==='sending'){
      await db.execute("UPDATE notifications SET delivery_status='uncertain',error_message='Worker interrupted after submission claim; provider review required.' WHERE notification_id=?",[id]);
      return 'uncertain';
    }
    if(['uncertain','failed'].includes(n.delivery_status))return 'uncertain';
    if(n.delivery_status!=='queued')return null;
    const [settings]=await db.execute<RowDataPacket[]>("SELECT setting_value FROM website_settings WHERE setting_key='cab_operations_settings'");
    const config=settings[0]?.setting_value;const prefs=(typeof config==='string'?JSON.parse(config):config)?.notifications||{};
    const live=process.env.CAB_EMAIL_MODE==='smtp'&&process.env.CAB_EMAIL_SEND_ENABLED==='true'&&(n.audience==='admin'?prefs.admin:n.audience==='driver'?prefs.driver===true:prefs.customer);
    await db.execute('UPDATE notifications SET delivery_status=?,attempts=attempts+? WHERE notification_id=?',[live?'sending':'preview',live?1:0,id]);
    if(!live)return null;
    return {id,bookingId:n.booking_id,kind:n.notification_kind,subject:n.subject,text:n.text_body,html:n.html_body,recipient:n.recipient} as NotificationLog;
  });
  if(item==='uncertain')throw new JobFailure('OUTBOX_REVIEW',false,'Outbox outcome needs review; automatic resend blocked.');
  if(!item)return;
  let failure:JobFailure|undefined;
  try{const message=await materializeCabMessage(item);await sendSmtpEmail({to:item.recipient,replyTo:process.env.INFO_EMAIL,...message,messageId:`<${id}@sukhadhholidays.in>`});}
  catch(error){failure=classifySmtpFailure(error);const safe=safeSmtpFailure(error);console.warn(JSON.stringify({event:'outbox_submission_unconfirmed',notificationId:id,category:failure.category,code:safe.code,stage:safe.stage}));}
  // If this persistence fails after SMTP acceptance, leave sending for explicit uncertainty recovery.
  await jobTransaction(async db=>{
    await db.query('SELECT revision FROM cab_state_lock WHERE lock_id=1 FOR UPDATE');
    await db.execute("UPDATE notifications SET delivery_status=?,error_message=? WHERE notification_id=? AND delivery_status='sending'",[failure?(failure.retryable?'queued':failure.category==='SMTP_UNCERTAIN'?'uncertain':'failed'):'sent',failure?.summary||null,id]);
  });
  if(failure)throw failure;
}
export async function processTargetedOutbox(bookingId?:string){
  const [rows]=await getDatabasePool().query<RowDataPacket[]>("SELECT notification_id FROM notifications n WHERE delivery_status='queued' AND NOT EXISTS (SELECT 1 FROM cab_jobs j WHERE j.dedupe_key=SHA2(CONCAT('outbox:',n.notification_id),256))"+(bookingId?' AND booking_id=?':'')+' ORDER BY created_at LIMIT 20',bookingId?[bookingId]:[]);
  if(process.env.CAB_EMAIL_MODE==='smtp'&&process.env.CAB_EMAIL_SEND_ENABLED==='true'){
    // Live submission belongs to the leased worker; web requests cannot bypass retry cooldowns.
    for(const row of rows)await enqueueJob('OUTBOX',{notificationId:row.notification_id},'outbox:'+row.notification_id);
    return;
  }
  for(const row of rows){try{await processOutboxItem(row.notification_id);}catch{/* Persisted safe status is authoritative; scheduled job retries where eligible. */}}
}
