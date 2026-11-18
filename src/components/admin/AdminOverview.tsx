"use client";
import Link from "next/link";
import { PageHeader } from "./ui";
import { OperationsOverview } from "@/components/cabs/OperationsOverview";
import "@/components/cabs/cab-live.css";
export function AdminOverview(){return <><PageHeader title="Operations overview" description="Database-backed cab operations, quotations and verified collections." demo={false}><Link className="a-btn a-primary" href="/admin/cab-operations">Open cab operations</Link></PageHeader><div className="cab-live cb-embedded"><OperationsOverview/></div><section className="a-panel a-panel-body"><h2>Other travel services</h2><p>Flight, bus, package and custom-trip operational totals remain unavailable until their backends are connected.</p></section></>;}
