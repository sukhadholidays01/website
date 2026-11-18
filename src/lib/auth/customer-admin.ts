import "server-only";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { getDatabasePool } from "@/lib/db";
import { CabError } from "@/lib/cab/security";
import { customerProfile } from "./customer";

const profileColumns="account_id,full_name,email,email_verified,account_status,created_at,last_login_at";
export async function listCustomerAccounts(params:URLSearchParams) {
  const input=z.object({q:z.string().trim().max(100).default(""),verified:z.enum(["all","yes","no"]).default("all"),page:z.coerce.number().int().min(1).max(10000).default(1)}).parse(Object.fromEntries(params));
  const search=input.q.replace(/[!%_]/g,v=>"!"+v),values:(string|boolean)[]=[];
  let where="1=1";
  if(search){where+=" AND (full_name LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!')";values.push(`%${search}%`,`%${search}%`);}
  if(input.verified!=="all"){where+=" AND email_verified=?";values.push(input.verified==="yes");}
  const db=getDatabasePool();
  const [count]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) total FROM customer_accounts WHERE ${where}`,values);
  const [rows]=await db.execute<RowDataPacket[]>(`SELECT ${profileColumns} FROM customer_accounts WHERE ${where} ORDER BY created_at DESC,account_id LIMIT 25 OFFSET ${(input.page-1)*25}`,values);
  return {customers:rows.map(customerProfile),total:Number(count[0].total),page:input.page,pageSize:25};
}
export async function customerAccountDetail(id:string) {
  z.string().uuid().parse(id);
  const [rows]=await getDatabasePool().execute<RowDataPacket[]>(`SELECT ${profileColumns} FROM customer_accounts WHERE account_id=?`,[id]);
  if(!rows[0])throw new CabError("Customer account not found.",404);
  return customerProfile(rows[0]);
}
const kinds="('customer_registered','customer_first_login','customer_login')";
export async function customerActivity(userId:string) {
  const db=getDatabasePool();
  const [rows]=await db.execute<RowDataPacket[]>(`SELECT n.notification_id,n.subject,n.text_body,n.created_at,r.read_at FROM notifications n LEFT JOIN notification_reads r ON r.notification_id=n.notification_id AND r.user_id=? WHERE n.audience='admin' AND n.notification_kind IN ${kinds} ORDER BY n.created_at DESC,n.notification_id LIMIT 25`,[userId]);
  const [count]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) unread FROM notifications n LEFT JOIN notification_reads r ON r.notification_id=n.notification_id AND r.user_id=? WHERE n.audience='admin' AND n.notification_kind IN ${kinds} AND r.notification_id IS NULL`,[userId]);
  return {unread:Number(count[0].unread),notifications:rows.map(row=>{
    let customerId="";try{customerId=JSON.parse(row.text_body).customerId;}catch{/* Omit invalid metadata. */}
    return {id:row.notification_id,title:row.subject,createdAt:new Date(row.created_at).toISOString(),read:Boolean(row.read_at),href:z.string().uuid().safeParse(customerId).success?`/admin/customers/${customerId}`:"/admin/customers"};
  })};
}
export async function readCustomerActivity(userId:string,body:unknown) {
  const {id}=z.object({id:z.string().uuid()}).strict().parse(body);
  await getDatabasePool().execute(`INSERT IGNORE INTO notification_reads (notification_id,user_id) SELECT notification_id,? FROM notifications WHERE notification_id=? AND audience='admin' AND notification_kind IN ${kinds}`,[userId,id]);
  return {read:true};
}
