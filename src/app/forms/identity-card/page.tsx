import { requireApplicantFormAccess } from "@/lib/auth";
import { IdentityCardFormClient } from "./identity-card-form-client";

export default async function IdentityCardFormPage() {
  const user = await requireApplicantFormAccess("identity-card");

  return <IdentityCardFormClient userEmail={user.email} userFullName={user.fullName ?? ""} />;
}
