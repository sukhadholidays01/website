import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { getDatabasePool } from "@/lib/db";
import { CabError } from "./security";
import type { PublicCabBooking, CabEvent, CabPayment } from "./types";
import { routingProvider } from "./routing";
import { emailConfiguration } from "./notifications";
import { paymentConfiguration } from "./payments";
const decode=<T>(value:unknown,fallback:T):T=>value==null?fallback:typeof value==="string"?JSON.parse(value):value as T;
const ledger="LEFT JOIN (SELECT booking_id,SUM(CASE WHEN payment_mode='mock' THEN 0 WHEN payment_type='receipt' THEN amount ELSE -amount END) paid,MAX(CASE WHEN payment_mode='mock' OR LOWER(method) LIKE '%test%' THEN 1 ELSE 0 END) test_payment FROM payments GROUP BY booking_id) p ON p.booking_id=b.booking_id";
const realFinancial="b.development_flag=FALSE AND COALESCE(p.test_payment,0)=0";
const fare="CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(b.fare_snapshot,'$.total')),'null') AS DECIMAL(14,2))";
const advance="CAST(JSON_UNQUOTE(JSON_EXTRACT(co.commercial_payload,'$.advances[last].amount')) AS DECIMAL(14,2))";
export async function operationsBootstrap(role:string){
  const db=getDatabasePool(),[rows]=await db.execute<RowDataPacket[]>("SELECT setting_key,setting_value FROM website_settings WHERE setting_key IN ('cab_config','cab_operations_settings','cab_operations_revision')");
  const settings=new Map(rows.map(r=>[r.setting_key,decode(r.setting_value,null)]));
  const [vehicles]=await db.query<RowDataPacket[]>("SELECT vehicle_payload FROM vehicles ORDER BY vehicle_id"),[drivers]=await db.query<RowDataPacket[]>("SELECT driver_payload FROM drivers ORDER BY driver_id"),[routes]=await db.query<RowDataPacket[]>("SELECT route_payload FROM cab_routes ORDER BY route_id");
  return {role,storage:"mysql",asOf:Date.now(),bookings:[],config:settings.get('cab_config')||{revision:1,manual:[],automatic:[]},operations:{revision:Number(settings.get('cab_operations_revision')||1),settings:settings.get('cab_operations_settings'),vehicles:vehicles.map(r=>decode(r.vehicle_payload,null)),drivers:drivers.map(r=>decode(r.driver_payload,null)),routes:routes.map(r=>decode(r.route_payload,null)),paymentAttempts:[],notifications:[]},integrations:{email:emailConfiguration(),payment:paymentConfiguration(),routing:{configured:routingProvider().name!=="demo",geocodingConfigured:process.env.CAB_GEOCODING_PROVIDER==="mapbox"||Boolean(process.env.CAB_GEOCODER_URL)}}};
}
export async function queryBookings(params:URLSearchParams){
  const f=z.object({q:z.string().trim().max(100).default(""),status:z.string().max(30).default("ALL"),trip:z.string().max(30).default("ALL"),payment:z.enum(["ALL","UNPAID","PARTIAL","PAID","ADVANCE_PENDING","UNASSIGNED","UPCOMING","FAILED","PENDING","RECONCILIATION_REQUIRED"]).default("ALL"),from:z.iso.date().optional(),to:z.iso.date().optional(),route:z.string().max(100).default(""),driver:z.string().max(100).default(""),vehicle:z.string().max(100).default(""),page:z.coerce.number().int().min(1).max(100000).default(1),size:z.coerce.number().int().min(1).max(50).default(15)}).parse(Object.fromEntries(params));
  if(f.from&&f.to&&f.from>f.to)throw new CabError("Date range is invalid.");
  const conditions:string[]=[],values:(string|number|Date)[]=[];
  if(f.q){conditions.push("(b.booking_reference LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(b.journey_snapshot,'$.origin.label')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(b.journey_snapshot,'$.destination.label')) LIKE ?)");values.push(...Array(5).fill('%'+f.q+'%'));}
  if(f.status!=="ALL"){conditions.push("b.booking_status=?");values.push(f.status);}
  if(f.route){conditions.push("b.route_id=?");values.push(f.route);}
  if(f.trip!=="ALL"){conditions.push("b.trip_type=?");values.push(f.trip);}
  if(f.from){conditions.push("b.departure_at>=?");values.push(new Date(f.from+'T00:00:00+05:30'));}
  if(f.to){conditions.push("b.departure_at<?");values.push(new Date(new Date(f.to+'T00:00:00+05:30').getTime()+86400000));}
  for(const [key,value] of [["driverId",f.driver],["vehicleId",f.vehicle]])if(value){conditions.push("JSON_UNQUOTE(JSON_EXTRACT(b.assignment_snapshot,?))=?");values.push('$.'.concat(key),value);}
  if(["FAILED","PENDING","RECONCILIATION_REQUIRED"].includes(f.payment)){conditions.push("EXISTS (SELECT 1 FROM payment_attempts pa WHERE pa.booking_id=b.booking_id AND pa.attempt_status=?)");values.push(f.payment);}
  if(f.payment==="UNPAID")conditions.push("COALESCE(p.paid,0)<=0");
  if(f.payment==="PARTIAL")conditions.push(`p.paid>0 AND p.paid<${fare}`);
  if(f.payment==="PAID")conditions.push(`p.paid>=${fare} AND p.paid>0`);
  if(f.payment==="ADVANCE_PENDING")conditions.push(`${advance}>COALESCE(p.paid,0) AND JSON_EXTRACT(co.commercial_payload,'$.advances[last].requestedAt') IS NOT NULL AND JSON_EXTRACT(co.commercial_payload,'$.advances[last].cancelledAt') IS NULL AND b.booking_status<>'CANCELLED'`);
  if(f.payment==="UNASSIGNED")conditions.push("b.booking_status='CONFIRMED' AND b.assignment_snapshot IS NULL");
  if(f.payment==="UPCOMING")conditions.push("b.departure_at>=UTC_TIMESTAMP(3) AND b.booking_status NOT IN ('CANCELLED','COMPLETED')");
  const from=" FROM bookings b JOIN customers c ON c.customer_id=b.customer_id LEFT JOIN cab_booking_commercial co ON co.booking_id=b.booking_id "+ledger+(conditions.length?' WHERE '+conditions.join(' AND '):'');
  const db=getDatabasePool(),[count]=await db.execute<RowDataPacket[]>("SELECT COUNT(*) total"+from,values);
  const [items]=await db.query<RowDataPacket[]>(`SELECT b.booking_id id,b.development_flag development,COALESCE(p.test_payment,0) testPayment,c.full_name customer,c.phone,b.trip_type trip,b.booking_status status,b.departure_at departure,${fare} total,COALESCE(p.paid,0) paid,b.vehicle_category category,JSON_UNQUOTE(JSON_EXTRACT(b.journey_snapshot,'$.origin.label')) origin,JSON_UNQUOTE(JSON_EXTRACT(b.journey_snapshot,'$.destination.label')) destination,JSON_UNQUOTE(JSON_EXTRACT(b.assignment_snapshot,'$.driver')) driver,JSON_UNQUOTE(JSON_EXTRACT(b.assignment_snapshot,'$.vehicle')) vehicle`+from+" ORDER BY b.created_at DESC,b.booking_id LIMIT ? OFFSET ?",[...values,f.size,(f.page-1)*f.size]);
  return {items:items.map(r=>({...r,total:r.total===null?null:Number(r.total),paid:Number(r.paid),development:Boolean(r.development),testPayment:Number(r.testPayment)})),total:Number(count[0].total),page:f.page,size:f.size};
}
export async function operationalBooking(id:string):Promise<PublicCabBooking>{
  const db=getDatabasePool(),[rows]=await db.execute<RowDataPacket[]>("SELECT b.*,c.full_name,c.email,c.phone FROM bookings b JOIN customers c ON c.customer_id=b.customer_id WHERE b.booking_id=?",[id]);if(!rows[0])throw new CabError("Booking not found.",404);const r=rows[0];
  const [payments]=await db.execute<RowDataPacket[]>("SELECT * FROM payments WHERE booking_id=? ORDER BY paid_at",[id]);const [history]=await db.execute<RowDataPacket[]>("SELECT * FROM booking_status_history WHERE booking_id=? ORDER BY event_sequence",[id]);
  return {id,createdAt:new Date(r.created_at).toISOString(),updatedAt:new Date(r.updated_at).toISOString(),journey:decode(r.journey_snapshot,null)!,route:decode(r.route_snapshot,null),fare:decode(r.fare_snapshot,null)!,status:r.booking_status,acceptedVersion:r.accepted_version||undefined,customer:{name:r.full_name,email:r.email,phone:r.phone,notes:r.customer_notes},assignment:decode(r.assignment_snapshot,undefined),payments:payments.map(p=>({id:p.payment_id,amount:Number(p.amount),type:p.payment_type,method:p.method,reference:p.reference,note:p.note,mode:p.payment_mode,at:new Date(p.paid_at).toISOString()} as CabPayment)),history:history.map(h=>({at:new Date(h.created_at).toISOString(),actor:h.actor_type,message:h.message,statusFrom:h.status_from||undefined,statusTo:h.status_to||undefined} as CabEvent)),development:Boolean(r.development_flag)};
}
export async function operationsOverview(){
  const db=getDatabasePool();const [metrics]=await db.query<RowDataPacket[]>(`SELECT COUNT(*) total,COALESCE(SUM(CASE WHEN ${realFinancial} THEN p.paid ELSE 0 END),0) collected,SUM(b.departure_at>=UTC_TIMESTAMP(3) AND b.booking_status IN ('CONFIRMED','ASSIGNED')) upcoming,SUM(b.booking_status='REQUESTED') requests,SUM(b.booking_status='QUOTED') quotations,SUM(b.booking_status='ACCEPTED') accepted,SUM(b.booking_status='CONFIRMED') confirmed,SUM(b.booking_status IN ('ASSIGNED','IN_PROGRESS')) active,SUM(b.booking_status='COMPLETED') completed,SUM(b.booking_status='CANCELLED') cancelled,SUM(b.booking_status='CONFIRMED' AND b.assignment_snapshot IS NULL) unassigned,SUM(${advance}>COALESCE(p.paid,0) AND JSON_EXTRACT(co.commercial_payload,'$.advances[last].requestedAt') IS NOT NULL AND JSON_EXTRACT(co.commercial_payload,'$.advances[last].cancelledAt') IS NULL AND b.booking_status<>'CANCELLED') advancePending,COALESCE(SUM(CASE WHEN ${realFinancial} AND JSON_EXTRACT(co.commercial_payload,'$.advances[last].requestedAt') IS NOT NULL THEN LEAST(COALESCE(${advance},0),GREATEST(COALESCE(p.paid,0),0)) ELSE 0 END),0) advanceCollected,COALESCE(SUM(CASE WHEN ${realFinancial} AND b.booking_status IN ('CONFIRMED','ASSIGNED','IN_PROGRESS','COMPLETED') THEN GREATEST(COALESCE(${fare},0)-COALESCE(p.paid,0),0) ELSE 0 END),0) outstanding FROM bookings b LEFT JOIN cab_booking_commercial co ON co.booking_id=b.booking_id ${ledger}`);
  const [fleet]=await db.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM drivers WHERE JSON_EXTRACT(driver_payload,'$.active')=TRUE AND JSON_EXTRACT(driver_payload,'$.approved')=TRUE AND JSON_UNQUOTE(JSON_EXTRACT(driver_payload,'$.availability'))='available') drivers,(SELECT COUNT(*) FROM vehicles WHERE JSON_EXTRACT(vehicle_payload,'$.active')=TRUE AND JSON_UNQUOTE(JSON_EXTRACT(vehicle_payload,'$.availability'))='available') vehicles,(SELECT COUNT(*) FROM payment_attempts WHERE attempt_status IN ('FAILED','RECONCILIATION_REQUIRED')) failures");
  return {metrics:{...Object.fromEntries(Object.entries(metrics[0]).map(([k,v])=>[k,Number(v||0)])),...Object.fromEntries(Object.entries(fleet[0]).map(([k,v])=>[k,Number(v||0)]))},recent:await queryBookings(new URLSearchParams({size:'6'})),asOf:new Date().toISOString(),currency:'INR'};
}
