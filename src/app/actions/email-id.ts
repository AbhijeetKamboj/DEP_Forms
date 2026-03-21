"use server";

import { requireRole } from "@/lib/auth";
import {
  addForwardingApproval,
  addIssueApproval,
  createEmailIdForm,
  getEmailIdFormById,
  hasIssuedEmailForUser,
  rejectEmailIdForm,
} from "@/lib/email-id-store";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Mirrors the Prisma enum – safe to use before client generation
export type ForwardingSection =
  | "ACADEMICS"
  | "ESTABLISHMENT"
  | "RESEARCH_AND_DEVELOPMENT";

function requiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

// ─── Submit (anyone) ─────────────────────────────────────────────────────────

export async function submitEmailIdForm(formData: FormData) {
  const user = await requireRole(["STUDENT", "INTERN", "EMPLOYEE"]);

  const alreadyIssued = await hasIssuedEmailForUser(user.id);
  if (alreadyIssued) {
    throw new Error(
      "An Email ID has already been issued for your account. You cannot submit this form again."
    );
  }

  const natureOfEngagement = requiredString(
    formData,
    "natureOfEngagement",
    "Nature of engagement"
  );
  const isTemp =
    natureOfEngagement.toLowerCase().includes("temp") ||
    natureOfEngagement.toLowerCase().includes("project");

  const joiningRaw = String(formData.get("joiningDate") ?? "").trim();
  const endRaw = String(formData.get("anticipatedEndDate") ?? "").trim();
  const projectName = String(formData.get("projectName") ?? "").trim();
  const reportingOfficerName = String(formData.get("reportingOfficerName") ?? "").trim();
  const reportingOfficerEmail = String(formData.get("reportingOfficerEmail") ?? "").trim();

  if (isTemp) {
    if (!projectName || !joiningRaw || !endRaw || !reportingOfficerName || !reportingOfficerEmail) {
      throw new Error("All Temp / Project Staff details are required.");
    }
  }

  const consentAccepted = formData.get("consentAccepted") === "on";
  if (!consentAccepted) {
    throw new Error("Consent acceptance is required.");
  }

  const form = await createEmailIdForm({
    submittedById: user.id,
    submittedByEmail: user.email,
    initials: requiredString(formData, "initials", "Initials"),
    firstName: requiredString(formData, "firstName", "First name"),
    lastName: requiredString(formData, "lastName", "Last name"),
    gender: requiredString(formData, "gender", "Gender"),
    permanentAddress: requiredString(formData, "permanentAddress", "Permanent address"),
    orgId: requiredString(formData, "orgId", "Organisation / Roll ID"),
    natureOfEngagement,
    role: requiredString(formData, "role", "Role"),
    department: requiredString(formData, "department", "Department / Section"),
    projectName: isTemp ? projectName : null,
    joiningDate: isTemp && joiningRaw ? new Date(joiningRaw) : null,
    anticipatedEndDate: isTemp && endRaw ? new Date(endRaw) : null,
    reportingOfficerName: isTemp
      ? reportingOfficerName
      : null,
    reportingOfficerEmail: isTemp
      ? reportingOfficerEmail
      : null,
    mobileNo: requiredString(formData, "mobileNo", "Mobile number"),
    alternateEmail: requiredString(formData, "alternateEmail", "Alternate email"),
    consentAccepted,
  });

  redirect(`/forms/email-id/${form.id}`);
}

// ─── Stage 1: Forwarding Authority ───────────────────────────────────────────

export async function forwardEmailIdForm(
  formId: string,
  section: ForwardingSection,
  approverName: string
) {
  await requireRole([
    "FORWARDING_AUTHORITY_ACADEMICS",
    "ESTABLISHMENT",
    "FORWARDING_AUTHORITY_R_AND_D",
    "SYSTEM_ADMIN",
  ]);

  const form = await getEmailIdFormById(formId);
  if (!form) {
    throw new Error("Form not found.");
  }
  if (form.status !== "PENDING") {
    throw new Error("Form is not in PENDING state.");
  }

  await addForwardingApproval({ formId, section, approverName });

  revalidatePath(`/dashboard/email-id/${formId}`);
  revalidatePath("/dashboard/email-id/academics");
  revalidatePath("/dashboard/email-id/establishment");
  revalidatePath("/dashboard/email-id/rnd");
  revalidatePath(`/forms/email-id/${formId}`);
}

// ─── Stage 2: IT Admin issues the email ID ────────────────────────────────────

export async function issueEmailId(
  formId: string,
  assignedEmailId: string,
  dateOfCreation: string,
  tentativeRemovalDate: string | null,
  idCreatedBy: string
) {
  await requireRole(["IT_ADMIN", "SYSTEM_ADMIN"]);

  const form = await getEmailIdFormById(formId);
  if (!form) {
    throw new Error("Form not found.");
  }
  if (form.status !== "FORWARDED") {
    throw new Error("Form has not been forwarded yet.");
  }

  await addIssueApproval({
    formId,
    assignedEmailId,
    dateOfCreation,
    tentativeRemovalDate,
    idCreatedBy,
  });

  revalidatePath(`/dashboard/email-id/${formId}`);
  revalidatePath(`/forms/email-id/${formId}`);
}

export async function rejectEmailIdByForwardingAuthority(
  formId: string,
  section: ForwardingSection,
  approverName: string,
  remark: string
) {
  await requireRole([
    "FORWARDING_AUTHORITY_ACADEMICS",
    "ESTABLISHMENT",
    "FORWARDING_AUTHORITY_R_AND_D",
    "SYSTEM_ADMIN",
  ]);

  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const form = await getEmailIdFormById(formId);
  if (!form) {
    throw new Error("Form not found.");
  }
  if (form.status !== "PENDING") {
    throw new Error("Form is not in PENDING state.");
  }

  await rejectEmailIdForm({ formId, section, approverName, remark: remark.trim() });

  revalidatePath(`/dashboard/email-id/${formId}`);
  revalidatePath("/dashboard/email-id/academics");
  revalidatePath("/dashboard/email-id/establishment");
  revalidatePath("/dashboard/email-id/rnd");
  revalidatePath(`/forms/email-id/${formId}`);
}

export async function bulkReviewEmailIdForms(input: {
  formIds: string[];
  section: ForwardingSection;
  approverName: string;
  remark: string;
  decision: "approve" | "reject";
}) {
  await requireRole([
    "FORWARDING_AUTHORITY_ACADEMICS",
    "ESTABLISHMENT",
    "FORWARDING_AUTHORITY_R_AND_D",
    "SYSTEM_ADMIN",
  ]);

  const ids = input.formIds.filter(Boolean);
  if (ids.length === 0) {
    throw new Error("Please select at least one request.");
  }
  if (!input.approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!input.remark.trim()) {
    throw new Error("Bulk remark is required.");
  }

  for (const formId of ids) {
    const form = await getEmailIdFormById(formId);
    if (!form || form.status !== "PENDING") {
      continue;
    }

    if (input.decision === "approve") {
      await addForwardingApproval({
        formId,
        section: input.section,
        approverName: `${input.approverName} | ${input.remark.trim()}`,
      });
    } else {
      await rejectEmailIdForm({
        formId,
        section: input.section,
        approverName: input.approverName,
        remark: input.remark,
      });
    }
  }

  revalidatePath("/dashboard/email-id/academics");
  revalidatePath("/dashboard/email-id/establishment");
  revalidatePath("/dashboard/email-id/rnd");
}
