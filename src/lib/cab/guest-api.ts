import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDatabasePool } from "@/lib/db";
import { cabOperationsActor, privateJson, readBody, requireCabPermission, limitRequest, hash } from "./security";
import { bookingPolicies } from "./guest-policies";
import { readGuestPolicy, guestPolicySchema } from "./guest-policy";
import { exchangePrivateLink, guestSession, guestCookie, setGuestCookie, requestGuestOtp, verifyGuestOtp, revokeGuestAccess } from "./guest-access";
import { bookingFoundation, acceptBookingPolicies, uploadBookingDocument, reviewDocument, requireBookingId, downloadTicket, downloadDocument, purgeExpiredDocuments } from "./guest-documents";
import { guestTransaction, guestAudit } from "./guest-repository";
import { readCabState, changeCabState } from "./store";
import { getBooking, publicBooking } from "./service";
import { queueCabEmail } from "./notifications";
import type { CabBooking } from "./types";
export function customerVisibleBooking(booking: CabBooking, assurance: "link"|"otp") {
  const value=publicBooking(booking);
  const {routeId,packageId,...journey}=value.journey;void routeId;void packageId;
  return {...value,journey,fare:{...value.fare,...(assurance==="link"?{total:null,lines:[],inclusions:"Verify your registered mobile to view quotation details.",exclusions:""}:{}),version:assurance==="otp"?value.fare.version:""},customer:{name:value.customer.name,phone:assurance==="otp"?value.customer.phone:"Verified mobile required",email:assurance==="otp"?value.customer.email:"Verified mobile required",notes:assurance==="otp"?value.customer.notes:""},payments:assurance==="otp"?value.payments.map((p,index)=>({...p,id:"receipt-"+(index+1),note:""})):[],assignment:value.assignment?{driver:value.assignment.driver,phone:value.assignment.phone,vehicle:value.assignment.vehicle,onWayAt:value.assignment.onWayAt}:undefined,history:value.history.filter(h=>h.statusTo||h.message==="Driver is on the way to pickup.").map(h=>({...h,message:h.statusTo?"Booking status: "+h.statusTo.replaceAll("_"," "):"Driver is on the way to pickup."}))};
}
export async function guestReadAccess(request: Request, bookingId: string, sensitive=false) {
  try { return await guestSession(bookingId,sensitive); }
  catch(error) {
    if(sensitive)throw error;
    const legacy=request.headers.get("authorization")?.replace(/^Bearer /,"");
    if(!legacy)throw error;
    const session=await exchangePrivateLink(bookingId,legacy);await setGuestCookie(session);return "link" as const;
  }
}
export async function handleGuestApi(request:Request,parts:string[]):Promise<Response|null> {
  const route=parts.join("/"),method=request.method;
  if(route==="guest/policies"&&method==="GET")return privateJson({policies:bookingPolicies,documentPolicy:await readGuestPolicy()});
  if(route==="guest/otp/request"&&method==="POST")return privateJson(await requestGuestOtp(request,await readBody(request)));
  if(route==="guest/otp/verify"&&method==="POST"){
    await limitRequest(request,"guest-otp-verify",12,15*60000);const result=await verifyGuestOtp(await readBody(request));await setGuestCookie(result.token);return privateJson({bookingId:result.bookingId,verified:true});
  }
  if(route==="guest/link/exchange"&&method==="POST"){
    await limitRequest(request,"guest-link",15,15*60000);const body=z.object({reference:z.string().min(1).max(80),token:z.string().regex(/^[a-f0-9]{64}$/)}).parse(await readBody(request));await setGuestCookie(await exchangePrivateLink(body.reference,body.token));return privateJson({authenticated:true,assurance:"link"});
  }
  if(route==="guest/logout"&&method==="POST"){
    const token=(await cookies()).get(guestCookie)?.value||"";await getDatabasePool().execute("UPDATE cab_guest_grants SET revoked=TRUE WHERE token_hash=? AND grant_kind='session'",[hash(token)]);(await cookies()).delete(guestCookie);return privateJson({signedOut:true});
  }
  if(parts[0]==="guest"&&parts[1]==="bookings"&&parts[2]){
    const id=z.string().min(1).max(80).parse(parts[2]),action=parts[3];
    const assurance=await guestReadAccess(request,id,Boolean(action));
    if(parts.length===3&&method==="GET"){
      const b=getBooking(await readCabState(),id),foundation=await bookingFoundation(id);
      return privateJson({booking:customerVisibleBooking(b,assurance),assurance,requirements:{idRequired:foundation.idRequired,policy:foundation.policy,storageConfigured:foundation.storageConfigured},...(assurance==="otp"?{documents:foundation.documents,consents:foundation.consents}:{})});
    }
    if(action==="consents"&&method==="POST"){await acceptBookingPolicies(id,await readBody(request));return privateJson({saved:true});}
    if(action==="request-link"&&method==="POST"){
      await limitRequest(request,"guest-send-link",3,3600000);await changeCabState(state=>queueCabEmail(state,getBooking(state,id),"access-link"));return privateJson({message:"Tracking-link email queued under the configured sending policy. Sending a replacement will revoke previous links and sessions."});
    }
    if(action==="documents"){
      await limitRequest(request,"guest-documents",15,60000);
      if(parts.length===4&&method==="POST")return privateJson(await uploadBookingDocument(request,id),201);
      if(parts.length===4&&method==="GET")return privateJson(await bookingFoundation(id));
      const doc=z.string().uuid().parse(parts[4]);const binding=hash((await cookies()).get(guestCookie)?.value||"");
      if(parts[5]==="ticket"&&method==="POST")return privateJson({ticket:downloadTicket(id,doc,binding),expiresIn:60});
      if(parts.length===5&&method==="GET")return downloadDocument(id,doc,request.headers.get("x-document-ticket")||"",binding,"CUSTOMER");
    }
  }
  if(route==="admin/guest-policy"){
    const role=await requireCabPermission("settings");
    if(method==="GET")return privateJson({policy:await readGuestPolicy()});
    if(method==="PUT"){
      await limitRequest(request,"admin-guest-policy",10);
      const policy=guestPolicySchema.parse(await readBody(request));await guestTransaction(async db=>{await db.execute("INSERT INTO website_settings (setting_key,setting_value,is_public) VALUES ('cab_guest_policy',?,FALSE) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",[JSON.stringify(policy)]);await guestAudit(db,"cab_guest_policy","UPDATED_GUEST_POLICY",role);});return privateJson({saved:true});
    }
  }
  if(route==="admin/guest-retention"&&method==="POST"){const role=await requireCabPermission("settings");await limitRequest(request,"admin-guest-retention",3);return privateJson(await purgeExpiredDocuments(role));}
  if(parts[0]==="admin"&&parts[1]==="guest"&&parts[2]){
    const role=await requireCabPermission("dispatch"),id=z.string().max(80).parse(parts[2]);
    await limitRequest(request,"admin-guest-review",30);
    if(parts.length===3&&method==="GET"){
      const [events]=await getDatabasePool().execute("SELECT action,actor_role,created_at FROM cab_audit_log WHERE entity_id=? AND (action LIKE '%GUEST%' OR action LIKE '%PRIVATE%' OR action LIKE '%ID%' OR action LIKE '%CONSENT%') ORDER BY created_at DESC LIMIT 30",[id]);
      return privateJson({...await bookingFoundation(id),accessEvents:events});
    }
    if(parts[3]==="require-id"&&method==="POST"){await requireBookingId(id,role);return privateJson({required:true});}
    if(parts[3]==="revoke"&&method==="POST"){await revokeGuestAccess(id,role);return privateJson({revoked:true});}
    if(parts[3]==="send-link"&&method==="POST"){await changeCabState(state=>queueCabEmail(state,getBooking(state,id),"access-link"));return privateJson({queued:true});}
    if(parts[3]==="documents"){
      const doc=z.string().uuid().parse(parts[4]),binding=hash((await cookies()).get("cab_ops_session")?.value||"");
      if(parts[5]==="review"&&method==="POST"){const actor=await cabOperationsActor("dispatch"),body=await readBody(request);await reviewDocument(id,doc,body,role,actor.userId);return privateJson({saved:true});}
      if(parts[5]==="ticket"&&method==="POST")return privateJson({ticket:downloadTicket(id,doc,binding),expiresIn:60});
      if(parts.length===5&&method==="GET")return downloadDocument(id,doc,request.headers.get("x-document-ticket")||"",binding,role);
    }
  }
  return null;
}
