import type { Metadata } from "next";
import { HolidayDiscovery } from "@/components/holidays/HolidayDiscovery";
export const metadata: Metadata = {
  title: "Holiday Packages | Sukhad Holidays",
  description:
    "Discover journeys across India and beyond. Explore destinations and thoughtfully planned sample holiday packages.",
};
export default async function HolidaysPage({ searchParams }: { searchParams: Promise<{ destination?: string }> }) { const params = await searchParams;
  return <HolidayDiscovery initialSearch={typeof params.destination === "string" ? params.destination : ""} />;
}

