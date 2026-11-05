import type { BookingType } from "@/types";

export interface DemoOffer {
  id: string;
  category: Extract<BookingType, "flights" | "holidays" | "cabs">;
  eyebrow: string;
  title: string;
  action: string;
  href: string;
  image: string;
  imageAlt: string;
  isDemo: true;
}

export const demoOffers: readonly DemoOffer[] = [
  {
    id: "weekend-escape",
    category: "holidays",
    eyebrow: "Weekend India",
    title: "Weekend Escapes",
    action: "Explore India",
    href: "/holidays#domestic",
    image: "/images/domestic/goa.webp",
    imageAlt: "Palm-lined Goa beach",
    isDemo: true,
  },
  {
    id: "dubai-getaway",
    category: "holidays",
    eyebrow: "International",
    title: "Dubai Getaway",
    action: "Discover the destination",
    href: "/holidays#international",
    image: "/images/international/dubai.webp",
    imageAlt: "Dubai skyline beside the waterfront",
    isDemo: true,
  },
  {
    id: "cab-escape",
    category: "cabs",
    eyebrow: "Road trip",
    title: "Travel by Cab",
    action: "Plan your road journey",
    href: "/cabs",
    image: "/images/hero/himalayan-road-trip.webp",
    imageAlt: "Scenic mountain road trip",
    isDemo: true,
  },
];
