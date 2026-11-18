import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/auth/customer";
import { CustomerSignOut } from "@/components/auth/CustomerAccountPage";
import "@/components/auth/customer-auth.css";
export const metadata={title:"Your account | Sukhad Holidays",robots:{index:false,follow:false}};
export default async function AccountPage() {
  const customer=await currentCustomer();
  if(!customer)redirect("/login?next=%2Faccount");
  const date=(value:string|null)=>value?new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(value)):"Not yet";
  return <section className="customer-auth-stage"><div className="customer-auth-card"><p className="customer-auth-eyebrow">YOUR SUKHAD HOLIDAYS ACCOUNT</p><h1>Hello, {customer.name}.</h1><p className="customer-auth-copy">Your verified customer account.</p><dl className="customer-profile"><div><dt>Email address</dt><dd>{customer.email}</dd></div><div><dt>Email status</dt><dd>Verified</dd></div><div><dt>Account created (IST)</dt><dd>{date(customer.createdAt)}</dd></div><div><dt>Last sign-in (IST)</dt><dd>{date(customer.lastLoginAt)}</dd></div></dl><CustomerSignOut/><p className="customer-auth-switch"><Link href="/">Explore journeys</Link></p></div></section>;
}
