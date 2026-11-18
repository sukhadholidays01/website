
import Image from "next/image";
import Link from "next/link";
import {
  FaInstagram,
  FaFacebookF,
  FaLinkedinIn,
  FaWhatsapp,
} from "react-icons/fa";
import { officialSocialLinks } from "@/config/site";
import inspirationCredits from "@/data/inspirationPhotoCredits.json";
import {
  configuredWhatsAppPhone,
  createWhatsAppUrl,
} from "@/lib/whatsapp";

const footerGroups = [
  {
    title: "Explore",
    links: [
      { label: "Flights", href: "/flights" },
      { label: "Holiday Packages", href: "/holidays" },
      { label: "Bus", href: "/bus" },
      { label: "Cabs", href: "/cabs" },
      { label: "Custom Routes", href: "/custom-routes" },
    ],
  },
  {
    title: "Popular Destinations",
    links: ["Ayodhya", "Varanasi", "Jaipur", "Goa", "Kerala", "Kashmir"].map(
      (name) => ({
        label: name,
        href: "/holidays?destination=" + encodeURIComponent(name),
      })
    ),
  },
  {
    title: "Company & Support",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      {
        label: "WhatsApp",
        href: configuredWhatsAppPhone.replace(/\D/g, "")
          ? createWhatsAppUrl(
              configuredWhatsAppPhone,
              "Hello Sukhad Holidays, I would like to plan a journey."
            )
          : "/contact?category=WhatsApp",
      },
      { label: "Enquiry", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
];

const socialProfiles = [
  {
    label: "Instagram",
    Icon: FaInstagram,
    href: officialSocialLinks.instagram,
  },
  {
    label: "Facebook",
    Icon: FaFacebookF,
    href: officialSocialLinks.facebook,
  },
  {
    label: "LinkedIn",
    Icon: FaLinkedinIn,
    href: officialSocialLinks.linkedin,
  },
  {
    label: "WhatsApp",
    Icon: FaWhatsapp,
    href: officialSocialLinks.whatsapp,
  },
];

const linkStyle =
  "inline-flex min-h-8 items-center py-1 text-[13px] text-secondary transition-colors duration-200 hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2";

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto grid w-full max-w-[1264px] grid-cols-2 gap-x-8 gap-y-8 px-5 py-9 sm:px-8 lg:grid-cols-[1.45fr_0.8fr_1fr_1fr] lg:gap-x-12 lg:py-10">
        {/* Brand */}
        <div className="col-span-2 lg:col-span-1">
          <Link
            href="/"
            className="relative mb-3 block h-[62px] w-[180px]"
            aria-label="Sukhad Holidays home"
          >
            <Image
              src="/brand/icon.jpeg"
              alt="Sukhad Holidays - Creating Happy Memories"
              fill
              sizes="180px"
              className="object-contain object-left"
              priority={false}
            />
          </Link>

          <p className="max-w-[290px] text-[13px] leading-[1.7] text-secondary">
            Flights, holidays, buses and cabs for journeys across India and
            beyond.
          </p>

          {socialProfiles.some((profile) => profile.href) && (
            <div
              className="mt-4 flex items-center gap-2.5"
              aria-label="Official social profiles"
            >
              {socialProfiles.map(
                ({ label, Icon, href }) =>
                  href && (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-brand-navy transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-blue hover:bg-brand-light-teal hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <Icon size={16} aria-hidden="true" />
                    </a>
                  )
              )}
            </div>
          )}
        </div>

        {/* Footer link groups */}
        {footerGroups.map((group) => (
          <nav
            key={group.title}
            aria-label={group.title}
            className={
              group.title === "Company & Support"
                ? "col-span-2 lg:col-span-1"
                : ""
            }
          >
            <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-brand-navy">
              {group.title}
            </h2>

            <ul
              className={
                group.title === "Company & Support"
                  ? "grid grid-cols-2 gap-x-4 lg:block"
                  : "space-y-0"
              }
            >
              {group.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("https://") ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkStyle}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className={linkStyle}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Photo credits */}
      <details className="mx-auto max-w-[1264px] px-5 pb-3 text-xs text-secondary sm:px-8">
        <summary className="inline-flex min-h-8 cursor-pointer items-center py-2 transition-colors hover:text-brand-blue">
          Travel photo credits
        </summary>

        <ul className="space-y-2 pb-3">
          {inspirationCredits.map((c) => (
            <li key={c.slug}>
              <a
                href={c.source}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {c.slug}: {c.artist.replace(/<[^>]*>/g, "").trim()}
              </a>
              {" · "}
              <a
                href={c.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {c.license}
              </a>
              {" · resized for display"}
            </li>
          ))}

          <li>
            Road photograph: Claudio Schwarz /{" "}
            <a
              href="https://unsplash.com/photos/a-view-of-a-highway-with-mountains-in-the-background-8GTkqkvUScA"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Unsplash
            </a>
            {" · "}
            <a
              href="https://unsplash.com/license"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Licence
            </a>
          </li>
        </ul>
      </details>

      {/* Copyright */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1264px] flex-col gap-3 px-5 py-4 text-xs text-secondary sm:px-8 md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Sukhad Holidays. Creating Happy
            Memories.
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link
              href="/privacy-policy"
              className="transition-colors hover:text-brand-blue"
            >
              Privacy Policy
            </Link>

            <Link
              href="/data-deletion"
              className="transition-colors hover:text-brand-blue"
            >
              Data Deletion
            </Link>

            <Link
              href="/terms"
              className="transition-colors hover:text-brand-blue"
            >
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
