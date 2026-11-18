import "server-only";
import {queryBookings,operationalBooking,operationsOverview,operationsBootstrap} from "./operations-query";
import { z } from "zod";
import { cabOperationsActor, requireCabPermission, limitRequest, privateJson, readBody, CabError } from "./security";
import { changeCabState, readCabState } from "./store";
import { getBooking } from "./service";
import { configureAdvance, advanceSummary, commercialState, openPayment, advancePolicySchema } from "./commercial";
import { queueCabEmail, queueOperationalReminders, processCabEmails } from "./notifications";
import { auditCab } from "./tracking";
import { guestReadAccess } from "./guest-api";
export async function handleCommercialApi(request:Request,parts:string[]):Promise<Response|null>{
  const route=parts.join("/"),method=request.method;
  if(route==="admin/operations-reminders"&&method==="POST"){const actor=await cabOperationsActor("dispatch");await limitRequest(request,"operations-reminders",3);const {hours}=z.object({hours:z.number().int().min(1).max(168)}).parse(await readBody(request));const considered=await changeCabState(s=>{const count=queueOperationalReminders(s,hours);auditCab(s,actor.role,"Queued reminders by "+actor.userId,"operations-reminders");return count;});return privateJson({considered,message:"Eligible events queued or already present. Delivery follows the existing outbox policy."});}
  if(route==="admin/bootstrap"&&method==="GET")return privateJson(await operationsBootstrap(await requireCabPermission("read")));
  if(route==="admin/quotation-preview"&&method==="POST"){
    await requireCabPermission("dispatch");await limitRequest(request,"quotation-preview",30);
    const {lines}=z.object({lines:z.array(z.object({label:z.string().trim().min(1).max(100),amount:z.number().finite().min(-10000000).max(10000000).multipleOf(0.01)})).min(1).max(20)}).strict().parse(await readBody(request));
    const amount=Math.round(lines.reduce((sum,line)=>sum+line.amount,0)*100)/100;
    if(amount<=0||amount>10000000)throw new CabError("Quotation total must be positive and within limits.");
    return privateJson({amount,lines});
  }
  if(route==="admin/operations-overview"&&method==="GET"){const role=await requireCabPermission("read");return privateJson({...await operationsOverview(),role});}
  if(parts[0]==="admin"&&parts[1]==="operations-bookings"&&method==="GET"){await requireCabPermission("read");return privateJson(parts[2]?{booking:await operationalBooking(parts[2])}:await queryBookings(new URL(request.url).searchParams));}
  if(route==="admin/advance-policy"){
    const actor=await cabOperationsActor("settings");
    if(method==="GET")return privateJson({policy:(await readCabState()).operations.settings.advancePolicy||null});
    if(method==="PUT"){await limitRequest(request,"advance-policy",10);const policy=advancePolicySchema.parse(await readBody(request));await changeCabState(state=>{state.operations.settings.advancePolicy=policy;state.operations.revision++;auditCab(state,actor.role,"Advance policy saved by "+actor.userId,"advance-policy");});return privateJson({saved:true});}
  }
  if(parts[0]==="admin"&&parts[1]==="commercial"&&parts[2]){
    const id=z.string().min(1).max(80).parse(parts[2]);
    if(parts.length===3&&method==="GET"){await requireCabPermission("read");const state=await readCabState(),b=getBooking(state,id);return privateJson({commercial:b.commercial||{quotations:[],advances:[],assignments:[],notes:[]},summary:advanceSummary(b,state)});}
    const actor=await cabOperationsActor(["advance","cancel-advance"].includes(parts[3])?"finance":"dispatch");await limitRequest(request,"commercial-mutation",20);
    const body=await readBody(request);
    if(parts[3]==="advance"&&method==="POST"){
      const result=await changeCabState(state=>{const b=getBooking(state,id),result=configureAdvance(state,b,body,actor);auditCab(state,actor.role,"Advance revision "+result.revision+" by "+actor.userId,id);if(result.requestedAt)queueCabEmail(state,b,"advance-requested");return advanceSummary(b,state);});await processCabEmails(id).catch(()=>console.warn("cab_advance_notification_processing_unconfirmed"));return privateJson(result);
    }
    if(parts[3]==="cancel-advance"&&method==="POST"){
      const {reason}=z.object({reason:z.string().trim().min(5).max(500)}).parse(body);
      await changeCabState(state=>{const b=getBooking(state,id),a=b.commercial?.advances.at(-1);if(!a||a.cancelledAt||openPayment(state,id))throw new CabError("Reconcile the payable order before cancelling this request.",409);a.cancelledAt=new Date().toISOString();commercialState(b).notes.push({at:a.cancelledAt,actor,text:reason,customerVisible:false});auditCab(state,actor.role,"Cancelled advance by "+actor.userId,id);});return privateJson({cancelled:true});
    }
    if(parts[3]==="note"&&method==="POST"){
      const input=z.object({text:z.string().trim().min(3).max(1500),customerVisible:z.boolean().default(false)}).strict().parse(body);
      await changeCabState(state=>{const b=getBooking(state,id);commercialState(b).notes.push({...input,actor,at:new Date().toISOString()});auditCab(state,actor.role,"Booking note by "+actor.userId,id);if(input.customerVisible)queueCabEmail(state,b,"status");});return privateJson({saved:true});
    }
    if(parts[3]==="driver-confirmed"&&method==="POST"){
      await changeCabState(state=>{const b=getBooking(state,id);if(b.status!=="ASSIGNED")throw new CabError("Assign a driver first.",409);if(!commercialState(b).driverConfirmedAt)commercialState(b).driverConfirmedAt=new Date().toISOString();auditCab(state,actor.role,"Driver confirmation recorded by "+actor.userId,id);});return privateJson({saved:true});
    }
  }
  if(parts[0]==="guest"&&parts[1]==="commercial"&&parts[2]&&method==="GET"){
    await guestReadAccess(request,parts[2],true);const state=await readCabState(),b=getBooking(state,parts[2]);
    return privateJson({summary:advanceSummary(b,state),quotations:b.commercial?.quotations.map(q=>({number:q.number,version:q.version,vehicle:q.vehicle,fare:q.fare,notes:q.notes,createdAt:q.createdAt,expiresAt:q.expiresAt,expired:Date.parse(q.expiresAt)<=Date.now(),acceptedAt:q.acceptedAt}))||[],updates:b.commercial?.notes.filter(n=>n.customerVisible).map(n=>({at:n.at,text:n.text}))||[]});
  }
  return null;
}
