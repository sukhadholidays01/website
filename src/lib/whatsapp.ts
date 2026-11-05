import type { TaxiBookingRequest, TaxiFareBreakdown } from "@/types";

export const configuredWhatsAppPhone =
  process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.trim() ?? "";

export function createWhatsAppUrl(phoneNumber: string, message: string): string {
  const normalizedPhone = phoneNumber.replace(/\D/g, "");

  if (!normalizedPhone) {
    throw new Error("A valid WhatsApp phone number is required.");
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message.trim())}`;
}

interface TaxiBookingMessageInput {
  booking: TaxiBookingRequest;
  vehicleName: string;
  fare?: TaxiFareBreakdown;
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function createTaxiBookingMessage({
  booking,
  vehicleName,
  fare,
}: TaxiBookingMessageInput): string {
  const tripType = booking.tripType === "round-trip" ? "Round Trip" : "One Way";
  const estimatedFare = fare
    ? currencyFormatter.format(fare.totalFare)
    : "To be confirmed by the team";

  return [
    "Hello Sukhad Holidays,",
    "",
    "I would like to enquire about a taxi booking.",
    "",
    `Pickup: ${booking.pickup}`,
    `Destination: ${booking.destination}`,
    `Trip Type: ${tripType}`,
    `Travel Date: ${booking.travelDate}`,
    `Passengers: ${booking.passengers}`,
    `Vehicle: ${vehicleName}`,
    `Estimated Fare: ${estimatedFare}`,
    "",
    "Please confirm availability and final fare.",
  ].join("\n");
}
