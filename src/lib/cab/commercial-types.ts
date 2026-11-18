import type { CabFare, CabBooking } from "./types";
export type OperationsActor = { userId: string; role: string };
export type AdvancePolicy = {
  mode: "percent" | "fixed"; value: number; minimum: number; maximum: number | null;
  maximumPercent: number; currency: "INR"; required: boolean; allowOverride: boolean;
  beforeAssignment: boolean; beforeDispatch: boolean;
};
export type QuotationRevision = {
  requestKey?:string; requestHash?:string; number: number; version: string; previousAmount: number | null; previousFare?:CabFare; fare: CabFare;
  vehicle?:CabBooking["journey"]["vehicle"]; previousVehicle?:CabBooking["journey"]["vehicle"];
  reason: string; notes: string; actor: OperationsActor; createdAt: string;
  expiresAt: string; acceptedAt?: string;
};
export type AdvanceRevision = {
  requestKey?:string; requestHash?:string; id: string; revision: number; quoteVersion: string; quotationAmount: number;
  mode: "percent" | "fixed"; value: number; amount: number; currency: "INR";
  policy: AdvancePolicy; actor: OperationsActor; createdAt: string; reason: string;
  requestedAt?: string; deadline?: string; cancelledAt?: string;
};
export type PaymentContext = { quoteVersion: string; advanceId?: string; advanceRevision?: number; quotationAmount: number };
export type CommercialState = {
  quotations: QuotationRevision[]; advances: AdvanceRevision[];
  assignments: { at: string; actor: OperationsActor; reason: string; previous?: CabBooking["assignment"]; current: CabBooking["assignment"] }[];
  notes: { at: string; actor: OperationsActor; text: string; customerVisible: boolean }[];
  driverConfirmedAt?: string;
};
