import { holidayPackages } from "@/data/holidays";
import { getHolidayDestination } from "@/data/holidayDestinations";
import type { JourneyPackage } from "@/types/holidays";
import photoCredits from "@/data/holidayPhotoCredits.json";
// Existing source packages are retained verbatim; proposed itineraries are demo content.
const existing: JourneyPackage[] = holidayPackages.map((p) => {
  const d = getHolidayDestination(p.destination)!;
  const days = Number(p.duration.match(/\d+/)?.[0] ?? 3);
  return {
    ...p,
    isDemo: true,
    days,
    nights: days - 1,
    styles: d.moods,
    gallery: [{ src: p.image, alt: d.name + " destination landscape" }],
    itinerary: Array.from({ length: days }, (_, i) => ({
      title:
        i === 0
          ? "Arrive & settle in"
          : i === days - 1
            ? "One last morning"
            : "Explore " + d.name,
      description:
        i === 0
          ? "Arrive at your own pace and get acquainted with the destination."
          : i === days - 1
            ? "Enjoy a leisurely morning before your onward journey."
            : p.description,
    })),
    notes: [
      "Illustrative itinerary, subject to your preferences and final quotation.",
      "Price, accommodation, inclusions and availability will be confirmed by the travel team.",
    ],
  };
});
export const demoHolidayPackages: readonly JourneyPackage[] = [
  {
    id: "demo-ayodhya-river",
    slug: "ayodhya-river-and-rituals",
    title: "Ayodhya: River & Rituals",
    destination: "ayodhya",
    duration: "2 days / 1 night",
    days: 2,
    nights: 1,
    price: 6900,
    image: "/images/destinations/ayodhya.webp",
    imageAvailable: true,
    description:
      "A short spiritual escape with time for temple visits and a quiet evening beside the Sarayu.",
    featured: false,
    scope: "domestic",
    isDemo: true,
    styles: ["spiritual", "weekend"],
    travelType: "Private",
    familyFriendly: true,
    gallery: [
      {
        src: "/images/destinations/ayodhya.webp",
        alt: "Ayodhya riverfront and temples",
      },
    ],
    itinerary: [
      {
        title: "Sacred beginnings",
        description:
          "Arrival, a planned temple visit and an evening stroll beside the Sarayu.",
      },
      {
        title: "A peaceful farewell",
        description: "A gentle morning of local exploration before departure.",
      },
    ],
    inclusions: [
      "One night hotel stay",
      "Local transfers",
      "Sightseeing as outlined",
    ],
    exclusions: [
      "Travel to Ayodhya",
      "Personal expenses",
      "Meals not mentioned",
    ],
    notes: [
      "Illustrative price per person on twin sharing.",
      "Demo package; itinerary and services require confirmation.",
    ],
  },
  ...(["goa", "dubai", "bali"] as const).map((slug, i): JourneyPackage => {
    const d = getHolidayDestination(slug)!;
    const days = [4, 5, 5][i];
    return {
      id: "demo-" + slug,
      slug: slug + "-slow-escape",
      title: d.name + " Slow Escape",
      destination: slug,
      duration: days + " days / " + (days - 1) + " nights",
      days,
      nights: days - 1,
      price: [15900, 42900, 38900][i],
      image: d.image,
      imageAvailable: true,
      description:
        d.descriptor +
        " A thoughtfully paced sample journey with room to make it your own.",
      featured: true,
      scope: d.scope,
      isDemo: true,
      styles: d.moods,
      travelType: "Private",
      familyFriendly: true,
      gallery: [{ src: d.image, alt: d.name + " travel landscape" }],
      itinerary: [
        {
          title: "Arrive & unwind",
          description: "Check in and take the evening at your own pace.",
        },
        ...Array.from({ length: days - 2 }, (_, n) => ({
          title: n === 0 ? "Discover " + d.name : "Time to explore",
          description:
            "A flexible day of local sightseeing and independent exploration.",
        })),
        {
          title: "Until next time",
          description: "A relaxed morning and your departure transfer.",
        },
      ],
      inclusions: [
        days - 1 + " nights hotel accommodation",
        "Arrival and departure transfers",
        "One local sightseeing excursion",
      ],
      exclusions: [
        "Flights and visas",
        "Personal expenses",
        "Meals not mentioned",
      ],
      notes: [
        "Illustrative INR price per person on twin sharing.",
        "Demo itinerary and services; final quote and availability require confirmation.",
      ],
    };
  }),
];
export const journeyPackages: readonly JourneyPackage[] = [
  ...existing,
  ...demoHolidayPackages,
].map((p) => ({
  ...p,
  gallery: [
    ...p.gallery,
    ...photoCredits
      .filter((photo) => photo.destination === p.destination)
      .slice(0, 2)
      .map((photo) => ({ src: photo.src, alt: photo.alt })),
  ],
}));
