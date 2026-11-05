import type { HolidayPackage } from "@/types";
import type { TravelMoodId } from "@/data/travelMoods";
export interface HolidayDestination {
  slug: string;
  name: string;
  descriptor: string;
  region: string;
  scope: "domestic" | "international";
  image: string;
  moods: readonly TravelMoodId[];
  isDemo: true;
}
export interface JourneyPackage extends HolidayPackage {
  isDemo: true;
  days: number;
  nights: number;
  styles: readonly TravelMoodId[];
  gallery: readonly { src: string; alt: string }[];
  itinerary?: readonly { title: string; description: string }[];
  inclusions?: readonly string[];
  exclusions?: readonly string[];
  notes?: readonly string[];
  travelType?: "Private" | "Group";
  familyFriendly?: boolean;
}
