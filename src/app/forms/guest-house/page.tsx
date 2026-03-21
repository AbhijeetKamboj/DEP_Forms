import { requireApplicantFormAccess } from "@/lib/auth";
import { GuestHouseFormClient } from "./guest-house-form-client";

export default async function GuestHouseFormPage() {
  await requireApplicantFormAccess("guest-house");
  return <GuestHouseFormClient />;
}
