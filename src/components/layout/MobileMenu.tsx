"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CountrySelector } from "@/components/layout/CountrySelector";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { cn } from "@/lib/utils";

interface NavigationItem {
  label: string;
  href: string;
}

interface MobileMenuProps {
  items: readonly NavigationItem[];
  onLogin: () => void;
}

const menuId = "mobile-navigation";

export function MobileMenu({ items, onLogin }: MobileMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();

  function closeMenu(restoreFocus = false) {
    setIsOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  useEffect(() => {
    if (!isOpen) return;
    firstLinkRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div>
      <button
        ref={menuButtonRef}
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-white text-brand-navy transition-colors hover:bg-brand-light-teal"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={menuId}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
            className="absolute inset-x-0 top-full max-h-[calc(100svh-4.5rem)] overflow-y-auto border-b border-border bg-white px-4 pb-5 pt-3 shadow-[0_12px_24px_rgba(11,55,102,0.08)] sm:px-6"
          >
            <nav aria-label="Mobile navigation">
              <ul className="mx-auto grid w-full max-w-[90rem] gap-1">
                {items.map((item, index) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <li key={item.href}>
                      <Link
                        ref={index === 0 ? firstLinkRef : undefined}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "block rounded-lg border-l-2 px-3 py-3 text-base font-medium transition-colors hover:bg-brand-light-teal hover:text-brand-navy",
                          isActive
                            ? "border-brand-teal bg-brand-light-teal text-brand-navy"
                            : "border-transparent text-primary",
                        )}
                        onClick={() => closeMenu()}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mx-auto mt-4 grid w-full max-w-[90rem] gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <CountrySelector showLabel />
              <CurrencySelector showLabel />
            </div>
            <button
              type="button"
              className="mx-auto mt-4 flex min-h-12 w-full max-w-[90rem] items-center justify-center gap-2 rounded-lg bg-brand-light-teal px-4 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-light-teal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              onClick={() => {
                closeMenu(true);
                window.requestAnimationFrame(onLogin);
              }}
            >
              <UserRound className="size-4 text-brand-blue" aria-hidden="true" />
              Login / Create Account
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
