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
      "site-header sticky top-0 z-50 border-b bg-white/95 backdrop-blur-md transition-[border-color,box-shadow] duration-300",
      hasScrolled ? "border-border shadow-[0_8px_28px_rgba(11,55,102,0.08)]" : "border-border/70",
    )}>
      <div className="site-header-inner mx-auto w-full max-w-[90rem] px-3 sm:px-6 xl:px-8">
        <Link
          href="/"
          className="site-header-logo relative block shrink-0 overflow-hidden rounded-sm focus-visible:outline-offset-1"
          aria-label={`${siteConfig.name} home`}
        >
          <Image
            src="/brand/logo.png"
            loading="eager"
            alt={`${siteConfig.name} — ${siteConfig.tagline}`}
            fill
            sizes="(min-width: 1280px) 136px, 112px"
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
                  "group relative rounded-md px-2.5 py-2.5 text-[13px] font-medium transition-colors hover:text-brand-blue after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-brand-teal after:transition-transform hover:after:scale-x-100 focus-visible:after:scale-x-100",
                  isActive
                    ? "bg-brand-light-teal text-brand-navy after:scale-x-100"
                    : "text-secondary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="site-header-actions hidden items-center gap-1.5 xl:flex">
          <button
            type="button"
            onClick={openLoginModal}
            className="header-login inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-light-teal text-brand-navy transition-colors hover:bg-brand-light-teal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          >
            <UserRound className="size-4 text-brand-blue" aria-hidden="true" />
            <span className="sr-only">Login</span>
          </button>
          <CountrySelector className="w-24" />
          <CurrencySelector className="w-24" />
        </div>

        <div className="site-header-mobile flex items-center gap-1 xl:hidden">
          <button
            type="button"
            onClick={openLoginModal}
            className="order-2 inline-flex size-10 items-center justify-center rounded-lg border border-border bg-white text-brand-navy transition-colors hover:bg-brand-light-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
            aria-label="Login or create account"
          >
            <UserRound className="size-[18px]" aria-hidden="true" />
          </button>
          <MobileMenu items={siteConfig.navigation} onLogin={openLoginModal} />
          <CountrySelector iconOnly className="order-3 w-10" />
          <CurrencySelector iconOnly className="order-4 w-10" />
        </div>
      </div>
    </header>
  );
}
