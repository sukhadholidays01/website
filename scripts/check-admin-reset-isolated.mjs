import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {serverModuleLoader} from './server-module-loader.mjs';
import {hashPassword,verifyPassword} from '../src/lib/auth/passwords.mjs';
import {checkAdminEnvironment} from './check-admin-environment.mjs';
import {adminResetOrigin} from '../src/lib/auth/reset-configuration.mjs';

const saved={...process.env},originalInfo=console.info,originalWarn=console.warn,originalFetch=globalThis.fetch;
const logs=[],mail=[],hash=value=>createHash('sha256').update(value).digest('hex');
const emails=[`${randomUUID()}@example.invalid`,`${randomUUID()}@example.invalid`],password=randomBytes(24).toString('hex'),nextPassword=randomBytes(24).toString('hex');
let state={users:[],tokens:new Map(),sessions:new Map(),audit:[]},verifyError,sendError,databaseError,auditFailure=false;
let queue=Promise.resolve();
async function execute(sql,args=[]){
 if(databaseError)throw databaseError;
 if(sql.startsWith('INSERT INTO cab_audit_log')){if(auditFailure)throw {code:'ER_NO_SUCH_TABLE'};state.audit.push(args);return [{affectedRows:1}];}
 if(sql.startsWith('SELECT user_id, role, is_active FROM users'))return [state.users.filter(u=>u.email===args[0])];
 if(sql.startsWith('SELECT token_hash FROM admin_password_resets WHERE user_id'))return [[...state.tokens.values()].filter(t=>t.user_id===args[0]&&t.created>Date.now()-60000)];
 if(sql.startsWith('DELETE FROM admin_password_resets WHERE user_id')){for(const [key,t] of state.tokens)if(t.user_id===args[0])state.tokens.delete(key);return [{affectedRows:1}];}
 if(sql.startsWith('DELETE FROM admin_password_resets WHERE token_hash')){state.tokens.delete(args[0]);return [{affectedRows:1}];}
 if(sql.startsWith('INSERT INTO admin_password_resets')){const now=Date.now();state.tokens.set(args[0],{token_hash:args[0],user_id:args[1],created:now,expires:now+1800000});return [{affectedRows:1}];}
 if(sql.startsWith('SELECT u.email,u.role')){const t=state.tokens.get(args[0]),u=state.users.find(u=>u.user_id===t?.user_id);return [u?[{...u,unexpired:t.expires>Date.now()}]:[]];}
 if(sql.startsWith('SELECT user_id FROM admin_password_resets')){const t=state.tokens.get(args[0]);return [t?[{user_id:t.user_id}]:[]];}
 if(sql.startsWith('SELECT user_id, email, role'))return [state.users.filter(u=>u.user_id===args[0])];
 if(sql.startsWith('SELECT token_hash FROM admin_password_resets WHERE token_hash')){const t=state.tokens.get(args[0]);return [t&&t.user_id===args[1]&&t.expires>Date.now()?[t]:[]];}
 if(sql.startsWith('UPDATE users SET password_hash')){state.users.find(u=>u.user_id===args[1]).password_hash=args[0];return [{affectedRows:1}];}
 if(sql.startsWith('DELETE FROM cab_admin_sessions')){for(const [key,id] of state.sessions)if(id===args[0])state.sessions.delete(key);return [{affectedRows:1}];}
 throw Error('Unexpected isolated SQL operation');
}
const pool={execute,getConnection:async()=>{
 let unlock,snapshot,active=false;
 const finish=()=>{if(active){active=false;unlock();}};
 return {execute,beginTransaction:async()=>{const preceding=queue;queue=new Promise(resolve=>{unlock=resolve;});await preceding;snapshot=structuredClone(state);active=true;},commit:async()=>finish(),rollback:async()=>{if(active)state=snapshot;finish();},release:finish};
}};
class CabError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const security={CabError,hash,staffRole:role=>['OWNER','DISPATCHER','ACCOUNTANT','VIEWER'].includes(role)?role:null,limitRequest:async()=>{},readBody:request=>request.json(),requireSameOrigin:request=>{if(request.headers.get('origin')!==process.env.CAB_SITE_ORIGIN)throw new CabError('Request origin was not accepted.',403);}};
try{
 Object.assign(process.env,{NODE_ENV:'production',ADMIN_EMAIL_1:emails[0],ADMIN_EMAIL_2:emails[1],CAB_SESSION_SECRET:randomBytes(32).toString('hex'),CAB_SITE_ORIGIN:'https://sukhadholidays.in',SMTP_HOST:'smtp.example.invalid',SMTP_PORT:'465',SMTP_USER:'sender@example.invalid',SMTP_PASS:randomBytes(32).toString('hex'),INFO_EMAIL:'help@example.invalid'});
 console.info=value=>logs.push(JSON.parse(value));console.warn=value=>logs.push(JSON.parse(value));
 let transportOptions,sentOptions;
 const smtp=serverModuleLoader({nodemailer:{createTransport:options=>{transportOptions=options;return {verify:async()=>true,sendMail:async options=>{sentOptions=options;return {accepted:['fixture'],rejected:[]};},close(){}};}}})('src/lib/email/smtp');
 await smtp.verifySmtpConnection();assert(transportOptions.secure&&transportOptions.requireTLS);assert(transportOptions.auth.user===process.env.SMTP_USER);
 process.env.SMTP_PORT='587';await smtp.verifySmtpConnection();assert(!transportOptions.secure&&transportOptions.requireTLS);process.env.SMTP_PORT='465';
 await smtp.sendSmtpEmail({to:emails[0],subject:'Fixture',text:'Fixture'});assert(sentOptions.from.address===process.env.SMTP_USER);
 assert.equal(smtp.safeSmtpFailure({code:'EAUTH',responseCode:535,response:'sensitive'}).stage,'authentication');
 const smtpPassword=process.env.SMTP_PASS;delete process.env.SMTP_PASS;await assert.rejects(smtp.verifySmtpConnection(),e=>e.code==='SMTP_CONFIGURATION');process.env.SMTP_PASS=smtpPassword;
 const env=checkAdminEnvironment(process.env,{email:true});assert.equal(env.ok,true);
 for(const [key,value,problem] of [['SMTP_HOST','','SMTP_HOST_MISSING'],['SMTP_USER','','SMTP_USER_MISSING'],['SMTP_USER','bad','SMTP_USER_INVALID'],['SMTP_PASS','','SMTP_PASS_MISSING'],['SMTP_PORT','25','SMTP_PORT_INVALID'],['CAB_SITE_ORIGIN','http://sukhadholidays.in','RESET_ORIGIN_INSECURE']]){
  const result=checkAdminEnvironment({...process.env,[key]:value},{email:true});assert.equal(result.code,'ADMIN_RESET_EMAIL_CONFIGURATION');assert(result.configurationProblems.includes(problem));
 }
 assert.equal(adminResetOrigin({NODE_ENV:'production',APP_URL:'https://sukhadholidays.in'}).ok,true);
 assert.equal(adminResetOrigin({NODE_ENV:'production',CAB_SITE_ORIGIN:'https://user:password@example.invalid'}).ok,false);
 assert.equal(adminResetOrigin({NODE_ENV:'production',CAB_SITE_ORIGIN:'https://sukhadholidays.in?token=bad'}).ok,false);
 const load=serverModuleLoader({'@/lib/db':{getDatabasePool:()=>pool},'@/lib/cab/security':security,'@/lib/email/smtp':{safeSmtpFailure:smtp.safeSmtpFailure,verifySmtpConnection:async()=>{if(verifyError)throw verifyError;},sendSmtpEmail:async message=>{if(sendError)throw sendError;mail.push(message);}}});
 const service=load('src/lib/auth/password-reset'),api=load('src/lib/auth/password-reset-api').handleAdminPasswordReset;
 const encoded=await hashPassword(password);state.users=emails.map((email,i)=>({user_id:randomUUID(),email,password_hash:encoded,role:i?'VIEWER':'OWNER',is_active:true}));
 const request=(action,body,origin=process.env.CAB_SITE_ORIGIN)=>api(new Request('https://sukhadholidays.in/api/cab/password-reset/'+action,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),action);
 const tokenFromMail=()=>new URL(mail.at(-1).text.match(/^https:\/\/[^\s]+$/m)[0]).hash.slice(7);
 const assertSkipped=async(email,reason)=>{
  const before=mail.length,tokenCount=state.tokens.size;
  const response=await request('request',{email}),body=await response.json();
  assert.equal(response.status,200);assert.equal(body.message,service.resetAcknowledgement);
  const events=logs.filter(l=>l.requestId===body.requestId);
  assert(events.some(l=>l.event==='admin_reset_email_result'&&l.status==='skipped'&&l.reason===reason));
  assert(!events.some(l=>l.status==='attempted'||l.status==='accepted'));
  assert.equal(mail.length,before);assert.equal(state.tokens.size,tokenCount);
 };
 await assertSkipped('unlisted@example.invalid','email_not_allowlisted');
 const fixtureUser=state.users.shift();await assertSkipped(emails[0],'account_missing');state.users.unshift(fixtureUser);
 state.users[0].is_active=false;await assertSkipped(emails[0],'account_inactive');state.users[0].is_active=true;
 const fixtureRole=state.users[0].role;state.users[0].role='CUSTOMER';await assertSkipped(emails[0],'account_role_ineligible');state.users[0].role=fixtureRole;
 const received=await request('request',{email:emails[0]});assert.equal(received.status,200);const ack=await received.json();assert.equal(received.headers.get('x-request-id'),ack.requestId);
 assert(logs.some(l=>l.status==='attempted'&&l.stage==='submission'&&l.requestId===ack.requestId));
 await assertSkipped(emails[0],'cooldown_active');
 assert(logs.some(l=>l.event==='admin_reset_request_received'&&l.requestId===ack.requestId));assert(logs.some(l=>l.status==='accepted'&&l.requestId===ack.requestId));
 const first=tokenFromMail();assert(/^[a-f0-9]{64}$/.test(first));assert(state.tokens.has(hash(first)));assert(!state.tokens.has(first));assert(state.tokens.get(hash(first)).expires-state.tokens.get(hash(first)).created===1800000);
 assert(mail.at(-1).text.includes('https://sukhadholidays.in/admin/reset-password#token='));
 assert.equal((await service.inspectAdminResetToken({token:first})).valid,true);
 const before=mail.length;await request('request',{email:emails[0]});assert.equal(mail.length,before);
 const unknown=await request('request',{email:'unlisted@example.invalid'});assert.equal(unknown.status,200);assert.equal((await unknown.json()).message,ack.message);assert.equal(mail.length,before);
 await request('request',{email:emails[1]});assert(mail.at(-1).to===emails[1]);
 state.tokens.get(hash(first)).expires=Date.now()-1;assert.equal((await service.inspectAdminResetToken({token:first})).reason,'expired');
 await assert.rejects(service.confirmAdminPasswordReset({token:first,password:nextPassword,confirmation:nextPassword}));assert(await verifyPassword(password,state.users[0].password_hash));
 state.tokens.get(hash(first)).expires=Date.now()+60000;state.sessions.set('fixture',state.users[0].user_id);
 const results=await Promise.allSettled([service.confirmAdminPasswordReset({token:first,password:nextPassword,confirmation:nextPassword}),service.confirmAdminPasswordReset({token:first,password:nextPassword,confirmation:nextPassword})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(state.sessions.size,0);assert(await verifyPassword(nextPassword,state.users[0].password_hash));assert.equal(state.users[0].role,'OWNER');
 assert.equal((await service.inspectAdminResetToken({token:first})).valid,false);await assert.rejects(service.confirmAdminPasswordReset({token:first,password,confirmation:password}));
 state.tokens.clear();await request('request',{email:emails[0]});const replaced=tokenFromMail();state.tokens.get(hash(replaced)).created-=120000;await request('request',{email:emails[0]});const latest=tokenFromMail();
 assert.equal((await service.inspectAdminResetToken({token:replaced})).valid,false);state.users[0].is_active=false;assert.equal((await service.inspectAdminResetToken({token:latest})).valid,false);await assert.rejects(service.confirmAdminPasswordReset({token:latest,password,confirmation:password}));state.users[0].is_active=true;
 state.tokens.clear();sendError={code:'EENVELOPE',responseCode:550,response:password};const notSubmitted=await request('request',{email:emails[0]});assert.equal(notSubmitted.status,200);assert.equal((await notSubmitted.json()).message,ack.message);assert.equal(state.tokens.size,0);assert(logs.some(l=>l.event==='admin_reset_email_result'&&l.status==='failed'&&l.code==='EENVELOPE'));sendError=undefined;
 verifyError={code:'EAUTH',responseCode:535,response:smtpPassword};auditFailure=true;
 for(const email of [emails[0],'unlisted@example.invalid']){const response=await request('request',{email});assert.equal(response.status,503);assert((await response.json()).error.includes('Email service'));}
 assert(logs.some(l=>l.stage==='authentication'&&l.code==='EAUTH'));auditFailure=false;verifyError=undefined;
 const origin=process.env.CAB_SITE_ORIGIN;process.env.CAB_SITE_ORIGIN='http://sukhadholidays.in';assert.equal((await request('request',{email:emails[0]})).status,503);process.env.CAB_SITE_ORIGIN=origin;
 const invalid=await request('validate',{token:'invalid'});assert.equal((await invalid.json()).valid,false);
 assert.equal((await request('request',{email:emails[0]},'https://other.invalid')).status,403);
 databaseError={code:'ER_NO_SUCH_TABLE',sqlMessage:'private database diagnostic '+password};assert.equal((await request('request',{email:emails[0]})).status,503);assert(logs.some(l=>l.event==='admin_reset_failure'&&l.code==='ER_NO_SUCH_TABLE'));databaseError=undefined;
 const client=load('src/lib/auth/password-reset-client'),calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({message:'Acknowledged'});};
 await client.passwordResetApi('request',{email:emails[0]});await client.passwordResetApi('validate',{token:latest});await client.passwordResetApi('confirm',{token:latest,password,confirmation:password});
 assert(calls.every(c=>c.options.method==='POST'&&!c.url.includes(latest)));assert(calls[0].url==='/api/cab/password-reset/request');
 globalThis.fetch=async()=>Response.json({error:'Unavailable',requestId:randomUUID()},{status:503});await assert.rejects(client.passwordResetApi('request',{email:emails[0]}),/Reference:/);
 for(const secret of [password,nextPassword,smtpPassword,process.env.CAB_SESSION_SECRET,...emails,first,replaced,latest])assert(!JSON.stringify(logs).includes(secret),'Diagnostics must not include sensitive values');
 originalInfo('PASS isolated admin password reset: shared SMTP/origin checks, TLS/sender policy, both approved recipients, uniform acknowledgements, cooldown, hashed 30-minute tokens, expiry/replacement/concurrent single use, password/session persistence, failed-send invalidation, correlated diagnostics and client references. SMTP and database are simulated; no real email sent.');
}finally{console.info=originalInfo;console.warn=originalWarn;globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
