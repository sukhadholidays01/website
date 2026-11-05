import type { TravelImage } from "@/types";

export const heroTravelImage: TravelImage = {
  src: "/images/hero/himalayan-road-trip.webp",
  alt: "Indian couple beginning a mountain road trip beside an SUV",
  title: "A Road Trip into the Mountains",
  location: "India",
  category: "road-trip",
};

export const internationalTravelImages: readonly TravelImage[] = [
  {
    src: "/images/international/dubai.webp",
    alt: "Indian family exploring Dubai's waterfront skyline at dusk",
    title: "Dubai",
    location: "United Arab Emirates",
    category: "city-escape",
  },
  {
    src: "/images/international/singapore.webp",
    alt: "Indian friends walking beside Singapore's Marina Bay at sunset",
    title: "Singapore",
    location: "Singapore",
    category: "family-city",
  },
  {
    src: "/images/international/maldives.webp",
    alt: "Couple walking beside a turquoise lagoon in the Maldives",
    title: "Maldives",
    location: "Maldives",
    category: "beach-escape",
  },
] as const;

export const futureImageLibrary: readonly TravelImage[] = [
  {
    src: "/images/road-trips/himalayan-road-trip.webp",
    alt: "Indian travelers on a scenic Himalayan road journey",
    title: "Road Trip Through the Himalayas",
    location: "India",
    category: "road-trip",
  },
  {
    src: "/images/families/airport-departure.webp",
    alt: "Indian family preparing for a journey at an airport",
    title: "The Journey Begins",
    location: "India",
    category: "family-travel",
  },
] as const;
