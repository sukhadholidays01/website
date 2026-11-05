import type { Metadata } from "next";
import { FlightExperience } from "@/components/flights/FlightExperience";
export const metadata: Metadata = {
  title: "Domestic & International Flights | Sukhad Holidays",
  description:
    "Explore demo flight itineraries and prepare a travel enquiry with Sukhad Holidays.",
};
export default function FlightsPage() {
  return <FlightExperience />;
}
