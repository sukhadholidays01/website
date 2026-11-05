import { BusFront, CarFront, MapPinned, Plane } from "lucide-react";

import { SectionHeading } from "@/components/travel/SectionHeading";
import { TravelCategoryCard } from "@/components/travel/TravelCategoryCard";

const categories = [
  { title: "Flights", description: "Prepare domestic or international flight searches.", href: "/flights", icon: Plane, accent: "bg-sky-50" },
  { title: "Holiday Packages", description: "Discover spiritual, heritage and international escapes.", href: "/holidays", icon: MapPinned, accent: "bg-amber-50" },
  { title: "Bus", description: "Plan comfortable point-to-point and group journeys.", href: "/bus", icon: BusFront, accent: "bg-emerald-50" },
  { title: "Cabs", description: "Estimate outstation fares and choose a vehicle.", href: "/cabs", icon: CarFront, accent: "bg-cyan-50" },
] as const;

export function TravelCategories() {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24" aria-labelledby="categories-heading">
      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div id="categories-heading">
          <SectionHeading eyebrow="Plan every part" title="Four ways to begin your journey." description="Choose a service and continue into a focused travel-planning experience." />
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => <TravelCategoryCard key={category.title} {...category} />)}
        </div>
      </div>
    </section>
  );
}
