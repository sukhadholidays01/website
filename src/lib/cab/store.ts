import "server-only";
import { mockCabRepository } from "./repository";
import { mysqlCabCategories, mysqlCabRepository } from "./mysql-repository";
import { categoryLabels } from "./models";
import { cabVehicles } from "./types";
import type { CabState } from "./types";
const memoryMode = process.env.CAB_STORAGE_MODE === "memory";
if (process.env.NODE_ENV === "production" && memoryMode) {
  throw new Error("Production cab requests require MySQL storage.");
}
export const cabRepository = memoryMode
  ? mockCabRepository
  : mysqlCabRepository;
export function cabStorageMode() {
  return cabRepository.mode;
}
export async function listCabCategories() {
  if (cabStorageMode() === "mysql") return mysqlCabCategories();
  const vehicles = cabVehicles.map((vehicle) => ({
    category: vehicle.id,
    name: categoryLabels[vehicle.id],
    seats: vehicle.seats,
  }));
  return vehicles;
}
export function readCabState(): Promise<CabState> {
  return cabRepository.read();
}
export function changeCabState<T>(
  operation: (draft: CabState) => T,
): Promise<T> {
  return cabRepository.transaction(operation);
}
