import { cookies } from "next/headers";
import { z } from "zod";
import { CabError, cabOperationsActor, hash, limitRequest, privateJson, readBody, requireSameOrigin } from "@/lib/cab/security";
import { customerCookie, customerSessionSeconds, currentCustomer, loginCustomer, logoutCustomer, registerCustomer, resendCustomerVerification, verifyCustomerEmail, CustomerAuthError } from "@/lib/auth/customer";
import { customerAccountDetail, customerActivity, listCustomerAccounts, readCustomerActivity } from "@/lib/auth/customer-admin";
import { customerEmail, safeCustomerReturn } from "@/lib/auth/customer-validation";

export const runtime="nodejs";
type Context={params:Promise<{path:string[]}>};
function failure(error:unknown) {
  if(error instanceof z.ZodError)return privateJson({error:error.issues.slice(0,3).map(i=>i.message).join(" "),code:"VALIDATION_ERROR"},400);
  if(error instanceof CabError)return privateJson({error:error.message,code:error instanceof CustomerAuthError?error.code:"REQUEST_ERROR"},error.status);
  // Do not log query errors, request bodies, credentials, emails or tokens.
  return privateJson({error:"Customer account services are temporarily unavailable. Please try again later.",code:"SERVICE_UNAVAILABLE"},503);
}
export async function GET(request:Request,{params}:Context) {
  try {
    const path=(await params).path.join("/");
    if(path==="session") {const customer=await currentCustomer();return customer?privateJson({customer}):privateJson({error:"Sign in to your customer account.",code:"UNAUTHENTICATED"},401);}
    if(path.startsWith("admin/")) {
      const actor=await cabOperationsActor("read");
      if(path==="admin/customers")return privateJson(await listCustomerAccounts(new URL(request.url).searchParams));
      if(path.startsWith("admin/customers/"))return privateJson({customer:await customerAccountDetail(path.slice("admin/customers/".length))});
      if(path==="admin/notifications")return privateJson(await customerActivity(actor.userId));
    }
    return privateJson({error:"Not found."},404);
  } catch(error){return failure(error);}
}
export async function POST(request:Request,{params}:Context) {
  try {
    requireSameOrigin(request);
    const path=(await params).path.join("/");
    if(path==="admin/notifications") {const actor=await cabOperationsActor("read");return privateJson(await readCustomerActivity(actor.userId,await readBody(request)));}
    const limits:Record<string,[number,number]>={register:[5,15*60000],login:[12,15*60000],resend:[5,15*60000],verify:[15,15*60000],logout:[30,60000]};
    if(!limits[path])return privateJson({error:"Not found."},404);
    await limitRequest(request,"customer:"+path,...limits[path]);
    const body=await readBody(request);
    if(["login","resend"].includes(path)) {
      const email=customerEmail.safeParse((body as {email?:unknown})?.email);
      if(email.success)await limitRequest(new Request(request.url,{headers:{"x-forwarded-for":"customer-email"}}),`customer:${path}:email:${hash(email.data)}`,path==="login"?10:3,15*60000);
    }
    if(path==="register")return privateJson(await registerCustomer(body),202);
    if(path==="resend")return privateJson(await resendCustomerVerification(body),202);
    if(path==="verify")return privateJson(await verifyCustomerEmail(body));
    const jar=await cookies();
    if(path==="login") {
      const token=await loginCustomer(body);
      jar.set(customerCookie,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:customerSessionSeconds});
      return privateJson({message:"You are signed in.",redirect:safeCustomerReturn(new URL(request.url).searchParams.get("next"))});
    }
    await logoutCustomer(jar.get(customerCookie)?.value);
    jar.set(customerCookie,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
    return privateJson({message:"You are signed out."});
  } catch(error){return failure(error);}
}
