import { z } from 'zod';
export const jobTypes = ['OUTBOX','QUOTE_EXPIRY','REMINDER','PAYMENT_RECOVERY','RETENTION'] as const;
export type JobType = typeof jobTypes[number];
const id = z.string().min(1).max(100);
export const payloadSchemas = {
  OUTBOX: z.object({ notificationId:id }).strict(),
  QUOTE_EXPIRY: z.object({ bookingId:id,versionHash:z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  REMINDER: z.object({ bookingId:id,departure:z.string().max(40),kind:z.enum(['customer','preparation','action']),policyVersion:z.string().uuid() }).strict(),
  PAYMENT_RECOVERY: z.object({ attemptId:id }).strict(),
  RETENTION: z.object({ documentId:z.string().uuid(),bookingId:id }).strict(),
};
export type JobPayload = Record<string,string>;
export class JobFailure extends Error {
  constructor(public category:string,public retryable:boolean,public summary='Operational processing requires review.',public retryAfter=0) {super(summary);}
}
export function safeJobFailure(error:unknown) {
  if(error instanceof JobFailure)return error;
  const e=error as {code?:string;status?:number;providerHttpStatus?:number};
  if(e?.providerHttpStatus&&e.providerHttpStatus>=400&&e.providerHttpStatus<500&&e.providerHttpStatus!==429)return new JobFailure('PROVIDER_REJECTED',false,'Provider rejected reconciliation; review configuration or association.');
  if(['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT','ECONNRESET','ETIMEDOUT','ECONNREFUSED'].includes(e?.code||''))return new JobFailure('TEMPORARY',true,'Temporary connection or lock failure.');
  if(e?.status===502||e?.status===503||e?.status===429)return new JobFailure('PROVIDER_UNAVAILABLE',true,'Provider or storage is temporarily unavailable.');
  return new JobFailure('REVIEW_REQUIRED',false);
}
export const automationPolicySchema=z.object({
  customer:z.boolean().default(false),preparation:z.boolean().default(false),action:z.boolean().default(false),
  hours:z.number().int().min(1).max(168).default(24),
}).strict();
export type AutomationPolicy = z.infer<typeof automationPolicySchema> & {version:string};
