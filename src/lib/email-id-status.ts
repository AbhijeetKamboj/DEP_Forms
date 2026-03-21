import type { EmailIdApprovalRecord, ForwardingSection } from "@/lib/mock-db";

const SECTION_LABEL: Record<ForwardingSection, string> = {
  ACADEMICS: "Academics",
  ESTABLISHMENT: "Establishment",
  RESEARCH_AND_DEVELOPMENT: "R&D",
};

export function getForwardingSectionLabel(section: ForwardingSection | null | undefined) {
  if (!section) {
    return "Forwarding Authority";
  }
  return SECTION_LABEL[section];
}

export function getEmailFormStatusText(input: {
  status: "PENDING" | "FORWARDED" | "ISSUED" | "REJECTED";
  approvals?: EmailIdApprovalRecord[];
}) {
  if (input.status === "REJECTED") {
    return "Rejected";
  }

  if (input.status === "ISSUED") {
    return "Completed - Email issued";
  }

  const stage1 = input.approvals?.find((approval) => approval.stage === 1);
  if (stage1?.forwardingSection) {
    return `Pending - Signed by ${getForwardingSectionLabel(stage1.forwardingSection)}`;
  }

  return "Pending - Submitted";
}

export function getEmailFormStatusBadgeClass(status: "PENDING" | "FORWARDED" | "ISSUED" | "REJECTED") {
  if (status === "REJECTED") {
    return "bg-red-100 text-red-700";
  }
  if (status === "ISSUED") {
    return "bg-green-100 text-green-700";
  }
  return "bg-amber-100 text-amber-700";
}
