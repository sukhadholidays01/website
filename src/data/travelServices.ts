import type { BookingType } from "@/types";

export interface HomeTravelService {
  id: BookingType;
  title: string;
  line: string;
  detail: string;
  href: `/${string}`;
  image: string;
  imageAlt: string;
  size: "wide" | "tall" | "compact";
}

export const homeTravelServices: readonly HomeTravelService[] = [
  { id: "flights", title: "Flights", line: "Fly further.", detail: "Domestic + International", href: "/flights", image: "/images/domestic/delhi.webp", imageAlt: "Delhi city viewed during a journey", size: "wide" },
  { id: "holidays", title: "Holiday Packages", line: "Make time for memories.", detail: "Curated, enquiry-led journeys", href: "/holidays", image: "/images/domestic/rishikesh.webp", imageAlt: "Mountain and river landscape in Rishikesh", size: "tall" },
  { id: "bus", title: "Bus", line: "The road is yours.", detail: "Point-to-point and group travel", href: "/bus", image: "/images/hero/himalayan-road-trip.webp", imageAlt: "A scenic road journey through the mountains", size: "compact" },
  { id: "cabs", title: "Cabs", line: "Take the scenic route.", detail: "Local, airport and outstation", href: "/cabs", image: "/images/vehicles/sedan.webp", imageAlt: "Sedan available for a road journey", size: "compact" },
] as const;
