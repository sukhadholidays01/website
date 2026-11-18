export const siteConfig = {
  name: "Sukhad Holidays",
  tagline: "Creating Happy Memories",
  title: "Sukhad Holidays | Cabs, Bus, Flights & Holidays Services",
  description: "Discover destinations, explore sample journeys and plan flights, holidays, bus trips, cabs and custom routes with Sukhad Holidays.",
  navigation: [
    { label: "Cabs", href: "/cabs" },
    { label: "Bus", href: "/bus" },
    { label: "Flights", href: "/flights" },
    { label: "Holiday Packages", href: "/holidays" },
    { label: "Custom Routes", href: "/custom-routes" },
  ],
  countries: ["India", "UAE", "United States", "United Kingdom", "Singapore", "Australia"],
  currencies: [
    { code: "INR", label: "INR ₹" },
    { code: "USD", label: "USD $" },
    { code: "AED", label: "AED" },
    { code: "GBP", label: "GBP £" },
    { code: "EUR", label: "EUR €" },
  ],
} as const;

// Official company URLs only. Leave missing profiles unset; no empty links render.
export const officialSocialLinks: {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  whatsapp?: string;
  youtube?: string;
} = {
  instagram: "https://www.instagram.com/sukhadholidays?vrfl=dmQ0bml3cHl4aTVh",
  facebook: "https://www.facebook.com/share/1ZA2ZumCTe/",
  linkedin: "https://www.linkedin.com/company/sukhadholidays/",
  whatsapp: "https://wa.me/918009555377",
};
