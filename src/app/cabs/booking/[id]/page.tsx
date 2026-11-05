import type { Metadata } from "next";
import { CabBookingStatus } from "@/components/cabs/CabBookingStatus";
export const metadata: Metadata = {
  title: "Your Cab Booking | Sukhad Holidays",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CabBookingStatus id={(await params).id} />;
}
