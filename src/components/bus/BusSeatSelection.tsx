"use client";
import { useState } from "react";
import { AnimatedAmount } from "@/components/motion/TravelMotion";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Armchair,
  BedSingle,
  Check,
  CircleGauge,
  MapPin,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { busDateLabel, busDuration, busFare } from "@/data/demoBuses";
import type { BusSearch, DemoBus } from "@/types/bus";
export function BusJourneySummary({
  bus,
  search,
  seats,
  onContinue,
}: {
  bus: DemoBus;
  search: BusSearch;
  seats: readonly string[];
  onContinue?: () => void;
}) {
  return (
    <div className="bus-journey-summary">
      <p className="bus-eyebrow">Your journey</p>
      <h2>
        {bus.from}
        <ArrowRight size={19} aria-hidden="true" />
        {bus.to}
      </h2>
      <p className="bus-summary-date">
        {busDateLabel(search.date)} / {search.travellers}{" "}
        {search.travellers === 1 ? "traveller" : "travellers"}
      </p>
      <div className="bus-summary-coach">
        <Armchair size={20} aria-hidden="true" />
        <div>
          <strong>{bus.coach}</strong>
          <span>
            {bus.ac ? "AC" : "Non AC"} {bus.busType} / {bus.departure}
          </span>
        </div>
      </div>
      <dl>
        <div>
          <dt>{bus.busType === "Sleeper" ? "Berths" : "Seats"}</dt>
          <dd aria-live="polite">
            {seats.length ? seats.join(", ") : "Not selected"}
          </dd>
        </div>
        <div>
          <dt>Fare per traveller</dt>
          <dd>{busFare(bus.price)}</dd>
        </div>
        <div>
          <dt>Selected travellers</dt>
          <dd>
            {seats.length} / {search.travellers}
          </dd>
        </div>
      </dl>
      <div className="bus-total" aria-live="polite">
        <span>
          Illustrative total
          <small>
            INR / {seats.length} {seats.length === 1 ? "seat" : "seats"}
          </small>
        </span>
        <motion.strong
          
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <AnimatedAmount value={bus.price * seats.length} format={busFare} />
        </motion.strong>
      </div>
      {onContinue && (
        <Button
          size="lg"
          className="bus-continue w-full"
          disabled={seats.length !== search.travellers}
          onClick={onContinue}
        >
          Continue
          <ArrowRight size={18} aria-hidden="true" />
        </Button>
      )}
      <p className="bus-disclaimer">
        Demo fare and seat choice. No seats are reserved or confirmed.
      </p>
    </div>
  );
}
export function BusSeatSelection({
  bus,
  search,
  seats,
  onToggle,
  onContinue,
}: {
  bus: DemoBus;
  search: BusSearch;
  seats: readonly string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
}) {
  const [notice, setNotice] = useState("");
  const sleeper = bus.busType === "Sleeper";
  const Icon = sleeper ? BedSingle : Armchair;
  const toggle = (id: string) => {
    if (!seats.includes(id) && seats.length === search.travellers) {
      setNotice(
        `You have selected ${search.travellers} seats. Deselect a seat to choose another.`,
      );
      return;
    }
    setNotice("");
    onToggle(id);
  };
  return (
    <>
      <header className="bus-seat-heading">
        <p className="bus-eyebrow">Make yourself comfortable</p>
        <h1>
          Choose your {sleeper ? "berths" : "seats"}
          <span>.</span>
        </h1>
        <p>
          Select {search.travellers}{" "}
          {search.travellers === 1 ? "seat" : "seats"} for your party. Your
          preferences will be included in the enquiry.
        </p>
      </header>
      <div className="bus-seat-grid">
        <section
          className="bus-console bus-seat-console"
          aria-label="Interactive coach seat layout"
        >
          <div className="bus-seat-console-top">
            <div>
              <h2>{bus.coach}</h2>
              <p>
                {bus.ac ? "AC" : "Non AC"} {bus.busType} /{" "}
                {busDuration(bus.durationMinutes)}
              </p>
            </div>
            <span className="bus-demo-badge">Demo seat map</span>
          </div>
          <div className="bus-seat-legend" aria-label="Seat legend">
            <span>
              <i className="bus-seat-key" />
              Available
            </span>
            <span>
              <i className="bus-seat-key selected">
                <Check size={12} aria-hidden="true" />
              </i>
              Selected
            </span>
            <span>
              <i className="bus-seat-key unavailable">
                <X size={12} aria-hidden="true" />
              </i>
              Unavailable
            </span>
          </div>
          <div className="bus-map-wrap">
            <div className={"bus-map " + (sleeper ? "bus-map-sleeper" : "")}>
              <div className="bus-driver-area">
                <span>Front / driver area</span>
                <CircleGauge size={28} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <div className="bus-map-caption">
                <span>{sleeper ? "Single-deck berths" : "Seating layout"}</span>
                <span>Aisle</span>
              </div>
              <div className="bus-seats" role="group" aria-label="Choose seats">
                {bus.seats.map((seat) => {
                  const selected = seats.includes(seat.id);
                  const unavailable = seat.status === "unavailable";
                  const status = unavailable
                    ? "unavailable"
                    : selected
                      ? "selected"
                      : "available";
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      className={"bus-seat " + status}
                      style={{
                        gridRow: seat.row + 1,
                        gridColumn:
                          seat.column < 2 ? seat.column + 1 : seat.column + 2,
                      }}
                      disabled={unavailable}
                      aria-pressed={selected}
                      aria-label={`${sleeper ? "Berth" : "Seat"} ${seat.id}, ${status}, ${busFare(bus.price)}`}
                      onClick={() => toggle(seat.id)}
                    >
                      <Icon
                        size={sleeper ? 25 : 23}
                        strokeWidth={1.35}
                        aria-hidden="true"
                      />
                      <span>{seat.id}</span>
                      {selected && (
                        <Check
                          className="bus-seat-mark"
                          size={13}
                          aria-hidden="true"
                        />
                      )}
                      {unavailable && (
                        <X
                          className="bus-seat-mark"
                          size={12}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <span className="bus-map-rear">Rear of coach</span>
            </div>
          </div>
          <p className="bus-seat-feedback" role="status">
            {notice ||
              `${seats.length} of ${search.travellers} seats selected${seats.length === search.travellers ? " / Ready to continue" : ""}`}
          </p>
          <div className="bus-stop-points">
            <div>
              <MapPin size={17} aria-hidden="true" />
              <div>
                <span>Boarding point</span>
                <strong>{bus.boarding}</strong>
              </div>
            </div>
            <ArrowRight size={17} aria-hidden="true" />
            <div>
              <MapPin size={17} aria-hidden="true" />
              <div>
                <span>Dropping point</span>
                <strong>{bus.dropping}</strong>
              </div>
            </div>
          </div>
          <p className="bus-disclaimer">
            Illustrative layout. Actual coach configuration and boarding points
            need confirmation.
          </p>
        </section>
        <aside className="bus-console bus-seat-summary">
          <BusJourneySummary
            bus={bus}
            search={search}
            seats={seats}
            onContinue={onContinue}
          />
        </aside>
      </div>
      <div className="bus-mobile-seat-footer">
        <div aria-live="polite">
          <small>
            {seats.length
              ? `Seats ${seats.join(", ")}`
              : `Choose ${search.travellers} seats`}
          </small>
          <strong><AnimatedAmount value={bus.price * seats.length} format={busFare} /></strong>
        </div>
        <Button
          size="lg"
          disabled={seats.length !== search.travellers}
          onClick={onContinue}
        >
          Continue
          <ArrowRight size={18} aria-hidden="true" />
        </Button>
      </div>
    </>
  );
}

