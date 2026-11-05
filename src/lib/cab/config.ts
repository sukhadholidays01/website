import { cabVehicles, type CabConfig, type CabTripType } from "./types";
// Paired amounts in the supplied document are deliberately NOT interpreted as vehicle fares.
const sheet: [string, string, string][] = [
  ...[
    ["Varanasi", "3500/4000"],
    ["Lucknow", "2500/3000"],
    ["Gorakhpur", "3500/4500"],
    ["Sonauli", "3500/4500"],
    ["Kanpur", "5000/6000"],
    ["Prayagraj", "3500/4000"],
    ["Delhi", "11000/15000"],
    ["Agra", "10000/12000"],
    ["Chitrakoot", "4500/5000"],
    ["Gonda", "2300/2500"],
    ["Sultanpur", "2000/2400"],
    ["Mathura", "10000/12000"],
    ["Naimisharanya", "5000/6000"],
  ].map(([to, price]): [string, string, string] => ["Ayodhya", to, price]),
  ...[
    "Ayodhya",
    "Lucknow",
    "Gorakhpur",
    "Sonauli",
    "Kanpur",
    "Prayagraj",
    "Delhi",
    "Agra",
    "Chitrakoot",
    "Sarnath",
    "Gonda",
    "Gaya",
    "Naimisharanya",
  ].map((to): [string, string, string] => [
    "Varanasi",
    to,
    to === "Ayodhya"
      ? "3300/4000"
      : to === "Lucknow"
        ? "2000/2500"
        : "Applicable",
  ]),
  ...[
    "Ayodhya",
    "Varanasi",
    "Gorakhpur",
    "Sonauli",
    "Kanpur",
    "Prayagraj",
    "Delhi",
    "Agra",
    "Jhansi",
    "Mathura",
    "Vrindavan",
    "Bareilly",
    "Naimisharanya",
  ].map((to): [string, string, string] => ["Lucknow", to, "Applicable"]),
  ...[
    "Ayodhya",
    "Varanasi",
    "Gorakhpur",
    "Sonauli",
    "Kanpur",
    "Jhansi",
    "Delhi",
    "Agra",
    "Chitrakoot",
    "Naimisharanya",
    "Mathura",
    "Vrindavan",
  ].map((to): [string, string, string] => ["Prayagraj", to, "Applicable"]),
];
export function initialCabConfig(): CabConfig {
  return {
    revision: 1,
    manual: sheet.map(([origin, destination, raw], index) => ({
      id: `sheet-${index}`,
      origin,
      destination,
      tripType: "one-way",
      vehicle: "sedan",
      active: false,
      fixedFare: null,
      sourceNote: `Sheet: ${raw}; labelled Automated. Trip type and vehicle are draft placeholders; confirm all fields before activation.`,
      inclusions: "",
      exclusions: "",
    })),
    automatic: (["one-way", "round-trip", "airport"] as CabTripType[]).flatMap(
      (tripType) =>
        cabVehicles.map((v) => ({
          vehicle: v.id,
          tripType,
          active: false,
          base: null,
          perKm: null,
          minimumKm: null,
          minimumKmPerDay: null,
          driverPerDay: null,
          inclusions: "",
          exclusions: "",
        })),
    ),
  };
}
