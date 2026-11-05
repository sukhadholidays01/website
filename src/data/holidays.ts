import type { HolidayPackage } from "@/types";

export const holidayPackages: readonly HolidayPackage[] = [
  {
    id: "holiday-ayodhya-essentials",
    title: "Ayodhya Essentials",
    slug: "ayodhya-essentials",
    destination: "ayodhya",
    duration: "3 days / 2 nights",
    price: null,
    image: "/images/destinations/ayodhya.webp",
    imageAvailable: true,
    description: "A thoughtfully paced journey centered on Ayodhya's spiritual heritage.",
    featured: true,
    scope: "domestic",
  },
  {
    id: "holiday-varanasi-essentials",
    title: "Varanasi Essentials",
    slug: "varanasi-essentials",
    destination: "varanasi",
    duration: "3 days / 2 nights",
    price: null,
    image: "/images/destinations/varanasi.webp",
    imageAvailable: true,
    description: "Experience Varanasi's divine ghats and Ganga Aarti.",
    featured: true,
    scope: "domestic",
  },
  {
    id: "holiday-jaipur-essentials",
    title: "Jaipur Essentials",
    slug: "jaipur-essentials",
    destination: "jaipur",
    duration: "4 days / 3 nights",
    price: null,
    image: "/images/destinations/jaipur.webp",
    imageAvailable: true,
    description: "Explore Jaipur through Hawa Mahal and its historic forts.",
    featured: false,
    scope: "domestic",
  },
];

export function getHolidayPackage(slug: string): HolidayPackage | undefined {
  return holidayPackages.find(
    (holiday) => holiday.slug === slug || holiday.destination === slug,
  );
}

export const holidayRouteSlugs = Array.from(
  new Set(holidayPackages.flatMap((holiday) => [holiday.slug, holiday.destination])),
);
