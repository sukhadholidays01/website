"use client";
import { useState } from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  BusFront,
  CalendarDays,
  MapPin,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { busCities, busToday, popularBusJourneys } from "@/data/demoBuses";
import type { BusSearch } from "@/types/bus";
export function BusSearchPanel({
  search,
  onChange,
  onSearch,
}: {
  search: BusSearch;
  onChange: (s: BusSearch) => void;
  onSearch: () => void;
}) {
  const [error, setError] = useState("");
  const city = (name: string) => busCities.find((c) => c.name === name);
  return (
    <>
      <header className="bus-search-heading">
        <p className="bus-eyebrow">
          <BusFront size={18} aria-hidden="true" /> City to city. Your way.
        </p>
        <h1>
          Find your bus journey<span>.</span>
        </h1>
        <p>
          Travel comfortably, city to city. Start with the seat that suits you.
        </p>
      </header>
      <motion.section
        className="bus-console bus-search-console"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        aria-label="Bus journey search"
      >
        <div className="bus-console-top">
          <span>
            <span className="bus-small-dot" /> Intercity journeys
          </span>
          <span className="bus-demo-badge">Demo experience</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (search.from === search.to) {
              setError("Choose two different cities for your journey.");
              return;
            }
            if (search.date < busToday()) {
              setError("Choose today or a future travel date.");
              return;
            }
            setError("");
            onSearch();
          }}
        >
          <div className="bus-search-fields">
            <label className="bus-search-field">
              <span>
                <MapPin size={17} aria-hidden="true" /> From
              </span>
              <select
                aria-label="From"
                value={search.from}
                onChange={(e) => onChange({ ...search, from: e.target.value })}
              >
                {busCities.map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
              <small>{city(search.from)?.code} / Departure city</small>
            </label>
            <Button
              variant="secondary"
              className="bus-swap"
              aria-label="Swap departure and destination"
              onClick={() =>
                onChange({ ...search, from: search.to, to: search.from })
              }
            >
              <ArrowLeftRight size={19} aria-hidden="true" />
            </Button>
            <label className="bus-search-field">
              <span>
                <MapPin size={17} aria-hidden="true" /> To
              </span>
              <select
                aria-label="To"
                value={search.to}
                onChange={(e) => onChange({ ...search, to: e.target.value })}
              >
                {busCities.map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
              <small>{city(search.to)?.code} / Arrival city</small>
            </label>
            <label className="bus-search-field">
              <span>
                <CalendarDays size={17} aria-hidden="true" /> Travel date
              </span>
              <input
                aria-label="Travel date"
                type="date"
                min={busToday()}
                required
                value={search.date}
                onChange={(e) => onChange({ ...search, date: e.target.value })}
              />
              <small>
                {search.date
                  ? new Intl.DateTimeFormat("en-IN", {
                      weekday: "long",
                      timeZone: "UTC",
                    }).format(new Date(search.date + "T12:00:00Z"))
                  : "Choose your departure"}
              </small>
            </label>
            <label className="bus-search-field">
              <span>
                <Users size={17} aria-hidden="true" /> Travellers
              </span>
              <select
                aria-label="Travellers"
                value={search.travellers}
                onChange={(e) =>
                  onChange({ ...search, travellers: Number(e.target.value) })
                }
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "Traveller" : "Travellers"}
                  </option>
                ))}
              </select>
              <small>A seat for every traveller</small>
            </label>
          </div>
          <div className="bus-search-footer">
            <p>
              Explore sample schedules, fares and seat layouts.
              <br />
              <span>Live operators and inventory are not connected.</span>
            </p>
            <Button type="submit" size="lg" className="bus-search-button">
              <BusFront size={20} aria-hidden="true" />
              Search Buses
              <ArrowRight size={19} aria-hidden="true" />
            </Button>
          </div>
          {error && (
            <p className="bus-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </motion.section>
      <section className="bus-popular" aria-labelledby="bus-popular-heading">
        <div className="bus-section-heading">
          <h2 id="bus-popular-heading">A few journeys to get you started</h2>
          <span>Demo discovery routes</span>
        </div>
        <div className="bus-route-chips">
          {popularBusJourneys.map((r) => (
            <button
              key={r.to}
              onClick={() => {
                setError("");
                onChange({ ...search, from: r.from, to: r.to });
              }}
            >
              <span>
                {r.from}
                <ArrowRight size={14} aria-hidden="true" />
                <strong>{r.to}</strong>
              </span>
              <small>Explore journey</small>
            </button>
          ))}
        </div>
      </section>
      <section className="bus-road-story">
        <div className="bus-story-image">
          <Image
            src="/images/bus/open-road.webp"
            alt="Open highway winding towards distant mountains in the morning light"
            fill
            sizes="(max-width: 700px) 90vw, 40vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="bus-eyebrow">Good journeys start with a good seat</p>
          <h2>A window to your next adventure.</h2>
          <p>
            Compare journey times, explore coach comforts and choose your
            preferred seats. We will help turn your travel plans into a
            personalised enquiry.
          </p>
          <div className="bus-story-facts">
            <span>
              <BusFront size={19} aria-hidden="true" />
              Choose your coach
            </span>
            <span>
              <Users size={19} aria-hidden="true" />
              Pick your seats
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
