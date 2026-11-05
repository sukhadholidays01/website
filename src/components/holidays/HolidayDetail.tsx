"use client";
import { motion, MotionConfig } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  MapPin,
  Minus,
  Moon,
  Plus,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { getHolidayDestination } from "@/data/holidayDestinations";
import { travelMoods } from "@/data/travelMoods";
import photoCredits from "@/data/holidayPhotoCredits.json";
import type { JourneyPackage } from "@/types/holidays";
import "./holidays.css";

function EnquiryForm({ item }: { item: JourneyPackage }) {
  const id = useId();
  const [travellers, setTravellers] = useState(2);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    if (String(data.get("name")).trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[+\d\s()-]{7,20}$/.test(String(data.get("mobile")))) {
      setError("Please enter a valid mobile number.");
      return;
    }
    if (String(data.get("date")) < today) {
      setError("Please choose today or a future date.");
      return;
    }
    setReference("SH-HOL-" + crypto.randomUUID().slice(0, 8).toUpperCase());
  }
  if (reference)
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="holiday-success"
        role="status"
      >
        <CheckCircle2 size={44} aria-hidden="true" />
        <p className="holiday-eyebrow">Demo enquiry received</p>
        <h2>Enquiry received</h2>
        <p>Your Sukhad Holidays request has been received in this demo.</p>
        <p className="holiday-reference">{reference}</p>
        <p className="holiday-hint">
          Local demo reference only. No information has been sent to the travel
          team or saved after leaving this page.
        </p>
        <Link href="/holidays" className={buttonVariants({ size: "lg" })}>
          Explore More Holidays <ArrowRight size={16} />
        </Link>
      </motion.div>
    );
  return (
    <form onSubmit={submit} className="holiday-enquiry-form">
      <p className="holiday-eyebrow">Plan this journey</p>
      <h2>{item.title}</h2>
      <p className="holiday-hint">
        {item.days} Days · {item.nights} Nights
      </p>
      <div className="holiday-enquiry-price">
        <strong>
          {item.price === null
            ? "Price on request"
            : "From ₹" + item.price.toLocaleString("en-IN") + "*"}
        </strong>
        <small>
          {item.price === null
            ? "Your journey, your personalised quote"
            : "Illustrative demo price · INR per person"}
        </small>
      </div>
      <div className="holiday-travellers">
        <span id={id + "-travellers"}>Travellers</span>
        <div role="group" aria-labelledby={id + "-travellers"}>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Remove traveller"
            disabled={travellers <= 1}
            onClick={() => setTravellers((t) => t - 1)}
          >
            <Minus size={14} />
          </Button>
          <output aria-live="polite">{travellers}</output>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Add traveller"
            disabled={travellers >= 20}
            onClick={() => setTravellers((t) => t + 1)}
          >
            <Plus size={14} />
          </Button>
        </div>
      </div>
      <label htmlFor={id + "-date"}>
        Travel date
        <input id={id + "-date"} name="date" type="date" min={today} required />
      </label>
      <label htmlFor={id + "-name"}>
        Name
        <input
          id={id + "-name"}
          name="name"
          autoComplete="name"
          minLength={2}
          maxLength={100}
          required
          placeholder="Your full name"
        />
      </label>
      <label htmlFor={id + "-mobile"}>
        Mobile
        <input
          id={id + "-mobile"}
          name="mobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="+91 mobile number"
        />
      </label>
      <label htmlFor={id + "-email"}>
        Email
        <input
          id={id + "-email"}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>
      <label className="holiday-consent">
        <input type="checkbox" required />I agree to be contacted about this
        journey.
      </label>
      {error && (
        <p className="holiday-form-error" role="alert">
          {error}
        </p>
      )}
      <Button size="lg" type="submit" className="w-full">
        Send Enquiry <ArrowRight size={17} aria-hidden="true" />
      </Button>
      <p className="holiday-hint">
        Demo enquiry only. No request is delivered and no booking is confirmed.
      </p>
      <Link
        href={{
          pathname: "/contact",
          query: { category: "Holiday Packages", package: item.title },
        }}
        className="holiday-contact-link"
      >
        Continue to the existing contact form →
      </Link>
    </form>
  );
}
export function HolidayDetail({ item }: { item: JourneyPackage }) {
  const destination = getHolidayDestination(item.destination)!;
  const [sheet, setSheet] = useState(false);
  const [photo, setPhoto] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const galleryRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = sheetRef.current;
    if (sheet) dialog?.showModal();
    else if (dialog?.open) dialog.close();
  }, [sheet]);
  useEffect(() => {
    const dialog = galleryRef.current;
    if (photo !== null) dialog?.showModal();
    else if (dialog?.open) dialog.close();
  }, [photo]);
  useEffect(() => {
    if (!sheet && photo === null) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [sheet, photo]);
  const photos = item.gallery;
  const credits = photoCredits.filter(
    (p) => p.destination === item.destination,
  );
  return (
    <MotionConfig reducedMotion="user">
      <div className="holiday-root holiday-detail">
        <div className="holiday-container">
          <nav className="holiday-breadcrumb" aria-label="Breadcrumb">
            <Link href="/holidays">Holidays</Link>
            <span>/</span>
            <Link href={"/holidays/" + destination.slug}>
              {destination.name}
            </Link>
            <span>/</span>
            <span aria-current="page">{item.title}</span>
          </nav>
          <header className="holiday-detail-header">
            <p className="holiday-eyebrow">
              {destination.name} / {destination.region}
            </p>
            <h1>{item.title}</h1>
            <p className="holiday-intro">{item.description}</p>
            <div className="holiday-detail-tags">
              {item.styles.map((s) => (
                <span key={s}>
                  {travelMoods.find((m) => m.id === s)?.label}
                </span>
              ))}
              <span>Sample journey</span>
            </div>
          </header>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={
              "holiday-gallery " + (photos.length === 1 ? "single" : "")
            }
            aria-label="Package photo gallery"
          >
            {photos.map((p, i) => (
              <button
                key={p.src}
                onClick={() => setPhoto(i)}
                aria-label={"Open photo " + (i + 1) + ": " + p.alt}
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes={
                    i === 0
                      ? "(max-width: 700px) 85vw, 65vw"
                      : "(max-width: 700px) 85vw, 30vw"
                  }
                  preload={i === 0}
                />
                <span>{i === 0 ? "Explore the gallery ↗" : `View photo ${i + 1} ↗`}</span>
              </button>
            ))}
          </motion.div>
          <p className="holiday-gallery-caption">
            Destination inspiration · Swipe to explore on mobile · Photos do not
            represent a confirmed hotel or service
          </p>
          {credits.length > 0 && (
            <details className="holiday-photo-credits">
              <summary>Photo credits</summary>
              {credits.map((p) => (
                <p key={p.src}>
                  <a href={p.source}>{p.alt}</a> by {p.author} ·{" "}
                  <a href={p.licenseUrl}>{p.license}</a>
                </p>
              ))}
            </details>
          )}
          <div className="holiday-detail-columns">
            <div className="holiday-detail-content">
              <div className="holiday-quick-facts">
                <span>
                  <CalendarDays size={19} aria-hidden="true" />
                  {item.days} Days
                </span>
                <span>
                  <Moon size={19} aria-hidden="true" />
                  {item.nights} Nights
                </span>
                <span>
                  <MapPin size={19} aria-hidden="true" />
                  {destination.name}
                </span>
                {item.familyFriendly && (
                  <span>
                    <Users size={19} aria-hidden="true" />
                    Family friendly
                  </span>
                )}
                {item.travelType && (
                  <span>
                    <Users size={19} aria-hidden="true" />
                    {item.travelType}
                  </span>
                )}
              </div>
              <section className="holiday-overview">
                <p className="holiday-eyebrow">A little about this escape</p>
                <h2>A journey at your own pace.</h2>
                <p>
                  {item.description} Share your preferred dates and interests
                  with us to shape the details around you.
                </p>
              </section>
              {item.itinerary?.length ? (
                <section
                  className="holiday-itinerary"
                  aria-labelledby="journey-heading"
                >
                  <p className="holiday-eyebrow">Your journey</p>
                  <h2 id="journey-heading">Every day, a new memory.</h2>
                  <p className="holiday-hint">
                    Proposed demo itinerary · Final arrangements confirmed on
                    enquiry
                  </p>
                  <ol>
                    {item.itinerary.map((day, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0.65 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.25 }}
                      >
                        <motion.span className="holiday-timeline-line" aria-hidden="true" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut" }} />
                        <span className="holiday-day">
                          Day {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3>{day.title}</h3>
                          <p>{day.description}</p>
                        </div>
                      </motion.li>
                    ))}
                  </ol>
                </section>
              ) : null}
              {item.inclusions?.length || item.exclusions?.length ? (
                <section
                  className="holiday-inclusions"
                  aria-label="Package inclusions and exclusions"
                >
                  {[
                    { title: "Included", items: item.inclusions, icon: Check },
                    { title: "Not included", items: item.exclusions, icon: X },
                  ].map(({ title, items, icon: Icon }) =>
                    items?.length ? (
                      <div key={title}>
                        <h2>{title}</h2>
                        <ul>
                          {items.map((text) => (
                            <li key={text}>
                              <Icon size={16} aria-hidden="true" />
                              {text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </section>
              ) : null}
              {item.notes?.length ? (
                <section className="holiday-notes">
                  <h2>Before you go</h2>
                  <ul>
                    {item.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
            <aside
              className="holiday-enquiry-desktop"
              aria-label="Package enquiry"
            >
              <EnquiryForm item={item} />
            </aside>
          </div>
        </div>
        <div className="holiday-mobile-cta">
          <div>
            <small>Plan your journey</small>
            <strong>{item.title}</strong>
          </div>
          <Button
            onClick={() => setSheet(true)}
            size="lg"
            aria-haspopup="dialog"
          >
            Send Enquiry <ArrowRight size={15} />
          </Button>
        </div>
        <dialog
          ref={sheetRef}
          className="holiday-sheet"
          aria-labelledby="holiday-sheet-title"
          onCancel={() => setSheet(false)}
          onClose={() => {
            setSheet(false);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheet(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="holiday-dialog-top">
              <h2 id="holiday-sheet-title">Your next journey</h2>
              <Button
                variant="ghost"
                aria-label="Close enquiry"
                onClick={() => setSheet(false)}
              >
                <X size={20} />
              </Button>
            </div>
            <EnquiryForm item={item} />
          </motion.div>
        </dialog>
        <dialog
          ref={galleryRef}
          className="holiday-lightbox"
          aria-label="Destination photography"
          onCancel={() => setPhoto(null)}
          onClose={() => setPhoto(null)}
        >
          <div className="holiday-dialog-top">
            <p>
              {destination.name} · {photo !== null ? photo + 1 : 1} /{" "}
              {photos.length}
            </p>
            <Button
              variant="secondary"
              aria-label="Close gallery"
              onClick={() => setPhoto(null)}
            >
              <X size={20} />
            </Button>
          </div>
          {photo !== null && (
            <div className="holiday-lightbox-image">
              <Image
                src={photos[photo].src}
                alt={photos[photo].alt}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
          )}
          {photos.length > 1 && (
            <div className="holiday-gallery-controls">
              <Button
                variant="secondary"
                onClick={() =>
                  setPhoto(
                    (p) => ((p ?? 0) - 1 + photos.length) % photos.length,
                  )
                }
              >
                ← Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPhoto((p) => ((p ?? 0) + 1) % photos.length)}
              >
                Next →
              </Button>
            </div>
          )}
        </dialog>
      </div>
    </MotionConfig>
  );
}

