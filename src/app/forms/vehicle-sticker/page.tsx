import { requireApplicantFormAccess } from "@/lib/auth";
import { VehicleStickerFormClient } from "./vehicle-sticker-form-client";

export default async function VehicleStickerFormPage() {
  await requireApplicantFormAccess("vehicle-sticker");
  return <VehicleStickerFormClient />;
}
