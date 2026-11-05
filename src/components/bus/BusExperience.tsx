"use client";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import { ArrowLeft, ArrowRight, BusFront, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  busDateLabel,
  busToday,
  emptyBusFilters,
  findDemoBuses,
} from "@/data/demoBuses";
import type { BusFilter, BusSearch, BusSort, DemoBus } from "@/types/bus";
import { BusSearchPanel } from "./BusSearchPanel";
import { BusSearchAnimation } from "./BusSearchAnimation";
import { BusResults } from "./BusResults";
import { BusSeatSelection } from "./BusSeatSelection";
import { BusEnquiry } from "./BusEnquiry";
import { BusSuccess } from "./BusSuccess";
import "./bus.css";
type Stage =
  "search" | "searching" | "results" | "seats" | "enquiry" | "success";
export function BusExperience() {
  const [stage, setStage] = useState<Stage>("search");
  const [search, setSearch] = useState<BusSearch>({
    from: "Delhi",
    to: "Ayodhya",
    date: busToday() > "2026-10-12" ? busToday() : "2026-10-12",
    travellers: 2,
  });
  const [filters, setFilters] = useState<BusFilter>(emptyBusFilters);
  const [sort, setSort] = useState<BusSort>("recommended");
  const [selected, setSelected] = useState<DemoBus | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [reference, setReference] = useState("");
  const reduced = useReducedMotion();
  const focus = useRef<HTMLDivElement>(null);
  const initial = useRef(true);
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    focus.current?.focus({ preventScroll: true });
    focus.current?.scrollIntoView({
      behavior: reduced ? "instant" : "smooth",
      block: "start",
    });
  }, [stage, reduced]);
  useEffect(() => {
    if (stage !== "searching") return;
    const timer = setTimeout(() => setStage("results"), reduced ? 180 : 1100);
    return () => clearTimeout(timer);
  }, [stage, reduced]);
  const buses = findDemoBuses(search);
  const start = () => {
    setSelected(null);
    setSeats([]);
    setFilters({ ...emptyBusFilters });
    setSort("recommended");
    setReference("");
    setStage("searching");
  };
  const toggle = (id: string) => {
    if (!selected?.seats.some((s) => s.id === id && s.status === "available"))
      return;
    setSeats((previous) =>
      previous.includes(id)
        ? previous.filter((s) => s !== id)
        : previous.length < search.travellers
          ? [...previous, id].sort()
          : previous,
    );
  };
  const continueToEnquiry = () => {
    if (selected && seats.length === search.travellers) setStage("enquiry");
  };
  const submit = () => {
    if (!selected || seats.length !== search.travellers) return;
    setReference("SH-BUS-" + crypto.randomUUID().slice(0, 8).toUpperCase());
    setStage("success");
  };
  return (
    <MotionConfig reducedMotion="user">
      <div
        className={
          "bus-experience " + (stage === "seats" ? "bus-seats-stage" : "")
        }
      >
        <div className="bus-container">
          <div
            ref={focus}
            tabIndex={-1}
            role="region"
            aria-label={"Bus experience: " + stage}
            className="bus-stage-anchor"
          >
            <nav className="bus-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <ChevronRight size={13} aria-hidden="true" />
              <span aria-current="page">Bus</span>
              {stage !== "search" && (
                <>
                  <ChevronRight size={13} aria-hidden="true" />
                  <span>
                    {stage === "searching"
                      ? "Finding journeys"
                      : stage === "results"
                        ? "Journey options"
                        : stage === "seats"
                          ? "Seat selection"
                          : stage === "enquiry"
                            ? "Passenger enquiry"
                            : "Enquiry received"}
                  </span>
                </>
              )}
            </nav>
          </div>
          {stage !== "search" &&
            stage !== "searching" &&
            stage !== "success" && (
              <>
                <Button
                  variant="ghost"
                  className="bus-back"
                  onClick={() =>
                    setStage(
                      stage === "results"
                        ? "search"
                        : stage === "seats"
                          ? "results"
                          : "seats",
                    )
                  }
                >
                  <ArrowLeft size={17} aria-hidden="true" />
                  {stage === "results"
                    ? "Modify Search"
                    : stage === "seats"
                      ? "Back to buses"
                      : "Back to seats"}
                </Button>
                <div className="bus-route-summary">
                  <div className="bus-route-icon">
                    <BusFront size={23} aria-hidden="true" />
                  </div>
                  <div>
                    {stage === "results" ? (
                      <h1>
                        {search.from}
                        <ArrowRight size={20} aria-hidden="true" />
                        {search.to}
                      </h1>
                    ) : (
                      <p className="bus-route-title">
                        {search.from}
                        <ArrowRight size={20} aria-hidden="true" />
                        {search.to}
                      </p>
                    )}
                    <p>
                      {busDateLabel(search.date)} / {search.travellers}{" "}
                      {search.travellers === 1 ? "Traveller" : "Travellers"}
                    </p>
                  </div>
                  <span className="bus-demo-badge">Demo journey</span>
                </div>
              </>
            )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stage}
              initial={reduced ? false : { opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              {stage === "search" && (
                <BusSearchPanel
                  search={search}
                  onChange={setSearch}
                  onSearch={start}
                />
              )}
              {stage === "searching" && <BusSearchAnimation search={search} />}
              {stage === "results" && (
                <BusResults
                  buses={buses}
                  filters={filters}
                  onFilter={setFilters}
                  sort={sort}
                  onSort={setSort}
                  onSelect={(bus) => {
                    setSelected(bus);
                    setSeats([]);
                    setStage("seats");
                  }}
                  onModify={() => setStage("search")}
                />
              )}
              {stage === "seats" && selected && (
                <BusSeatSelection
                  bus={selected}
                  search={search}
                  seats={seats}
                  onToggle={toggle}
                  onContinue={continueToEnquiry}
                />
              )}
              {stage === "enquiry" && selected && (
                <BusEnquiry
                  bus={selected}
                  search={search}
                  seats={seats}
                  onSubmit={submit}
                />
              )}
              {stage === "success" && selected && (
                <BusSuccess
                  bus={selected}
                  search={search}
                  seats={seats}
                  reference={reference}
                  onReset={() => {
                    setSelected(null);
                    setSeats([]);
                    setReference("");
                    setStage("search");
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
