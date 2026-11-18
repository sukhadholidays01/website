import { CabOperations } from "@/components/cabs/CabOperationsWorkspace";
import { redirect } from "next/navigation";
import { hasCabAdmin } from "@/lib/cab/security";
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (!(await hasCabAdmin())) redirect("/admin/login");
  const query = await searchParams;
  return <CabOperations embedded view={typeof query.view === "string" ? query.view : "dashboard"} />;
}
