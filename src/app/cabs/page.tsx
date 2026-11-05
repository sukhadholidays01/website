import type { Metadata } from "next";
import { CabBookingFlow } from "@/components/cabs/CabBookingFlow";
export const metadata: Metadata = {
  title: "Request a Cab | Sukhad Holidays",
  description:
    "Request one-way, round-trip and airport cab transfers. Receive a private booking reference. Our team will contact you to confirm the fare and vehicle availability.",
};
export default function CabsPage() {
  return <CabBookingFlow />;
}
