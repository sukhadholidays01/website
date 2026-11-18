import { NextResponse, type NextRequest } from "next/server";
import { validateAdminSession } from "@/lib/cab/security";
export async function proxy(request: NextRequest) {
  if (["/admin/login", "/admin/forgot-password", "/admin/reset-password"].includes(request.nextUrl.pathname)) return NextResponse.next();
  try { if (await validateAdminSession(request.cookies.get("cab_ops_session")?.value || "")) return NextResponse.next(); }
  catch { /* Fail closed; database and configuration errors never grant access. */ }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}
export const config = { matcher: ["/admin/:path*"] };
