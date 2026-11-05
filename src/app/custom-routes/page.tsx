import type { Metadata } from "next";
import { CustomRoutePlanner } from "@/components/custom-routes/CustomRoutePlanner";
export const metadata: Metadata = { title: "Custom Travel Routes | Sukhad Holidays", description: "Build your own multi-stop journey and prepare a personalised itinerary enquiry with Sukhad Holidays." };
export default async function CustomRoutesPage({ searchParams }: { searchParams: Promise<{ origin?: string }> }) { const params = await searchParams; return <CustomRoutePlanner initialOrigin={typeof params.origin === "string" ? params.origin.slice(0,80) : undefined} />; }

