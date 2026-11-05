import { z } from "zod";

export const taxiBookingSchema = z
  .object({
    pickup: z.string().min(1, "Select a pickup location."),
    destination: z.string().min(1, "Select a destination."),
    tripType: z.enum(["one-way", "round-trip"]),
    travelDate: z.string().min(1, "Select a travel date."),
    passengers: z
      .number()
      .int("Enter a whole number of passengers.")
      .min(1, "At least one passenger is required."),
    vehicleId: z.string().min(1, "Select a vehicle."),
  })
  .superRefine((booking, context) => {
    if (booking.pickup && booking.destination && booking.pickup === booking.destination) {
      context.addIssue({
        code: "custom",
        path: ["destination"],
        message: "Pickup and destination must be different.",
      });
    }

    if (booking.travelDate) {
      const selectedDate = new Date(`${booking.travelDate}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) {
        context.addIssue({
          code: "custom",
          path: ["travelDate"],
          message: "Travel date cannot be in the past.",
        });
      }
    }
  });
