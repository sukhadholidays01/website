import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DestinationListing } from "@/components/holidays/HolidayDiscovery";
import { HolidayDetail } from "@/components/holidays/HolidayDetail";
import {
  holidayDestinations,
  getHolidayDestination,
} from "@/data/holidayDestinations";
import { journeyPackages } from "@/data/demoHolidayPackages";
interface Props {
  params: Promise<{ slug: string }>;
}
export function generateStaticParams() {
  return [
    ...holidayDestinations.map((d) => ({ slug: d.slug })),
    ...journeyPackages.map((p) => ({ slug: p.slug })),
  ];
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = getHolidayDestination(slug);
  const p = journeyPackages.find((p) => p.slug === slug);
  return {
    title: `${d?.name ?? p?.title ?? "Holiday Not Found"} | Sukhad Holidays`,
    description: d?.descriptor ?? p?.description,
  };
}
export default async function HolidayPage({ params }: Props) {
  const { slug } = await params;
  const d = getHolidayDestination(slug);
  if (d)
    return (
      <DestinationListing
        destination={d}
        packages={journeyPackages.filter((p) => p.destination === slug)}
      />
    );
  const p = journeyPackages.find((p) => p.slug === slug);
  if (!p) notFound();
  return <HolidayDetail item={p} />;
}
