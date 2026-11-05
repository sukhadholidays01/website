export const siteConfig = {
  name: "Sukhad Holidays",
  tagline: "Creating Happy Memories",
  title: "Sukhad Holidays | Flights, Holidays, Bus & Cab Services",
  description: "Discover destinations, explore sample journeys and plan flights, holidays, bus trips, cabs and custom routes with Sukhad Holidays.",
  navigation: [
    { label: "Flights", href: "/flights" },
    { label: "Holiday Packages", href: "/holidays" },
    { label: "Bus", href: "/bus" },
    { label: "Cabs", href: "/cabs" },
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
