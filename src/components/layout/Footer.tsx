import Image from "next/image";
import Link from "next/link";
import inspirationCredits from "@/data/inspirationPhotoCredits.json";

const footerGroups = [
  {
    title: "Services",
    links: [
      { label: "Flights", href: "/flights" },
      { label: "Holiday Packages", href: "/holidays" },
      { label: "Bus", href: "/bus" },
      { label: "Cabs", href: "/cabs" },
      { label: "Custom Routes", href: "/custom-routes" },
    ],
  },
  {
    title: "Popular India",
    links: ["Ayodhya", "Varanasi", "Jaipur", "Goa", "Kerala", "Kashmir"].map(name => ({label:name,href: "/holidays?destination=" + encodeURIComponent(name)})),
  },
  {
    title: "International",
    links: ["Dubai", "Bali", "Singapore", "Maldives", "Thailand"].map(name => ({label:name,href: "/holidays?destination=" + encodeURIComponent(name) + "#international"})),
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "WhatsApp", href: "/contact?category=WhatsApp" },
      { label: "Enquiry", href: "/contact" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto grid w-full max-w-[90rem] gap-9 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_2fr] lg:px-8 lg:py-12">
        <div>
          <Link href="/" className="relative block h-16 w-44 overflow-hidden" aria-label="Sukhad Holidays home">
            <Image src="/brand/logo.png" alt="Sukhad Holidays — Creating Happy Memories" fill sizes="176px" className="object-cover object-[center_48%]" />
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-secondary">
            Flights, holidays, buses and cabs for journeys across India and beyond.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 xl:grid-cols-5">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-brand-navy">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-secondary transition-colors hover:text-brand-blue">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <details className="mx-auto max-w-[90rem] px-4 pb-5 text-xs text-secondary sm:px-6 lg:px-8"><summary className="cursor-pointer py-2">Destination photo credits</summary><ul className="mt-2 space-y-2">{inspirationCredits.map(c => <li key={c.slug}><a href={c.source}>{c.slug}: {c.artist.replace(/<[^>]*>/g, "").trim()}</a> ï¿½ <a href={c.licenseUrl}>{c.license}</a> ï¿½ resized for display</li>)}</ul></details>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-3 px-4 py-5 text-caption text-secondary sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Sukhad Holidays. Creating Happy Memories.</p>
          <div className="flex gap-5">
            <Link href="/privacy-policy" className="hover:text-brand-blue">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-brand-blue">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

