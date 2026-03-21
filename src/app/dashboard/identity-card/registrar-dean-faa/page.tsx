import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LegacyRegistrarDeanDashboardPage() {
  const user = await requireRole(["REGISTRAR", "DEAN_FAA", "SYSTEM_ADMIN"]);

  if (user.role === "DEAN_FAA") {
    redirect("/dashboard/identity-card/dean-faa");
  }

  redirect("/dashboard/identity-card/registrar");
}
