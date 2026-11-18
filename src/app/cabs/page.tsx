import type { Metadata } from "next";
import { CabBookingFlow } from "@/components/cabs/CabBookingFlow";
export const metadata: Metadata = {
  title: "Request a Cab | Sukhad Holidays",
  description:
    "Request one-way, round-trip and airport cab transfers. Receive a private booking reference. Our team will contact you to confirm the fare and vehicle availability.",
};
export default async function CabsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const prefill=Object.fromEntries(['from','to','departure','return','tripType','travellers'].map(key=>[key,typeof params[key]==='string'?params[key].slice(0,100):'']));
  return <CabBookingFlow prefill={prefill} />;
}
