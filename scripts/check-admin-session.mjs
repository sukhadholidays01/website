import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes, randomUUID} from 'node:crypto';
import {serverModuleLoader} from './server-module-loader.mjs';
import {hashPassword} from '../src/lib/auth/passwords.mjs';
import {spawnSync} from 'node:child_process';
import {checkAdminEnvironment} from './check-admin-environment.mjs';

// No dotenv, sockets or database: real auth/session logic against isolated SQL boundaries.
const saved={...process.env},logs=[],jar=new Map(),cookieOptions=new Map(),sessions=new Map(),buckets=new Map();
const originalError=console.error,originalFetch=globalThis.fetch;
const emails=[`${randomUUID()}@example.invalid`,`${randomUUID()}@example.invalid`];
const password=randomBytes(24).toString('hex');
let databaseFailure,sqlCalls=0;
const users=[];
async function execute(sql,args=[]){
  sqlCalls++;
  if(databaseFailure)throw databaseFailure;
  if(sql.startsWith('SELECT user_id, password_hash'))return [users.filter(u=>u.email===args[0])];
  if(sql.startsWith('INSERT INTO cab_admin_sessions')){sessions.set(args[0],{userId:args[1],expires:args[2]});return [{affectedRows:1}];}
  if(sql.startsWith('DELETE FROM cab_admin_sessions')){sessions.delete(args[0]);return [{affectedRows:1}];}
  if(sql.includes('JOIN users u ON u.user_id = s.user_id')){
    const s=sessions.get(args[0]),u=users.find(u=>u.user_id===s?.userId);
    return [s&&s.expires>Date.now()&&u?.is_active?[{role:u.role,email:u.email}]:[]];
  }
  if(sql.startsWith('INSERT INTO cab_rate_limits')){if(!buckets.has(args[0]))buckets.set(args[0],{request_count:0,expires_at:args[1]});return [{affectedRows:1}];}
  if(sql.startsWith('SELECT request_count'))return [[buckets.get(args[0])]];
  if(sql.startsWith('UPDATE cab_rate_limits')){buckets.set(args[2],{request_count:args[0],expires_at:args[1]});return [{affectedRows:1}];}
  throw Error('Unexpected SQL operation in isolated test');
}
const pool={execute,getConnection:async()=>({execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release(){}})};
const cookies={get:key=>jar.has(key)?{value:jar.get(key)}:undefined,set:(key,value,options)=>{jar.set(key,value);cookieOptions.set(key,options);},delete:key=>jar.delete(key)};
const store={cabStorageMode:()=> 'mysql',changeCabState:()=>{throw Error('Cab state mutation is forbidden in this test');}};
try{
  const validEnvironment={ADMIN_EMAIL_1:' '+emails[0].toUpperCase()+' ',ADMIN_EMAIL_2:emails[1],CAB_SESSION_SECRET:randomBytes(32).toString('hex')};
  assert.deepEqual(checkAdminEnvironment(validEnvironment),{ok:true,authorisedAddressCount:2,sessionSigningSecretConfigured:true});
  for(const [secret,problem] of [[undefined,'CAB_SESSION_SECRET_MISSING'],['','CAB_SESSION_SECRET_MISSING'],['x'.repeat(31),'CAB_SESSION_SECRET_TOO_SHORT']]){
    assert.deepEqual(checkAdminEnvironment({...validEnvironment,CAB_SESSION_SECRET:secret}),{ok:false,code:'ADMIN_SESSION_CONFIGURATION',configurationProblems:[problem]});
  }
  assert.equal(checkAdminEnvironment({...validEnvironment,CAB_SESSION_SECRET:'x'.repeat(32)}).ok,true);
  for(const environment of [{},{NEXT_PUBLIC_ADMIN_EMAIL_1:emails[0],NEXT_PUBLIC_ADMIN_EMAIL_2:emails[1]},{ADMIN_EMAILS:emails.join(',')},{ADMIN_EMAIL_1:emails.join(','),ADMIN_EMAIL_2:emails[1]},{ADMIN_EMAIL_1:'"'+emails[0]+'"',ADMIN_EMAIL_2:emails[1]},{ADMIN_EMAIL_1:emails[0],ADMIN_EMAIL_2:emails[0].toUpperCase()}]){
    const result=checkAdminEnvironment(environment);assert.equal(result.ok,false);assert.equal(result.code,'ADMIN_ALLOWLIST_CONFIGURATION');assert(!JSON.stringify(result).includes(emails[0]));
  }
  const cliEnvironment={...process.env,ADMIN_EMAIL_1:emails[0],ADMIN_EMAIL_2:emails[1],CAB_SESSION_SECRET:validEnvironment.CAB_SESSION_SECRET};
  for(const valid of [true,false]){
    const environment={...cliEnvironment};if(!valid){delete environment.ADMIN_EMAIL_1;delete environment.ADMIN_EMAIL_2;}
    const run=spawnSync(process.execPath,['scripts/check-admin-environment.mjs','--production','--process-only'],{encoding:'utf8',env:environment,windowsHide:true});
    assert(run.status===(valid?0:1),'Preflight must reject missing process variables even when .env.local is present');
    const result=JSON.parse(run.stdout);assert.equal(result.ok,valid);assert.equal(result.loading,'process-only');
    assert(!run.stdout.includes(emails[0]));assert(!run.stdout.includes(emails[1]));
  }
  for(const secret of ['', 'x'.repeat(31)]){
    const run=spawnSync(process.execPath,['scripts/check-admin-environment.mjs','--production','--process-only'],{encoding:'utf8',env:{...cliEnvironment,CAB_SESSION_SECRET:secret},windowsHide:true});
    assert.equal(run.status,1);assert.equal(JSON.parse(run.stdout).code,'ADMIN_SESSION_CONFIGURATION');
    assert(!run.stdout.includes(validEnvironment.CAB_SESSION_SECRET));
  }
  Object.assign(process.env,{NODE_ENV:'production',ADMIN_EMAIL_1:emails[0],ADMIN_EMAIL_2:emails[1],CAB_SESSION_SECRET:randomBytes(48).toString('hex'),CAB_SITE_ORIGIN:'https://admin-test.invalid',DB_HOST:'isolated.invalid',DB_USER:'fixture',DB_PASSWORD:'fixture-only',DB_NAME:'isolated_dev',DB_PORT:'3306'});
  const encoded=await hashPassword(password);
  users.push(...emails.map((email,i)=>({user_id:randomUUID(),email,password_hash:encoded,role:i?'DISPATCHER':'OWNER',is_active:true})));
  const boundaries={'@/lib/db':{getDatabasePool:()=>pool},'@/lib/cab/store':store,'./store':store,'next/headers':{cookies:async()=>cookies},'next/server':{NextResponse:{next:()=>new Response(null,{status:200}),redirect:url=>Response.redirect(url,307)}}};
  const load=serverModuleLoader(boundaries);
  const login=load('src/app/api/admin/login/route').POST,session=load('src/app/api/admin/session/route').GET,logout=load('src/app/api/admin/logout/route').POST;
  const security=load('src/lib/cab/security'),{proxy}=load('src/proxy');
  const request=(path,body)=>new Request('https://admin-test.invalid/api/admin/'+path,{method:'POST',headers:{Origin:'https://admin-test.invalid','Content-Type':'application/json','x-forwarded-for':randomUUID()},body:JSON.stringify(body||{})});
  const protectedRequest=()=>({url:'https://admin-test.invalid/admin',nextUrl:new URL('https://admin-test.invalid/admin'),cookies});
  console.error=message=>logs.push(JSON.parse(message));
  assert.equal((await session()).status,200);assert.equal((await (await session()).json()).authenticated,false);
  const before=sqlCalls,failuresBefore=logs.length;
  for(const key of ['ADMIN_EMAIL_1','ADMIN_EMAIL_2','CAB_SESSION_SECRET','DB_HOST','DB_NAME','DB_PORT']){
    const previous=process.env[key];process.env[key]=key==='DB_PORT'?'invalid':'';
    const response=await session();assert.equal(response.status,200);
    const result=await response.json();assert.equal(result.authenticated,false);assert.equal(result.role,null);
    assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-request-id'),result.requestId);
    process.env[key]=previous;
  }
  databaseFailure={code:'ECONNREFUSED'};
  assert.equal((await session()).status,200);databaseFailure=undefined;
  const customerCookie=readFileSync('src/lib/auth/customer.ts','utf8').match(/export const customerCookie="([^"]+)"/)?.[1];
  assert(customerCookie);jar.set(customerCookie,'synthetic-customer-session');jar.set('cab_driver_session','synthetic-driver-session');
  assert.equal((await (await session()).json()).authenticated,false);jar.clear();
  assert.equal(sqlCalls,before,'No-cookie session discovery must not query any database');
  assert.equal(logs.length,failuresBefore,'Normal logged-out visitors must not generate infrastructure failure logs');
  assert.equal((await proxy(protectedRequest())).status,307);
  for(let i=0;i<2;i++){
    const response=await login(request('login',{email:' '+emails[i].toUpperCase()+' ',password}));
    assert.equal(response.status,200);const result=await response.json();assert.equal(result.role,users[i].role);assert.match(result.requestId,/^[a-f0-9-]{36}$/);assert.equal(response.headers.get('x-request-id'),result.requestId);
    const token=jar.get('cab_ops_session');assert(token);assert(!sessions.has(token));
    // A fresh module instance retains sessions with the same key and persisted store.
    const freshSecurity=serverModuleLoader(boundaries)('src/lib/cab/security');assert.equal(await freshSecurity.validateAdminSession(token),users[i].role);
    const signingSecret=process.env.CAB_SESSION_SECRET;process.env.CAB_SESSION_SECRET=randomBytes(32).toString('hex');
    assert.equal(await freshSecurity.validateAdminSession(token),null);process.env.CAB_SESSION_SECRET=signingSecret;
    assert.equal(await freshSecurity.validateAdminSession(token),users[i].role);
    assert.deepEqual(cookieOptions.get('cab_ops_session'),{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:28800});
    assert.equal((await (await session()).json()).authenticated,true);assert.equal((await proxy(protectedRequest())).status,200);
    if(i)await assert.rejects(security.requireCabPermission('finance'));
    assert.equal((await logout(request('logout'))).status,200);assert.equal(cookieOptions.get('cab_ops_session').maxAge,0);
    jar.set('cab_ops_session',token);assert.equal((await (await session()).json()).authenticated,false);jar.clear();
  }
  assert.equal((await login(request('login',{email:'unlisted@example.invalid',password}))).status,401);
  assert.equal((await login(request('login',{email:emails[0],password:'wrong-password'}))).status,401);
  assert.equal((await login(request('login',{password}))).status,401);
  assert.equal((await login(new Request('https://admin-test.invalid/api/admin/login',{method:'POST',headers:{Origin:'https://other.invalid'},body:'{}'}))).status,403);
  assert.equal((await login(request('login',{email:emails[0],password}))).status,200);
  const token=jar.get('cab_ops_session');
  for(const role of ['OWNER','DISPATCHER','ACCOUNTANT','VIEWER']){
    users[0].role=role;assert.equal(await security.cabAdminRole(),role);
    for(const permission of ['read','dispatch','finance','settings']){
      const allowed=permission==='read'||role==='OWNER'||(role==='DISPATCHER'&&permission==='dispatch')||(role==='ACCOUNTANT'&&permission==='finance');
      if(allowed)assert.equal(await security.requireCabPermission(permission),role);else await assert.rejects(security.requireCabPermission(permission));
    }
  }
  users[0].role='CUSTOMER';assert.equal((await (await session()).json()).authenticated,false);users[0].role='OWNER';
  users[0].is_active=false;assert.equal((await (await session()).json()).authenticated,false);users[0].is_active=true;
  process.env.ADMIN_EMAIL_1='removed@example.invalid';assert.equal((await (await session()).json()).authenticated,false);process.env.ADMIN_EMAIL_1=emails[0];
  sessions.get(security.hash(token)).expires=new Date(0);assert.equal((await (await session()).json()).authenticated,false);assert.equal((await proxy(protectedRequest())).status,307);
  jar.set('cab_ops_session',token+'tampered');assert.equal((await (await session()).json()).authenticated,false);jar.clear();
  for(const [key,value,code] of [['ADMIN_EMAIL_2','', 'ADMIN_ALLOWLIST_CONFIGURATION'],['ADMIN_EMAIL_2',emails[0].toUpperCase(),'ADMIN_ALLOWLIST_CONFIGURATION'],['CAB_SESSION_SECRET','short','ADMIN_SESSION_CONFIGURATION'],['DB_NAME','','DATABASE_CONFIGURATION'],['DB_PORT','bad','DATABASE_CONFIGURATION']]){
    const previous=process.env[key];process.env[key]=value;const response=await login(request('login',{email:emails[0],password}));assert.equal(response.status,503);assert.equal(logs.at(-1).code,code);assert.equal(logs.at(-1).stage,'configuration');assert.equal(logs.at(-1).requestId,(await response.json()).requestId);process.env[key]=previous;
  }
  for(const [key,value,problem] of [['ADMIN_EMAIL_1','','ADMIN_EMAIL_1_MISSING'],['ADMIN_EMAIL_2','   ','ADMIN_EMAIL_2_MISSING'],['ADMIN_EMAIL_1','not-an-address','ADMIN_EMAIL_1_INVALID'],['ADMIN_EMAIL_2','not-an-address','ADMIN_EMAIL_2_INVALID'],['ADMIN_EMAIL_2',emails[0].toUpperCase(),'ADMIN_EMAILS_DUPLICATE']]){
    const previous=process.env[key],queriesBefore=sqlCalls;process.env[key]=value;
    const response=await login(request('login',{email:emails[0],password}));assert.equal(response.status,503);
    assert.deepEqual(logs.at(-1).configurationProblems,[problem]);assert.equal(sqlCalls,queriesBefore,'Invalid allowlist must fail before database access');
    const body=await response.json();assert.equal(body.configurationProblems,undefined);assert.equal(body.requestId,logs.at(-1).requestId);
    process.env[key]=previous;
  }
  for(const [secret,problem] of [['','CAB_SESSION_SECRET_MISSING'],['x'.repeat(31),'CAB_SESSION_SECRET_TOO_SHORT']]){
    const previous=process.env.CAB_SESSION_SECRET,queriesBefore=sqlCalls;process.env.CAB_SESSION_SECRET=secret;
    const response=await login(request('login',{email:emails[0],password}));assert.equal(response.status,503);
    assert.equal(logs.at(-1).code,'ADMIN_SESSION_CONFIGURATION');assert.equal(logs.at(-1).stage,'configuration');assert.deepEqual(logs.at(-1).configurationProblems,[problem]);
    assert.equal(sqlCalls,queriesBefore);const body=await response.json();assert.equal(body.requestId,logs.at(-1).requestId);assert.equal(body.configurationProblems,undefined);
    process.env.CAB_SESSION_SECRET=previous;
  }
  databaseFailure={code:'ER_NO_SUCH_TABLE',sqlMessage:"Table 'private_database.users' doesn't exist"};
  assert.equal((await login(request('login',{email:emails[0],password}))).status,503);assert.equal(logs.at(-1).table,'users');assert.equal(logs.at(-1).operation,'admin_login');
  databaseFailure={code:'ER_BAD_FIELD_ERROR',sqlMessage:'secret payload '+password};
  assert.equal((await login(request('login',{email:emails[0],password}))).status,503);assert.equal(logs.at(-1).code,'ER_BAD_FIELD_ERROR');
  jar.set('cab_ops_session',token);const unavailable=await session();assert.equal(unavailable.status,503);assert.equal(logs.at(-1).operation,'admin_session_check');assert.equal(logs.at(-1).stage,'session_lookup');assert.equal(logs.at(-1).requestId,(await unavailable.json()).requestId);
  assert.equal((await logout(request('logout'))).status,503);assert.equal(logs.at(-1).operation,'admin_logout');assert.equal(logs.at(-1).stage,'session_revoke');assert.equal(jar.get('cab_ops_session'),token);
  databaseFailure=undefined;
  const logged=JSON.stringify(logs);for(const secret of [password,token,process.env.DB_PASSWORD,process.env.CAB_SESSION_SECRET,...emails,'private_database'])assert(!logged.includes(secret));

  for(const file of ['src/components/admin/StaffLogin.tsx','src/components/admin/AdminSessionProvider.tsx','src/components/cabs/CabOperationsWorkspace.tsx']){
    const source=readFileSync(file,'utf8');assert(!/cabApi(?:<[^;]*?>)?\(\s*["']session["']/.test(source),file);assert(source.includes('adminApi'));
  }
  const client=load('src/lib/auth/admin-client'),calls=[];
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({authenticated:true});};
  await client.adminApi('session');await client.adminApi('login',{method:'POST',body:{email:emails[0],password}});await client.adminApi('logout',{method:'POST'});
  assert.deepEqual(calls.map(c=>[c.url,c.options.method]),[['/api/admin/session','GET'],['/api/admin/login','POST'],['/api/admin/logout','POST']]);
  globalThis.fetch=async()=>Response.json({error:'Unavailable',requestId:randomUUID()},{status:503});await assert.rejects(client.adminApi('session'),/Reference:/);
  globalThis.fetch=async()=>new Response('<html>Unavailable</html>',{status:502});await assert.rejects(client.adminApi('session'),/Admin service/);
  const legacy=readFileSync('src/app/api/cab/[...path]/route.ts','utf8');assert(legacy.includes('return adminLogin(request)'));assert(legacy.includes('return adminSession()'));assert(legacy.includes('return adminLogout(request)'));assert(legacy.includes('route === "driver/session"'));
  console.log('PASS no-cookie session discovery without configuration/database dependencies; dedicated admin routes and client transport; both isolated allowlisted accounts; real password hashing; role permissions; protected admin proxy; logout/replay/expiry/tampering; origin and configuration guards; safe correlated stage/database diagnostics; legacy cab delegation preserved. No database or network access.');
}finally{
  console.error=originalError;globalThis.fetch=originalFetch;
  for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);
}
