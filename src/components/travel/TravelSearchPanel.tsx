"use client";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, BusFront, CalendarDays, CarFront, MapPin, MapPinned, Plane, Search, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { JourneyLoadingAnimation } from "@/components/travel/JourneyLoadingAnimation";
import type { JourneyAnimationType } from "@/components/travel/JourneyLoadingAnimation";
import { Button } from "@/components/ui/Button";
import type { BookingType } from "@/types";

interface SearchField {
  id: string;
  label: string;
  type: "text" | "date" | "month" | "select";
  placeholder?: string;
  options?: readonly string[];
  icon: LucideIcon;
}

interface SearchTab {
  id: BookingType;
  label: string;
  route: string;
  animation: JourneyAnimationType;
  icon: LucideIcon;
  fields: readonly SearchField[];
}

const searchTabs: readonly SearchTab[] = [
  {
    id: "flights",
    label: "Flights",
    route: "/flights",
    animation: "flight",
    icon: Plane,
    fields: [
      { id: "from", label: "From", type: "text", placeholder: "Departure city", icon: MapPin },
      { id: "to", label: "To", type: "text", placeholder: "Destination", icon: MapPinned },
      { id: "departure", label: "Departure", type: "date", icon: CalendarDays },
      { id: "return", label: "Return", type: "date", icon: CalendarDays },
      { id: "travellers", label: "Travellers", type: "select", options: ["1 traveller", "2 travellers", "3 travellers", "4+ travellers"], icon: Users },
    ],
  },
  {
    id: "holidays",
    label: "Holiday Packages",
    route: "/holidays",
    animation: "holiday",
    icon: MapPinned,
    fields: [
      { id: "to", label: "Destination", type: "text", placeholder: "Destination or theme", icon: MapPinned },
      { id: "departure", label: "Travel dates", type: "month", icon: CalendarDays },
      { id: "travellers", label: "Travellers", type: "select", options: ["1 traveller", "2 travellers", "Family", "Group"], icon: Users },
      { id: "style", label: "Travel style", type: "select", options: ["Family", "Couple", "Spiritual", "Adventure", "Weekend"], icon: MapPin },
    ],
  },
  {
    id: "bus",
    label: "Bus",
    route: "/bus",
    animation: "bus",
    icon: BusFront,
    fields: [
      { id: "from", label: "From", type: "text", placeholder: "Departure city", icon: MapPin },
      { id: "to", label: "To", type: "text", placeholder: "Arrival city", icon: MapPinned },
      { id: "departure", label: "Travel date", type: "date", icon: CalendarDays },
      { id: "travellers", label: "Travellers", type: "select", options: ["1 traveller", "2 travellers", "3 travellers", "4+ travellers"], icon: Users },
    ],
  },
  {
    id: "cabs",
    label: "Cabs",
    route: "/cabs",
    animation: "cab",
    icon: CarFront,
    fields: [
      { id: "from", label: "Pickup", type: "text", placeholder: "Pickup location", icon: MapPin },
      { id: "to", label: "Destination", type: "text", placeholder: "Drop location", icon: MapPinned },
      { id: "tripType", label: "Trip type", type: "select", options: ["One way", "Round trip"], icon: CarFront },
      { id: "departure", label: "Travel date", type: "date", icon: CalendarDays },
      { id: "travellers", label: "Passengers", type: "select", options: ["1 passenger", "2 passengers", "3 passengers", "4+ passengers"], icon: Users },
    ],
  },
] as const;

export function TravelSearchPanel() {
  const [activeTab, setActiveTab] = useState<BookingType>("flights");
  const [isSearching, setIsSearching] = useState(false);
  const [journey, setJourney] = useState({ origin: "Your city", destination: "Next stop" });
  const reduceMotion = useReducedMotionPreference();
  const router = useRouter();
  const activeSearch = searchTabs.find((tab) => tab.id === activeTab) ?? searchTabs[0];

  function selectTab(tab: BookingType) {
    setActiveTab(tab);
    setIsSearching(false);
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % searchTabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + searchTabs.length) % searchTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = searchTabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = searchTabs[nextIndex];
    selectTab(nextTab.id);
    document.getElementById(`travel-tab-${nextTab.id}`)?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setJourney({
      origin: String(formData.get("from") || "Your city"),
      destination: String(formData.get("to") || "Next stop"),
    });
    setIsSearching(true);
    await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 120 : 1050));
    router.push(activeSearch.route);
  }

  return (
    <section id="booking" className="relative z-20 mx-auto -mt-20 w-full max-w-[90rem] scroll-mt-28 px-4 pb-10 sm:-mt-24 sm:px-6 sm:pb-14 lg:px-8" aria-label="Search travel services">
      <div className="overflow-hidden rounded-[1.4rem] border border-border/80 bg-white shadow-[0_24px_70px_rgba(11,55,102,0.14)]">
        <div className="overflow-x-auto border-b border-border px-2 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max" role="tablist" aria-label="Travel services">
            {searchTabs.map((tab, index) => {
              const Icon = tab.icon;
              const selected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  id={`travel-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="travel-search-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`relative flex min-h-16 items-center gap-2 px-4 text-sm font-semibold transition-colors sm:px-6 ${selected ? "text-brand-navy" : "text-secondary hover:bg-brand-light-teal/60 hover:text-brand-blue"}`}
                >
                  <Icon className={`size-5 ${selected ? "text-brand-teal" : ""}`} aria-hidden="true" />
                  {tab.label}
                  {selected ? <motion.span layoutId="search-tab" className="absolute inset-x-4 bottom-0 h-0.5 bg-brand-teal" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-7">
          <AnimatePresence mode="wait" initial={false}>
            {isSearching ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <JourneyLoadingAnimation type={activeSearch.animation} origin={journey.origin} destination={journey.destination} />
              </motion.div>
            ) : (
              <motion.form
                key={activeSearch.id}
                id="travel-search-panel"
                role="tabpanel"
                aria-labelledby={`travel-tab-${activeSearch.id}`}
                onSubmit={handleSubmit}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(6,minmax(0,1fr))] lg:items-end"
              >
                {activeSearch.fields.map((field) => <SearchFieldControl key={`${activeSearch.id}-${field.id}`} field={field} service={activeTab} />)}
                <Button type="submit" size="lg" className="marketplace-search-cta min-h-13 w-full gap-2.5 px-6 text-base">
                  <Search size={20} strokeWidth={2} className="shrink-0" aria-hidden="true" /> Search
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function SearchFieldControl({ field, service }: { field: SearchField; service: BookingType }) {
  const Icon = field.icon;
  const classes = "mt-1 w-full min-w-0 bg-transparent text-sm font-semibold text-primary outline-none placeholder:font-normal placeholder:text-secondary/75";
  return (
    <div className="relative min-w-0 rounded-xl border border-border bg-white px-3.5 py-3.5 transition-colors focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-light-teal">
      <label htmlFor={`marketplace-${field.id}`} className="flex items-center gap-2 text-caption font-semibold text-secondary">
        <Icon className="size-3.5 text-brand-teal" aria-hidden="true" /> {field.label}
      </label>
      {field.id === "from" && <button type="button" aria-label="Swap origin and destination" className="marketplace-swap" onClick={(event) => {
        const form = event.currentTarget.closest("form");
        const from = form?.elements.namedItem("from") as HTMLInputElement | null;
        const to = form?.elements.namedItem("to") as HTMLInputElement | null;
        if (from && to) { const value = from.value; from.value = to.value; to.value = value; }
      }}><ArrowLeftRight size={14} aria-hidden="true" /></button>}
      {field.type === "select" ? (
        <select id={`marketplace-${field.id}`} name={field.id} defaultValue={field.id === "travellers" ? field.options?.[1] : field.options?.[0]} className={classes} required>
          <option value="" disabled>Select</option>
          {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input id={`marketplace-${field.id}`} name={field.id} type={field.type} placeholder={field.placeholder} className={classes} required={field.id !== "return"} defaultValue={field.type === "text" ? (field.id === "from" ? (service === "cabs" ? "Ayodhya" : "Delhi") : (service === "flights" || service === "holidays" ? "Dubai" : service === "cabs" ? "Varanasi" : "Jaipur")) : undefined} />
      )}
    </div>
  );
}
