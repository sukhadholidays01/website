import "server-only";
import { initialCabConfig } from "./config";
import { developmentOperations } from "./development";
import type { CabState } from "./types";

/** Future Postgres adapter must provide atomic transactions and uniqueness constraints. */
export interface CabRepository {
  readonly mode: "development-mock" | "mysql";
  readonly persistent: boolean;
  read(): Promise<CabState>;
  transaction<T>(operation: (draft: CabState) => T): Promise<T>;
}
interface MockContainer {
  state: CabState;
  queue: Promise<unknown>;
}
const registry = globalThis as typeof globalThis & {
  __sukhadhCabMockV2?: MockContainer;
};
function container(): MockContainer {
  return (registry.__sukhadhCabMockV2 ||= {
    state: {
      config: initialCabConfig(),
      bookings: [],
      limits: {},
      sessions: {},
      operations: developmentOperations(),
    },
    queue: Promise.resolve(),
  });
}
export const mockCabRepository: CabRepository = {
  mode: "development-mock",
  persistent: false,
  async read() {
    await container().queue;
    return structuredClone(container().state);
  },
  async transaction<T>(operation: (draft: CabState) => T): Promise<T> {
    const current = container();
    const result = current.queue.then(() => {
      const draft = structuredClone(current.state);
      const value = operation(draft);
      current.state = draft;
      return structuredClone(value);
    });
    current.queue = result.catch(() => {});
    return result;
  },
};
