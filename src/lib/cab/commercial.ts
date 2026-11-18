import { randomUUID } from "node:crypto";
import { z } from "zod";
import { CabError, hash } from "./security";
import { cabBalance, type CabBooking, type CabState } from "./types";
import type { AdvancePolicy, OperationsActor, CommercialState } from "./commercial-types";
import { advancePolicySchema } from "./commercial-validation";
export { advancePolicySchema } from "./commercial-validation";
export const commercialState = (b:CabBooking):CommercialState => b.commercial ||= {quotations:[],advances:[],assignments:[],notes:[]};
export function openPayment(state:CabState,id:string){return state.operations.paymentAttempts.some(a=>a.bookingId===id&&a.provider==="razorpay"&&["CREATING","PENDING","FAILED","RECONCILIATION_REQUIRED"].includes(a.status));}
export function quoteCurrent(b:CabBooking){const q=b.commercial?.quotations.at(-1);if(q&&q.version!==b.fare.version)throw new CabError("Quotation state needs review.",409);return q;}
export function assertQuoteValid(b:CabBooking){const q=quoteCurrent(b);if(q&&Date.parse(q.expiresAt)<=Date.now())throw new CabError("This quotation has expired. Request a revised quotation.",409);}
export function currentAdvance(b:CabBooking){return b.commercial?.advances.at(-1);}
export function advanceSummary(b:CabBooking,state:CabState){
  const a=currentAdvance(b),balance=cabBalance(b);if(!a)return{status:"NOT_CONFIGURED",balance,assignmentState:assignmentState(b,state)};
  const attempts=state.operations.paymentAttempts.filter(p=>p.bookingId===b.id&&p.context?.advanceId===a.id),latest=attempts.at(0);
  const remaining=Math.max(0,Math.round((a.amount-balance.paid)*100)/100);
  const status=latest?.status==="REFUNDED"?"REFUNDED":remaining===0?"ADVANCE_PAID":a.cancelledAt?"CANCELLED":a.deadline&&Date.parse(a.deadline)<=Date.now()?"EXPIRED":latest?.status==="FAILED"?"FAILED":balance.paid>0?"PARTIALLY_PAID":latest&&["CREATING","PENDING","RECONCILIATION_REQUIRED"].includes(latest.status)?"PENDING":a.requestedAt?"REQUESTED":"CONFIGURED";
  return {status,balance,assignmentState:assignmentState(b,state),advance:{id:a.id,revision:a.revision,quoteVersion:a.quoteVersion,total:a.quotationAmount,amount:a.amount,remaining,currency:a.currency,mode:a.mode,value:a.value,deadline:a.deadline,requestedAt:a.requestedAt}};
}
const advanceInput=z.object({requestKey:z.string().uuid().optional(),expectedRevision:z.number().int().min(0).optional(),mode:z.enum(["percent","fixed"]).optional(),value:z.number().finite().positive().multipleOf(0.01).max(10000000).optional(),reason:z.string().trim().min(5).max(500),deadline:z.string().datetime().optional(),request:z.boolean().default(false)}).strict();
export function configureAdvance(state:CabState,b:CabBooking,input:unknown,actor:OperationsActor){
  const p=advanceInput.parse(input);
  if(p.requestKey){const existing=b.commercial?.advances.find(a=>a.requestKey===p.requestKey);if(existing){if(existing.requestHash!==hash(JSON.stringify(p)))throw new CabError("Advance key was reused with different details.",409);return existing;}}
  if(p.expectedRevision!==undefined&&p.expectedRevision!==(b.commercial?.advances.at(-1)?.revision||0))throw new CabError("Advance request changed while editing. Reload before revising it.",409);
  if(!state.operations.settings.advancePolicy)throw new CabError("An owner must configure the advance policy first.",409);
  const policy=advancePolicySchema.parse(state.operations.settings.advancePolicy);
  if(b.status!=="CONFIRMED"||b.fare.total===null||b.acceptedVersion!==b.fare.version)throw new CabError("Confirm the accepted quotation before configuring an advance.",409);
  if(openPayment(state,b.id))throw new CabError("Reconcile the existing payable order before changing its advance request.",409);
  if(Boolean(p.mode)!==(p.value!==undefined))throw new CabError("Provide both override mode and value, or neither.");
  const mode=p.mode||policy.mode,value=p.value??policy.value;
  if(!policy.allowOverride&&(mode!==policy.mode||value!==policy.value))throw new CabError("Per-booking overrides are disabled.",403);
  if(mode==="percent"&&value>policy.maximumPercent)throw new CabError("Advance exceeds the configured percentage limit.");
  const amount=Math.round((mode==="percent"?b.fare.total*value/100:value)*100)/100;
  if(amount<policy.minimum||amount>b.fare.total||(policy.maximum!==null&&amount>policy.maximum)||amount>b.fare.total*policy.maximumPercent/100)throw new CabError("Advance is outside the configured limits or exceeds the approved quotation.");
  if(p.deadline&&Date.parse(p.deadline)<=Date.now())throw new CabError("Payment deadline must be in the future.");
  const history=commercialState(b).advances;
  const next={requestKey:p.requestKey,requestHash:hash(JSON.stringify(p)),id:randomUUID(),revision:history.length+1,quoteVersion:b.fare.version,quotationAmount:b.fare.total,mode,value,amount,currency:"INR" as const,policy:structuredClone(policy),actor,createdAt:new Date().toISOString(),reason:p.reason,...(p.deadline?{deadline:p.deadline}:{}),...(p.request?{requestedAt:new Date().toISOString()}: {})};
  history.push(next);b.updatedAt=next.createdAt;return next;
}
export function assertAdvanceCollection(state:CabState,b:CabBooking,stage:"assignment"|"dispatch"){
  const a=currentAdvance(b),policy:AdvancePolicy|undefined=a?.policy||state.operations.settings.advancePolicy;
  if(!policy?.required||!(stage==="assignment"?policy.beforeAssignment:policy.beforeDispatch))return;
  if(!a||a.quoteVersion!==b.fare.version||cabBalance(b).paid+0.001<a.amount)throw new CabError("The required verified advance must be collected before "+stage+".",409);
}

export function assignmentState(b:CabBooking,state:CabState){if(b.status==="COMPLETED")return "COMPLETED";if(!b.assignment)return "NOT_ASSIGNED";const driver=state.operations.drivers.find(d=>d.id===b.assignment?.driverId),vehicle=state.operations.vehicles.find(v=>v.id===b.assignment?.vehicleId);if(!driver?.active||!driver.approved||driver.availability!=="available"||!vehicle?.active||vehicle.availability!=="available")return "REASSIGNMENT_REQUIRED";return b.commercial?.driverConfirmedAt?"DRIVER_CONFIRMED":"ASSIGNED";}
