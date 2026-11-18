import nextEnv from '@next/env';
import {setTimeout as sleep} from 'node:timers/promises';
import {serverModuleLoader} from './server-module-loader.mjs';
nextEnv.loadEnvConfig(process.cwd(),process.env.NODE_ENV!=='production',{info(){},error(){}});
const load=serverModuleLoader(),{runBatch}=load('src/lib/jobs/worker'),{scheduleJobs}=load('src/lib/jobs/scheduler'),{executeJob}=load('src/lib/jobs/registry'),{getDatabasePool}=load('src/lib/db');
const shutdown=new AbortController();process.once('SIGTERM',()=>shutdown.abort());process.once('SIGINT',()=>shutdown.abort());
try{
 const limit=Number(process.env.CAB_WORKER_BATCH||10),concurrency=Number(process.env.CAB_WORKER_CONCURRENCY||1);const loop=process.argv.includes('--loop');
 // Development requires explicit opt-in before any existing live sending/provider gates may be used.
 if(process.env.NODE_ENV!=='production'&&!process.argv.includes('--allow-configured-providers')){process.env.CAB_EMAIL_MODE='preview';process.env.CAB_EMAIL_SEND_ENABLED='false';process.env.RAZORPAY_KEY_ID='';}
 if(process.argv.includes('--check')){const [rows]=await getDatabasePool().query('SELECT job_status,COUNT(*) total FROM cab_jobs GROUP BY job_status');console.info(JSON.stringify({event:'worker_configuration_check',queue:rows,processed:0}));}
 else do{await scheduleJobs();console.info(JSON.stringify({event:'worker_batch',...await runBatch(executeJob,{limit,concurrency,signal:shutdown.signal})}));if(!loop||shutdown.signal.aborted)break;await sleep(30000,undefined,{signal:shutdown.signal}).catch(()=>{});}while(!shutdown.signal.aborted);
}catch{console.error(JSON.stringify({event:'worker_failed',category:'OPERATIONAL_FAILURE',summary:'Inspect job history and configuration; no sensitive error logged.'}));process.exitCode=1;}
finally{await getDatabasePool().end();}
