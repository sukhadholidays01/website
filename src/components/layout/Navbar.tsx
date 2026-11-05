"use client";

import { UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { CountrySelector } from "@/components/layout/CountrySelector";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { openLoginModal } = useAuthModal();
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setHasScrolled(window.scrollY > 12);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={cn(
      "sticky top-0 z-50 border-b bg-white/95 backdrop-blur-md transition-[border-color,box-shadow] duration-300",
      hasScrolled ? "border-border shadow-[0_8px_28px_rgba(11,55,102,0.08)]" : "border-border/70",
    )}>
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[90rem] items-center justify-between gap-3 px-4 sm:px-6 xl:h-20 xl:px-8">
        <Link
          href="/"
          className="relative -ml-2 block h-[3.75rem] w-[9.75rem] shrink-0 overflow-hidden rounded-sm focus-visible:outline-offset-1 xl:h-[4.25rem] xl:w-[10.5rem]"
          aria-label={`${siteConfig.name} home`}
        >
          <Image
            src="/brand/logo.png"
            loading="eager"
            alt={`${siteConfig.name} — ${siteConfig.tagline}`}
            fill
            sizes="(min-width: 1280px) 168px, 156px"
            className="object-cover object-[center_48%]"
          />
        </Link>

        <nav className="hidden items-center gap-0 xl:flex" aria-label="Primary navigation">
          {siteConfig.navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-2.5 py-3 text-sm font-medium transition-colors hover:bg-brand-light-teal hover:text-brand-navy",
                  isActive
                    ? "bg-brand-light-teal text-brand-navy after:absolute after:inset-x-3 after:-bottom-[0.3rem] after:h-0.5 after:bg-brand-teal"
                    : "text-secondary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-1.5 xl:flex">
          <button
            type="button"
            onClick={openLoginModal}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-brand-light-teal px-3.5 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-light-teal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          >
            <UserRound className="size-4 text-brand-blue" aria-hidden="true" />
            Login / Create Account
          </button>
          <CountrySelector className="w-28" />
          <CurrencySelector className="w-28" />
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <button
            type="button"
            onClick={openLoginModal}
            className="order-2 inline-flex size-11 items-center justify-center rounded-lg border border-border bg-white text-brand-navy transition-colors hover:bg-brand-light-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
            aria-label="Login or create account"
          >
            <UserRound className="size-5" aria-hidden="true" />
          </button>
          <MobileMenu items={siteConfig.navigation} onLogin={openLoginModal} />
        </div>
      </div>
    </header>
  );
}
