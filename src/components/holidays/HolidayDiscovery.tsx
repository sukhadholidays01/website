"use client";
import { motion, MotionConfig } from "framer-motion";
import { ArrowRight, Compass, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { destinationInspiration } from "@/data/destinationInspiration";
import { holidayDestinations } from "@/data/holidayDestinations";
import { journeyPackages } from "@/data/demoHolidayPackages";
import { travelMoods, type TravelMoodId } from "@/data/travelMoods";
import type { HolidayDestination, JourneyPackage } from "@/types/holidays";
import "./holidays.css";

export function PackageCard({
  item,
  index = 0,
}: {
  item: JourneyPackage;
  index?: number;
}) {
  return (
    <motion.article
      className={"holiday-package " + (item.featured ? "featured" : "")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.2) }}
    >
      <Link
        href={"/holidays/" + item.slug}
        className="holiday-package-image"
        aria-label={"View " + item.title}
      >
        <Image
          src={item.image}
          alt={getDestinationName(item.destination) + " landscape"}
          fill
          sizes="(max-width: 700px) 90vw, 45vw"
          className="object-cover"
        />
        <span>{getDestinationName(item.destination)}</span>
      </Link>
      <div className="holiday-package-body">
        <p className="holiday-eyebrow">
          {item.styles
            .map((s) => travelMoods.find((m) => m.id === s)?.label)
            .slice(0, 2)
            .join(" + ")}
        </p>
        <h3>{item.title}</h3>
        <p>
          {item.days} Days · {item.nights} Nights
        </p>
        <p className="holiday-description">{item.description}</p>
        <div className="holiday-package-footer">
          <div>
            <strong>
              {item.price === null
                ? "Price on request"
                : "From ₹" + item.price.toLocaleString("en-IN") + "*"}
            </strong>
            <small>
              {item.price === null
                ? "Personalised quotation"
                : "Illustrative demo · per person"}
            </small>
          </div>
          <Link
            className={buttonVariants({ variant: "secondary", size: "sm" })}
            href={"/holidays/" + item.slug}
          >
            View Package <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
function getDestinationName(slug: string) {
  return holidayDestinations.find((d) => d.slug === slug)?.name ?? slug;
}

export function HolidayDiscovery({ initialSearch = "" }: { initialSearch?: string }) {
  const [scope, setScope] = useState<"domestic" | "international">("domestic");
  const [search, setSearch] = useState(initialSearch);
  const [mood, setMood] = useState<TravelMoodId | null>(null);
  useEffect(() => {
    const sync = () =>
      setScope(
        location.hash === "#international" ? "international" : "domestic",
      );

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const query = search.trim().toLowerCase();
  const shown = holidayDestinations.filter(
    (d) =>
      d.scope === scope &&
      (!mood || d.moods.includes(mood)) &&
      (!query ||
        [
          d.name,
          d.region,
          d.descriptor,
          ...journeyPackages
            .filter((p) => p.destination === d.slug)
            .map((p) => p.title),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)),
  );
  const packages = journeyPackages.filter(
    (p) =>
      p.scope === scope &&
      (!mood || p.styles.includes(mood)) &&
      (!query ||
        (p.title + " " + getDestinationName(p.destination))
          .toLowerCase()
          .includes(query)),
  );
  return (
    <MotionConfig reducedMotion="user">
      <div className="holiday-root holiday-discovery">
        <div className="holiday-container">
          <header className="holiday-editorial">
            <div>
              <p className="holiday-eyebrow">
                <Compass size={15} aria-hidden="true" /> A little further from
                the everyday
              </p>
              <h1>
                Find a place
                <br />
                worth <em>remembering.</em>
              </h1>
              <p className="holiday-intro">
                Discover journeys across India and beyond.
                <br />
                The kind you bring home with you.
              </p>
            </div>
            <div className="holiday-search-area">
              <div
                className="holiday-switch"
                role="group"
                aria-label="Choose holiday region"
              >
                {(["domestic", "international"] as const).map((s) => (
                  <button
                    key={s}
                    aria-pressed={scope === s}
                    onClick={() => setScope(s)}
                  >
                    {scope === s && (
                      <motion.span
                        layoutId="holiday-region"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}
                    <span>{s === "domestic" ? "India" : "World"}</span>
                  </button>
                ))}
              </div>
              <label className="holiday-search">
                <Search size={19} aria-hidden="true" />
                <span className="sr-only">Search destinations</span>
                <input
                  placeholder="Search destinations"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X size={18} />
                  </button>
                )}
              </label>
              <p className="holiday-hint">
                Try{" "}
                {scope === "domestic"
                  ? "Ayodhya, Varanasi or Jaipur"
                  : "Dubai, Bali or Maldives"}
              </p>
            </div>
          </header>
          <section className="holiday-moods" aria-labelledby="mood-heading">
            <div className="holiday-section-heading">
              <div>
                <p className="holiday-eyebrow">Travel by feeling</p>
                <h2 id="mood-heading">What are you travelling for?</h2>
              </div>
              <p>Choose a feeling. Find your next place.</p>
            </div>
            <div className="holiday-mood-scroll">
              {travelMoods.map((m, i) => (
                <button
                  key={m.id}
                  aria-pressed={mood === m.id}
                  onClick={() => setMood(mood === m.id ? null : m.id)}
                >
                  <span aria-hidden="true">
                    {
                      [
                        "\u2661",
                        "\u2667",
                        "\u2197",
                        "\u263c",
                        "\u2248",
                        "\u2311",
                        "\u25f7",
                      ][i]
                    }
                  </span>
                  {m.label}
                </button>
              ))}
              {mood && (
                <Button variant="ghost" onClick={() => setMood(null)}>
                  Clear <X size={14} />
                </Button>
              )}
            </div>
          </section>
          <section
            id={scope === "domestic" ? "domestic" : "international"}
            className="holiday-destinations"
            aria-labelledby="destination-heading"
          >
            <div className="holiday-section-heading">
              <div>
                <p className="holiday-eyebrow">
                  {scope === "domestic"
                    ? "Close to home. Far from ordinary."
                    : "A world of possibilities."}
                </p>
                <h2 id="destination-heading">
                  {mood
                    ? travelMoods.find((m) => m.id === mood)?.prompt
                    : scope === "domestic"
                      ? "India, in all its colours."
                      : "Somewhere beyond the familiar."}
                </h2>
              </div>
              <span className="holiday-hint" role="status">
                {shown.length} destinations to explore
              </span>
            </div>
            <motion.div
              key={scope + "-" + mood + "-" + query}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22 }}
              className="holiday-mosaic"
            >
              {shown.map((d, i) => (
                <Link
                  key={d.slug}
                  href={"/holidays/" + d.slug}
                  className={"holiday-destination tile-" + i}
                >
                  <Image
                    src={d.image}
                    alt={d.name + " — " + d.descriptor}
                    fill
                    sizes="(max-width: 700px) 78vw, (max-width: 1100px) 45vw, 35vw"
                    preload={i === 0}
                  />
                  <div>
                    <small>{d.region}</small>
                    <h3>{d.name}</h3>
                    <p>{d.descriptor}</p>
                  </div>
                  <ArrowRight
                    className="holiday-card-arrow"
                    size={24}
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </motion.div>
            {shown.length === 0 && (
              <div className="holiday-empty">
                <h3>No places match just yet.</h3>
                <p>Try another destination or clear your travel feeling.</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setMood(null);
                  }}
                >
                  Reset discovery
                </Button>
              </div>
            )}
          </section>
          <section className="holiday-inspiration-directory" aria-labelledby="inspiration-title">
            <div className="holiday-section-heading"><div><p className="holiday-eyebrow">Destination inspiration</p><h2 id="inspiration-title">More places to make your own.</h2></div></div>
            <p className="holiday-disclaimer">Destination information, not package availability. Build a custom route to enquire about any of these places.</p>
            <div className="holiday-inspiration-list">{destinationInspiration.filter(d => d.scope === scope && (!mood || d.travelThemes.includes(mood)) && (!query || (d.name + " " + d.region + " " + d.shortDescription).toLowerCase().includes(query))).map(d => <article key={d.id}><h3>{d.name}</h3><p>{d.shortDescription}</p><Link href={"/custom-routes?origin=" + encodeURIComponent(d.name)}>Plan a journey <ArrowRight size={16}/></Link></article>)}</div>
          </section>
          <section
            className="holiday-journeys"
            aria-labelledby="journeys-heading"
          >
            <div className="holiday-section-heading">
              <div>
                <p className="holiday-eyebrow">From inspiration to itinerary</p>
                <h2 id="journeys-heading">Journeys to make your own.</h2>
              </div>
              <p>Sample packages. Thoughtful starting points.</p>
            </div>
            <div className="holiday-packages">
              {packages.map((p, i) => (
                <PackageCard key={p.id} item={p} index={i} />
              ))}
            </div>
            {!packages.length && (
              <p className="holiday-empty">
                No sample package matches this selection. Explore a destination
                to enquire about a personalised journey.
              </p>
            )}
            <p className="holiday-disclaimer">
              Discovery content and sample packages are for inspiration. Prices
              are illustrative in INR; services and availability are confirmed
              only through an enquiry.
            </p>
          </section>
          <div className="holiday-closing">
            <p className="holiday-eyebrow">
              Your idea. Our thoughtful planning.
            </p>
            <h2>Have a place in mind?</h2>
            <p>Tell us what a perfect holiday looks like to you.</p>
            <Link
              className={buttonVariants({ size: "lg" })}
              href="/contact?category=Holiday%20Packages"
            >
              Plan a journey <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
export function DestinationListing({
  destination: d,
  packages,
}: {
  destination: HolidayDestination;
  packages: readonly JourneyPackage[];
}) {
  const [duration, setDuration] = useState("all");
  const [budget, setBudget] = useState("all");
  const [style, setStyle] = useState("all");
  const [sort, setSort] = useState("recommended");
  const visible = packages
    .filter(
      (p) =>
        (duration === "all" ||
          (duration === "short" ? p.days <= 3 : p.days > 3)) &&
        (budget === "all" ||
          (p.price !== null &&
            (budget === "low" ? p.price <= 20000 : p.price > 20000))) &&
        (style === "all" || p.styles.includes(style as TravelMoodId)),
    )
    .toSorted((a, b) =>
      sort === "duration"
        ? a.days - b.days
        : sort === "price"
          ? (a.price ?? Infinity) - (b.price ?? Infinity)
          : Number(b.featured) - Number(a.featured),
    );
  return (
    <MotionConfig reducedMotion="user">
      <div className="holiday-root">
        <div className="holiday-container">
          <Link className="holiday-back" href="/holidays">
            ← Explore holidays
          </Link>
          <header className="holiday-list-header">
            <div>
              <p className="holiday-eyebrow">
                {d.region} / {d.scope === "domestic" ? "India" : "World"}
              </p>
              <h1>
                {d.name}
                <em>.</em>
              </h1>
              <p className="holiday-intro">{d.descriptor}</p>
              <p className="holiday-hint">
                {packages.length
                  ? "Thoughtfully planned sample journeys. Personalised to your pace."
                  : "Destination inspiration. Let’s shape a journey around you."}
              </p>
            </div>
            <div className="holiday-list-fragment">
              <Image
                src={d.image}
                alt={d.name + " destination"}
                fill
                sizes="(max-width: 700px) 90vw, 40vw"
                preload
              />
            </div>
          </header>
          {packages.length > 0 ? (
            <>
              <div className="holiday-filters">
                {[
                  {
                    label: "Duration",
                    value: duration,
                    set: setDuration,
                    options: [
                      ["all", "Any duration"],
                      ["short", "Up to 3 days"],
                      ["long", "4 days or more"],
                    ],
                  },
                  {
                    label: "Budget",
                    value: budget,
                    set: setBudget,
                    options: [
                      ["all", "Any budget"],
                      ["low", "Up to ₹20,000"],
                      ["high", "Above ₹20,000"],
                    ],
                  },
                  {
                    label: "Travel style",
                    value: style,
                    set: setStyle,
                    options: [
                      ["all", "Any style"],
                      ...travelMoods.map((m) => [m.id, m.label]),
                    ],
                  },
                  {
                    label: "Sort",
                    value: sort,
                    set: setSort,
                    options: [
                      ["recommended", "Recommended"],
                      ["duration", "Duration: shortest"],
                      ["price", "Price: lowest"],
                    ],
                  },
                ].map((f) => (
                  <label key={f.label}>
                    {f.label}
                    <select
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                    >
                      {f.options.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="holiday-hint" role="status">
                {visible.length} sample{" "}
                {visible.length === 1 ? "journey" : "journeys"} · Prices on
                request appear after priced packages
              </p>
              <div className="holiday-packages">
                {visible.map((p, i) => (
                  <PackageCard key={p.id} item={p} index={i} />
                ))}
              </div>
              {!visible.length && (
                <div className="holiday-empty">
                  <h2>No sample journeys match.</h2>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDuration("all");
                      setBudget("all");
                      setStyle("all");
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              )}
              <p className="holiday-disclaimer">
                Demo journeys, not live inventory. Any displayed price is
                illustrative per person in INR. Confirm all arrangements with
                the travel team.
              </p>
            </>
          ) : (
            <div className="holiday-closing">
              <p className="holiday-eyebrow">A journey waiting to take shape</p>
              <h2>Your {d.name} story starts here.</h2>
              <p>
                We have no configured package for this destination. Share your
                dates, interests and travel companions for a personalised
                enquiry.
              </p>
              <Link
                className={buttonVariants({ size: "lg" })}
                href={{
                  pathname: "/contact",
                  query: { category: "Holiday Packages", destination: d.name },
                }}
              >
                Enquire about {d.name}
                <ArrowRight size={17} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

