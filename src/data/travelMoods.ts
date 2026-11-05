export type TravelMoodId = "couple" | "family" | "adventure" | "spiritual" | "beach" | "heritage" | "weekend" | "mountain" | "luxury" | "wildlife" | "wellness" | "international" | "road-trip" | "honeymoon" | "romantic";

export interface TravelMood {
  id: TravelMoodId;
  label: string;
  prompt: string;
  destinations: readonly string[];
  isDemo: true;
}

export const travelMoods: readonly TravelMood[] = [
  { id: "couple", label: "Couple", prompt: "Quiet escapes for two", destinations: ["Goa", "Udaipur", "Dubai", "Bali", "Maldives"], isDemo: true },
  { id: "family", label: "Family", prompt: "Easy-going days for every generation", destinations: ["Singapore", "Dubai", "Kerala", "Jaipur", "Goa"], isDemo: true },
  { id: "adventure", label: "Adventure", prompt: "More outdoors, more stories", destinations: ["Manali", "Rishikesh", "Thailand"], isDemo: true },
  { id: "spiritual", label: "Spiritual", prompt: "Journeys with a deeper meaning", destinations: ["Ayodhya", "Varanasi", "Prayagraj", "Haridwar", "Rishikesh"], isDemo: true },
  { id: "beach", label: "Beach", prompt: "Salt air and slower schedules", destinations: ["Goa", "Maldives", "Bali", "Kerala", "Thailand"], isDemo: true },
  { id: "heritage", label: "Heritage", prompt: "Cities with centuries of character", destinations: ["Jaipur", "Ayodhya", "Varanasi", "Udaipur", "Agra"], isDemo: true },
  { id: "weekend", label: "Weekend", prompt: "Short breaks, thoughtfully planned", destinations: ["Lucknow", "Delhi", "Agra", "Rishikesh", "Jaipur"], isDemo: true },
  { id: "mountain", label: "Mountain", prompt: "Fresh air and mountain landscapes", destinations: ["Kashmir","Manali","Darjeeling","Switzerland"], isDemo: true },
  { id: "luxury", label: "Luxury", prompt: "Space to slow down", destinations: ["Dubai","Maldives","Udaipur"], isDemo: true },
  { id: "wildlife", label: "Wildlife", prompt: "Discover natural habitats", destinations: ["Kerala","Australia","Sri Lanka"], isDemo: true },
  { id: "wellness", label: "Wellness", prompt: "Time to reset", destinations: ["Rishikesh","Kerala","Bhutan"], isDemo: true },
  { id: "international", label: "International", prompt: "Discover a different culture", destinations: ["Vietnam","Mauritius","Singapore"], isDemo: true },
  { id: "road-trip", label: "Road Trip", prompt: "Make the journey part of the trip", destinations: ["Delhi","Jaipur","Kochi","Munnar"], isDemo: true },
  { id: "honeymoon", label: "Honeymoon", prompt: "Unhurried journeys together", destinations: ["Maldives","Bali","Mauritius"], isDemo: true },
  { id: "romantic", label: "Romantic", prompt: "A little time for two", destinations: ["Udaipur","Paris","Kashmir"], isDemo: true },
] as const;

