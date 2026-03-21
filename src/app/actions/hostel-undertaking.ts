"use server";

import { requireRole } from "@/lib/auth";
import {
  approveHostelUndertakingByWarden,
  createHostelUndertakingForm,
  getHostelUndertakingFormById,
  rejectHostelUndertakingByWarden,
} from "@/lib/hostel-undertaking-store";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function requiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function requiredAmount(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

function requiredTenDigitMobile(formData: FormData, key: string, label: string) {
  const value = requiredString(formData, key, label);
  if (!/^\d{10}$/.test(value)) {
    throw new Error(`${label} must be exactly 10 digits.`);
  }
  return value;
}

async function requiredFile(
  formData: FormData,
  key: string,
  label: string,
  options?: { jpgOnly?: boolean }
) {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`${label} is required.`);
  }

  if (options?.jpgOnly) {
    const mimeType = (value.type || "").toLowerCase();
    const fileName = value.name.toLowerCase();
    const isJpgMime = mimeType === "image/jpeg" || mimeType === "image/jpg";
    const isJpgExt = fileName.endsWith(".jpg") || fileName.endsWith(".jpeg");

    if (!isJpgMime && !isJpgExt) {
      throw new Error(`${label} must be a JPG image.`);
    }
  }

  return {
    fileName: value.name,
    mimeType: value.type || "application/octet-stream",
    buffer: Buffer.from(await value.arrayBuffer()),
  };
}

export async function submitHostelUndertakingForm(formData: FormData) {
  const user = await requireRole(["STUDENT", "INTERN"]);

  const submissionId = await createHostelUndertakingForm({
    submitter: {
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? null,
      role: user.role,
    },
    studentName: requiredString(formData, "studentName", "Student name"),
    entryNumber: requiredString(formData, "entryNumber", "Entry number"),
    courseName: requiredString(formData, "courseName", "Course"),
    department: requiredString(formData, "department", "Department"),
    hostelRoomNo: requiredString(formData, "hostelRoomNo", "Hostel room number"),
    emailAddress: requiredString(formData, "emailAddress", "Email address"),
    dateOfJoining: requiredString(formData, "dateOfJoining", "Date of joining"),
    hefAmount: requiredAmount(formData, "hefAmount", "HEF amount"),
    messSecurity: requiredAmount(formData, "messSecurity", "Mess security"),
    messAdmissionFee: requiredAmount(formData, "messAdmissionFee", "Mess admission fee"),
    messCharges: requiredAmount(formData, "messCharges", "Mess charges"),
    bloodGroup: requiredString(formData, "bloodGroup", "Blood group"),
    category: requiredString(formData, "category", "Category"),
    emergencyContactNo: requiredString(formData, "emergencyContactNo", "Emergency contact number"),
    declarationDate: requiredString(formData, "declarationDate", "Declaration date"),
    parentGuardian: {
      relationship: requiredString(formData, "parentRelationship", "Parent relationship"),
      officeAddressLine1: requiredString(
        formData,
        "parentOfficeAddressLine1",
        "Parent office address line 1"
      ),
      officeAddressLine2: optionalString(formData, "parentOfficeAddressLine2"),
      officeMobile: requiredTenDigitMobile(
        formData,
        "parentOfficeMobile",
        "Parent office mobile"
      ),
      officeTelephone: optionalString(formData, "parentOfficeTelephone"),
      officeEmail: optionalString(formData, "parentOfficeEmail"),
      residenceAddressLine1: requiredString(
        formData,
        "parentResidenceAddressLine1",
        "Parent residence address line 1"
      ),
      residenceAddressLine2: optionalString(formData, "parentResidenceAddressLine2"),
      residenceMobile: optionalString(formData, "parentResidenceMobile"),
      residenceTelephone: optionalString(formData, "parentResidenceTelephone"),
      residenceEmail: optionalString(formData, "parentResidenceEmail"),
    },
    localGuardian: {
      relationship: optionalString(formData, "localRelationship"),
      officeAddressLine1: optionalString(formData, "localOfficeAddressLine1"),
      officeAddressLine2: optionalString(formData, "localOfficeAddressLine2"),
      officeMobile: optionalString(formData, "localOfficeMobile"),
      officeTelephone: optionalString(formData, "localOfficeTelephone"),
      officeEmail: optionalString(formData, "localOfficeEmail"),
      residenceAddressLine1: optionalString(formData, "localResidenceAddressLine1"),
      residenceAddressLine2: optionalString(formData, "localResidenceAddressLine2"),
      residenceMobile: optionalString(formData, "localResidenceMobile"),
      residenceTelephone: optionalString(formData, "localResidenceTelephone"),
      residenceEmail: optionalString(formData, "localResidenceEmail"),
    },
    attachments: {
      passportPhoto: await requiredFile(formData, "passportPhoto", "Passport size photo"),
      parentSignatureDoc: await requiredFile(
        formData,
        "parentSignatureDoc",
        "Signed parent undertaking",
        { jpgOnly: true }
      ),
    },
  });

  redirect(`/forms/hostel-undertaking/${submissionId}`);
}

export async function approveHostelUndertakingStageByWarden(
  submissionId: string,
  approverName: string,
  remark: string
) {
  await requireRole(["HOSTEL_WARDEN", "SYSTEM_ADMIN"]);

  const form = await getHostelUndertakingFormById(submissionId);
  if (!form) {
    throw new Error("Hostel undertaking form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 1) {
    throw new Error("This form is not at Hostel Warden stage.");
  }

  if (!approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!remark.trim()) {
    throw new Error("Remark is required.");
  }

  await approveHostelUndertakingByWarden({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });

  revalidatePath(`/dashboard/hostel-undertaking/${submissionId}`);
  revalidatePath("/dashboard/hostel-undertaking/warden");
  revalidatePath(`/forms/hostel-undertaking/${submissionId}`);
}

export async function rejectHostelUndertakingStageByWarden(
  submissionId: string,
  approverName: string,
  remark: string
) {
  await requireRole(["HOSTEL_WARDEN", "SYSTEM_ADMIN"]);

  const form = await getHostelUndertakingFormById(submissionId);
  if (!form) {
    throw new Error("Hostel undertaking form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 1) {
    throw new Error("This form is not at Hostel Warden stage.");
  }

  if (!approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  await rejectHostelUndertakingByWarden({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });

  revalidatePath(`/dashboard/hostel-undertaking/${submissionId}`);
  revalidatePath("/dashboard/hostel-undertaking/warden");
  revalidatePath(`/forms/hostel-undertaking/${submissionId}`);
}

export async function bulkReviewHostelUndertakingForms(input: {
  submissionIds: string[];
  decision: "approve" | "reject";
  approverName: string;
  remark: string;
}) {
  await requireRole(["HOSTEL_WARDEN", "SYSTEM_ADMIN"]);

  const ids = input.submissionIds.filter(Boolean);
  if (ids.length === 0) {
    throw new Error("Please select at least one request.");
  }
  if (!input.approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!input.remark.trim()) {
    throw new Error("Bulk remark is required.");
  }

  for (const submissionId of ids) {
    const form = await getHostelUndertakingFormById(submissionId);
    if (!form || form.currentStage !== 1 || form.overallStatus === "approved" || form.overallStatus === "rejected") {
      continue;
    }

    if (input.decision === "approve") {
      await approveHostelUndertakingByWarden({
        submissionId,
        approverName: input.approverName,
        remark: input.remark,
      });
    } else {
      await rejectHostelUndertakingByWarden({
        submissionId,
        approverName: input.approverName,
        remark: input.remark,
      });
    }
  }

  revalidatePath("/dashboard/hostel-undertaking/warden");
}
