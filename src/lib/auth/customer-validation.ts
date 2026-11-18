import { z } from "zod";

export const customerEmail = z.string().trim().email("Enter a valid email address.").max(190).transform(v=>v.toLowerCase());
export const customerPassword = z.string().min(16,"Use at least 16 characters.").max(128,"Use at most 128 characters.")
  .regex(/[a-z]/,"Include a lowercase letter.").regex(/[A-Z]/,"Include an uppercase letter.").regex(/[0-9]/,"Include a number.");
export const customerSignup = z.object({
  fullName: z.string().trim().min(2,"Enter your full name.").max(100).regex(/^[^\u0000-\u001f\u007f]+$/,"Enter a valid name."),
  email: customerEmail, password: customerPassword, confirmation: z.string(), consent: z.literal(true,{error:"Accept the terms and privacy policy to continue."}),
}).strict().refine(v=>v.password===v.confirmation,{path:["confirmation"],message:"Passwords do not match."});
export const customerLogin = z.object({email:customerEmail,password:z.string().min(1,"Enter your password.").max(128)}).strict();
export const customerToken = z.string().regex(/^[a-f0-9]{64}$/,"This verification link is invalid or expired.");
export function safeCustomerReturn(value: unknown) {
  if (typeof value!=="string" || !/^\/(?!\/)/.test(value) || /[\\\s\u0000-\u001f]/.test(value)) return "/account";
  try {
    const url=new URL(value,"https://customer.invalid");
    if(url.origin!=="https://customer.invalid")return "/account";
    const allowed=["/","/account","/cabs","/holidays","/flights","/bus","/custom-routes","/contact"];
    return allowed.includes(url.pathname)||/^\/holidays\/[a-z0-9-]+$/.test(url.pathname)?url.pathname+url.search:"/account";
  } catch { return "/account"; }
}
export interface CustomerProfile {
  id:string; name:string; email:string; verified:boolean; status:string;
  createdAt:string; lastLoginAt:string|null;
}
