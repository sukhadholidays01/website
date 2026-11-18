import { readVehicleImage } from "@/lib/cab/media";
import { cabErrorResponse } from "@/lib/cab/security";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; const bytes = await readVehicleImage(id); return new Response(new Uint8Array(bytes), { headers: { "Content-Type": id.endsWith(".png") ? "image/png" : id.endsWith(".webp") ? "image/webp" : "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } }); } catch (e) { return cabErrorResponse(e); }
}
