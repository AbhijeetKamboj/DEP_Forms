import type { HostelUndertakingFormRecord } from "@/lib/hostel-undertaking-store";

export function getHostelUndertakingStatusText(form: HostelUndertakingFormRecord) {
  if (form.overallStatus === "rejected") {
    return "Rejected by Hostel Warden";
  }

  if (form.overallStatus === "approved") {
    return "Completed - Acknowledged by Hostel Warden";
  }

  return "Pending - Submitted";
}

export function getHostelUndertakingStatusBadgeClass(form: HostelUndertakingFormRecord) {
  if (form.overallStatus === "rejected") {
    return "bg-red-100 text-red-700";
  }
  if (form.overallStatus === "approved") {
    return "bg-green-100 text-green-700";
  }
  return "bg-amber-100 text-amber-700";
}
