"use client";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import { vehicles } from "@/data/vehicles";
const descriptions: Record<string, string> = {
  sedan: "Comfortable point-to-point travel, with room to unwind.",
  suv: "More room for family moments and the open road.",
  luxury: "An elevated ride for journeys that deserve a little more.",
  "tempo-traveller": "Bring your people. Make the journey part of the memory.",
};
export function VehicleSelector({
  selectedVehicleId,
  onSelect,
  error,
}: {
  selectedVehicleId: string;
  onSelect: (id: string) => void;
  error?: string;
}) {
  const reduced = useReducedMotionPreference();
  const selected =
    vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0];
  return (
    <section className="cab-vehicles" aria-labelledby="cab-vehicles-title">
      <p className="cab-eyebrow">Choose your ride</p>
      <h2 id="cab-vehicles-title">Room for your kind of journey.</h2>
      <div
        className="cab-vehicle-tabs"
        role="group"
        aria-label="Vehicle categories"
      >
        {vehicles.map((v) => (
          <button
            type="button"
            key={v.id}
            aria-pressed={v.id === selectedVehicleId}
            onClick={() => onSelect(v.id)}
          >
            {v.name}
          </button>
        ))}
      </div>
      <div className="cab-vehicle-presentation">
        <div className="cab-vehicle-photo">
          <AnimatePresence initial={false}>
            {
              <motion.div
                key={selected.id}
                className="cab-photo-layer"
                initial={{ opacity: 0, scale: 1.025 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
              >
                <Image
                  src={selected.image}
                  alt={`${selected.name} — illustrative vehicle category`}
                  fill
                  sizes="(max-width: 768px) 100vw, 45vw"
                  className="object-cover"
                />
              </motion.div>
            }
          </AnimatePresence>
          <span>Category illustration · Actual vehicle may vary</span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="cab-vehicle-copy"
            key={selected.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          >
            <p className="cab-eyebrow">Your ride, your way</p>
            <h3>{selected.name}</h3>
            <p>{descriptions[selected.category]}</p>
            <ul>
              <li>
                <Check size={18} /> One-way / round-trip
              </li>
              <li>
                <Check size={18} /> Driver-assisted travel
              </li>
            </ul>
            <button
              type="button"
              className="cab-button cab-secondary"
              onClick={() => {
                onSelect(selected.id);
                document
                  .getElementById("cab-fare")
                  ?.scrollIntoView({
                    behavior: reduced ? "instant" : "smooth",
                    block: "center",
                  });
              }}
            >
              Select {selected.name}
              <ArrowRight size={18} />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
      {error && (
        <p role="alert" className="cab-error">
          {error}
        </p>
      )}
    </section>
  );
}
