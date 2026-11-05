"use client";
import { useState } from "react";
import { ArrowRight, Mail, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BusJourneySummary } from "./BusSeatSelection";
import type { BusSearch, DemoBus } from "@/types/bus";
export function BusEnquiry({
  bus,
  search,
  seats,
  onSubmit,
}: {
  bus: DemoBus;
  search: BusSearch;
  seats: readonly string[];
  onSubmit: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <div className="bus-enquiry-grid">
      <section className="bus-console bus-enquiry-console">
        <p className="bus-eyebrow">One last step</p>
        <h1>
          Complete your enquiry<span>.</span>
        </h1>
        <p className="bus-enquiry-intro">
          Add the lead traveller&apos;s contact details for your party of{" "}
          {search.travellers}. Your preferred seats are a request, not a
          reservation.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const phone = String(data.get("mobile"));
            const digits = phone.replace(/\D/g, "");
            if (String(data.get("name")).trim().length < 2) {
              setError("Please enter your full name.");
              return;
            }
            if (
              !/^\+?[\d\s()-]+$/.test(phone) ||
              digits.length < 7 ||
              digits.length > 15
            ) {
              setError(
                "Please enter a valid mobile number with 7 to 15 digits.",
              );
              return;
            }
            if (
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                String(data.get("email")).trim(),
              )
            ) {
              setError("Please enter a valid email address.");
              return;
            }
            setError("");
            onSubmit();
          }}
        >
          <label htmlFor="bus-passenger-name">
            <span>
              <UserRound size={17} aria-hidden="true" />
              Name
            </span>
            <input
              id="bus-passenger-name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Lead traveller's full name"
            />
          </label>
          <div className="bus-contact-fields">
            <label htmlFor="bus-passenger-mobile">
              <span>
                <Phone size={17} aria-hidden="true" />
                Mobile
              </span>
              <input
                id="bus-passenger-mobile"
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                maxLength={24}
                placeholder="+91 mobile number"
              />
            </label>
            <label htmlFor="bus-passenger-email">
              <span>
                <Mail size={17} aria-hidden="true" />
                Email
              </span>
              <input
                id="bus-passenger-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={150}
                placeholder="you@example.com"
              />
            </label>
          </div>
          <label className="bus-consent">
            <input name="consent" type="checkbox" required />I agree to be
            contacted about this travel enquiry.
          </label>
          <div className="bus-enquiry-demo">
            <strong>Demo enquiry</strong>
            <p>
              This submission is demonstrated in your browser only. Contact
              details are not sent or stored, and no request reaches the travel
              team yet.
            </p>
          </div>
          {error && (
            <p className="bus-error" role="alert">
              {error}
            </p>
          )}
          <Button size="lg" type="submit" className="bus-enquiry-submit">
            Send Enquiry
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
          <p className="bus-disclaimer">
            An enquiry only. No payment, ticket or booking confirmation.
          </p>
        </form>
      </section>
      <aside className="bus-console">
        <BusJourneySummary bus={bus} search={search} seats={seats} />
      </aside>
    </div>
  );
}
