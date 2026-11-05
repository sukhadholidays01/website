import type { TravelImage, TravelScope } from "@/types";

export type DestinationCardSize = "large" | "medium" | "small";

export interface HomeDestination extends TravelImage {
  id: string;
  name: string;
  descriptor: string;
  scope: TravelScope;
  size: DestinationCardSize;
  href: string;
  isDemo: true;
}

export const homeDestinations: readonly HomeDestination[] = [
  {
    id: "ayodhya",
    name: "Ayodhya",
    descriptor: "Sacred stories and timeless ghats",
    location: "Uttar Pradesh, India",
    scope: "domestic",
    size: "large",
    href: "/holidays/ayodhya",
    src: "/images/destinations/ayodhya.webp",
    alt: "The riverfront and temples of Ayodhya at sunset",
    title: "Ayodhya",
    category: "pilgrimage",
    isDemo: true,
  },
  {
    id: "jaipur",
    name: "Jaipur",
    descriptor: "Palaces, craft and royal colour",
    location: "Rajasthan, India",
    scope: "domestic",
    size: "small",
    href: "/holidays/jaipur",
    src: "/images/destinations/jaipur.webp",
    alt: "Historic architecture in Jaipur",
    title: "Jaipur",
    category: "heritage",
    isDemo: true,
  },
  {
    id: "varanasi",
    name: "Varanasi",
    descriptor: "An ancient city alive with ritual",
    location: "Uttar Pradesh, India",
    scope: "domestic",
    size: "medium",
    href: "/holidays/varanasi",
    src: "/images/destinations/varanasi.webp",
    alt: "Varanasi ghats beside the River Ganges",
    title: "Varanasi",
    category: "pilgrimage",
    isDemo: true,
  },
  {
    id: "goa",
    name: "Goa",
    descriptor: "Slow mornings by the Arabian Sea",
    location: "Goa, India",
    scope: "domestic",
    size: "small",
    href: "/holidays",
    src: "/images/domestic/goa.webp",
    alt: "A calm tropical beach in Goa",
    title: "Goa",
    category: "beaches",
    isDemo: true,
  },
  {
    id: "dubai",
    name: "Dubai",
    descriptor: "Modern skylines and desert horizons",
    location: "United Arab Emirates",
    scope: "international",
    size: "large",
    href: "/holidays#international",
    src: "/images/international/dubai.webp",
    alt: "Dubai waterfront skyline at dusk",
    title: "Dubai",
    category: "cities",
    isDemo: true,
  },
  {
    id: "singapore",
    name: "Singapore",
    descriptor: "A city made for family discovery",
    location: "Singapore",
    scope: "international",
    size: "small",
    href: "/holidays#international",
    src: "/images/international/singapore.webp",
    alt: "Singapore skyline beside Marina Bay",
    title: "Singapore",
    category: "cities",
    isDemo: true,
  },
  {
    id: "maldives",
    name: "Maldives",
    descriptor: "Clear lagoons and unhurried days",
    location: "Maldives",
    scope: "international",
    size: "medium",
    href: "/holidays#international",
    src: "/images/international/maldives.webp",
    alt: "Turquoise lagoon and island coast in the Maldives",
    title: "Maldives",
    category: "beaches",
    isDemo: true,
  },
  {
    id: "bali",
    name: "Bali",
    descriptor: "Island rituals and green escapes",
    location: "Indonesia",
    scope: "international",
    size: "small",
    href: "/holidays#international",
    src: "/images/international/bali.webp",
    alt: "Lush tropical landscape in Bali",
    title: "Bali",
    category: "experiences",
    isDemo: true,
  },
] as const;

export const destinationNames = {
  domestic: ["Ayodhya", "Varanasi", "Jaipur", "Delhi", "Agra", "Lucknow", "Rishikesh", "Manali", "Goa", "Udaipur", "Kerala", "Mumbai"],
  international: ["Dubai", "Singapore", "Bali", "Maldives", "Thailand", "Malaysia", "Switzerland", "Paris", "London", "Turkey"],
} as const;

