import type { Destination } from "@/types";

export const destinations: readonly Destination[] = [
  {
    id: "destination-ayodhya",
    name: "Ayodhya",
    slug: "ayodhya",
    description: "Shri Ram Mandir and a spiritual heritage journey.",
    region: "Uttar Pradesh",
    travelStyle: "Spiritual & Heritage",
    image: "/images/destinations/ayodhya.webp",
    imageAvailable: true,
    featured: true,
  },
  {
    id: "destination-varanasi",
    name: "Varanasi",
    slug: "varanasi",
    description: "Divine ghats and Ganga Aarti.",
    region: "Uttar Pradesh",
    travelStyle: "Culture & Spirituality",
    image: "/images/destinations/varanasi.webp",
    imageAvailable: true,
    featured: true,
  },
  {
    id: "destination-jaipur",
    name: "Jaipur",
    slug: "jaipur",
    description: "Royal Hawa Mahal and historic forts.",
    region: "Rajasthan",
    travelStyle: "Royal Rajasthan",
    image: "/images/destinations/jaipur.webp",
    imageAvailable: true,
    featured: true,
  },
];
