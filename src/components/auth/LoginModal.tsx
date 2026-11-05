"use client";

import { Mail, MapPin, Phone, Plane, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

interface LoginModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export function LoginModal({ isOpen, onDismiss }: LoginModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [foundationMessage, setFoundationMessage] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFoundationMessage(
      "Account access is not connected yet. You can continue exploring as a guest.",
    );
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="login-modal-title"
      aria-describedby="login-modal-description"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onDismiss();
      }}
      className="m-auto max-h-[calc(100svh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-white p-0 text-primary shadow-[0_24px_70px_rgba(11,55,102,0.2)] backdrop:bg-brand-navy/35 backdrop:backdrop-blur-[2px]"
    >
      <div className="relative h-24 overflow-hidden bg-brand-navy" aria-hidden="true">
        <span className="absolute left-7 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-brand-teal" />
        <span className="absolute left-10 right-12 top-1/2 border-t border-dashed border-white/35" />
        <Plane className="absolute right-20 top-1/2 size-6 -translate-y-1/2 rotate-12 text-white" />
        <MapPin className="absolute right-7 top-1/2 size-6 -translate-y-1/2 text-brand-teal" />
      </div>
      <div className="relative p-5 sm:p-7">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg border border-border bg-white text-brand-navy transition-colors hover:bg-brand-light-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          aria-label="Close account dialog"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <p className="text-caption font-semibold uppercase tracking-[0.16em] text-brand-teal">Sukhad Holidays account</p>
        <h2 id="login-modal-title" className="mt-2 pr-10 text-2xl font-semibold text-brand-navy">
          Your journeys, all in one place.
        </h2>
        <p id="login-modal-description" className="mt-3 text-sm leading-6 text-secondary">
          Sign in or create an account to manage your travel plans when account services become available.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
              <Phone className="size-4 text-brand-teal" aria-hidden="true" /> Mobile Number
            </legend>
            <div className="mt-2 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
              <div>
                <label htmlFor="account-country-code" className="sr-only">Country code</label>
                <select
                  id="account-country-code"
                  name="countryCode"
                  defaultValue="+91"
                  className="min-h-12 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal"
                >
                  <option value="+91">+91</option>
                  <option value="+971">+971</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+65">+65</option>
                  <option value="+61">+61</option>
                </select>
              </div>
              <div>
                <label htmlFor="account-phone" className="sr-only">Phone number</label>
                <input
                  id="account-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Phone number"
                  className="min-h-12 w-full min-w-0 rounded-lg border border-border bg-white px-3.5 text-sm outline-none placeholder:text-secondary/75 focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal"
                />
              </div>
            </div>
          </fieldset>

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-caption font-semibold uppercase tracking-[0.12em] text-secondary">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div>
            <label htmlFor="account-email" className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
              <Mail className="size-4 text-brand-teal" aria-hidden="true" /> Email Address
            </label>
            <input
              id="account-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-2 min-h-12 w-full rounded-lg border border-border bg-white px-3.5 text-sm outline-none placeholder:text-secondary/75 focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal"
            />
          </div>

          {foundationMessage ? (
            <p className="rounded-lg bg-brand-light-teal p-3 text-sm leading-6 text-brand-navy" role="status">
              {foundationMessage}
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="submit" size="lg">Continue</Button>
            <Button type="button" variant="secondary" size="lg" onClick={onDismiss}>
              Continue as Guest
            </Button>
          </div>
          <p className="text-caption leading-5 text-secondary">
            Account verification and authentication will be connected in a future phase.
          </p>
        </form>
      </div>
    </dialog>
  );
}
