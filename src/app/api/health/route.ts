import { getDatabasePool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (process.env.CAB_STORAGE_MODE === "memory") throw new Error("storage");
    await getDatabasePool().query({
      sql: "SELECT lock_id FROM cab_state_lock WHERE lock_id = 1",
      timeout: 5000,
    }).then(([rows]) => {
      if (!Array.isArray(rows) || rows.length !== 1) throw new Error("schema");
    });
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error(JSON.stringify({ event: "health_check_failed", at: new Date().toISOString() }));
    return Response.json({ status: "unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
