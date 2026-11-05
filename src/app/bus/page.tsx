import type { Metadata } from "next";
import { BusExperience } from "@/components/bus/BusExperience";
export const metadata: Metadata = {
  title: "Bus Journeys | Sukhad Holidays",
  description:
    "Explore intercity demo bus journeys, compare coach comforts and choose preferred seats for your travel enquiry.",
};
export default function BusPage() {
  return <BusExperience />;
}
