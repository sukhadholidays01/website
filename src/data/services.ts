import type { Service } from "@/types";

export const services: readonly Service[] = [
  {
    id: "service-cabs",
    title: "Cabs",
    description: "Reliable journeys for local and outstation travel.",
    icon: "CarFront",
    href: "/cabs",
    bookingType: "cabs",
  },
  {
    id: "service-hotels",
    title: "Hotel Booking",
    description: "Stay arrangements to complement your journey.",
    icon: "Hotel",
    href: "/contact",
  },
  {
    id: "service-flights",
    title: "Flight Tickets",
    description: "Flight ticket assistance for your travel plans.",
    icon: "Plane",
    href: "/flights",
    bookingType: "flights",
  },
  {
    id: "service-group-travel",
    title: "Group Travel",
    description: "Comfortable transportation planning for group journeys.",
    icon: "UsersRound",
    href: "/contact",
  },
  {
    id: "service-pilgrimage",
    title: "Pilgrimage Tours",
    description: "Meaningful journeys to spiritual destinations.",
    icon: "Landmark",
    href: "/holidays",
    bookingType: "holidays",
  },
  {
    id: "service-heritage",
    title: "Heritage Tours",
    description: "Journeys shaped around India's cultural heritage.",
    icon: "MapPinned",
    href: "/holidays",
    bookingType: "holidays",
  },
];

export const enquiryCategories = Array.from(
  new Set(["Holiday Packages", "Bus", ...services.map((service) => service.title)]),
);
