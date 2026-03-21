"use server";

import { requireRole } from "@/lib/auth";
import {
  approveIdentityCardStage1,
  approveIdentityCardStage2,
  approveIdentityCardStage3,
  createIdentityCardForm,
  getIdentityCardFormById,
  rejectIdentityCardStage,
  resolveWorkflowUserIdForActor,
} from "@/lib/identity-card-store";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function requiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

async function requiredFile(formData: FormData, key: string, label: string) {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`${label} is required.`);
  }

  return {
    fileName: value.name,
    mimeType: value.type || "application/octet-stream",
    buffer: Buffer.from(await value.arrayBuffer()),
  };
}

export async function submitIdentityCardForm(formData: FormData) {
  const user = await requireRole(["STUDENT", "INTERN", "EMPLOYEE"]);

  const cardType = requiredString(formData, "cardType", "Card type").toLowerCase();
  if (!["fresh", "renewal", "duplicate"].includes(cardType)) {
    throw new Error("Card type is invalid.");
  }

  const isRenewal = cardType === "renewal";
  const isDuplicate = cardType === "duplicate";
  const employmentType = requiredString(formData, "employmentType", "Employment type");
  const contractUptoValue = String(formData.get("contractUpto") ?? "").trim();

  const normalizedEmployment = employmentType.toLowerCase();
  const requiresContractUpto =
    normalizedEmployment === "temporary" || normalizedEmployment === "on contract";

  if (requiresContractUpto && !contractUptoValue) {
    throw new Error("Contract Upto is required for Temporary or On contract employment type.");
  }

  const previousCardValidity = isRenewal
    ? requiredString(formData, "previousCardValidity", "Previous card validity")
    : null;

  const reasonForRenewal = isRenewal || isDuplicate
    ? requiredString(formData, "reasonForRenewal", "Reason")
    : null;

  const passportPhoto = await requiredFile(formData, "passportPhoto", "Passport photo");
  const previousIdCard = isRenewal || isDuplicate
    ? await requiredFile(formData, "previousIdCard", "Previous ID card copy")
    : null;

  const submissionId = await createIdentityCardForm({
    submitter: {
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? null,
      role: user.role,
    },
    nameInCapitals: requiredString(formData, "nameInCapitals", "Name in capital letters"),
    employeeCodeSnapshot: requiredString(formData, "employeeCode", "Employee/Entry code"),
    designationSnapshot: requiredString(formData, "designation", "Designation"),
    employmentType,
    contractUpto: contractUptoValue || null,
    departmentSnapshot: requiredString(formData, "department", "Department"),
    fathersHusbandName: requiredString(formData, "fathersHusbandName", "Father/Husband name"),
    dateOfBirth: requiredString(formData, "dateOfBirth", "Date of birth"),
    dateOfJoining: requiredString(formData, "dateOfJoining", "Date of joining"),
    bloodGroup: requiredString(formData, "bloodGroup", "Blood group"),
    presentAddress: requiredString(formData, "presentAddress", "Present address"),
    presentAddressLine2: requiredString(formData, "presentAddressLine2", "Present address line 2"),
    officePhone: requiredString(formData, "officePhone", "Office phone"),
    mobileNumber: requiredString(formData, "mobileNumber", "Mobile number"),
    emailId: requiredString(formData, "emailId", "Email ID"),
    cardType: cardType as "fresh" | "renewal" | "duplicate",
    previousCardValidity,
    reasonForRenewal,
    attachments: {
      passportPhoto,
      previousIdCard,
      depositSlip: null,
      firCopy: null,
    },
  });

  redirect(`/forms/identity-card/${submissionId}`);
}

export async function approveIdentityCardByHodOrSectionHead(
  submissionId: string,
  approverName: string
) {
  const user = await requireRole(["HOD", "SECTION_HEAD", "SYSTEM_ADMIN"]);

  const form = await getIdentityCardFormById(submissionId);
  if (!form) {
    throw new Error("Identity card form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 1) {
    throw new Error("This form is not at HoD/Section Head stage.");
  }

  const roleLabel = user.role === "SECTION_HEAD" ? "Section Head" : "HoD";
  await approveIdentityCardStage1({
    submissionId,
    approverName: approverName.trim(),
    approverRoleLabel: roleLabel,
  });

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card/hod-section-head");
  revalidatePath("/dashboard/identity-card/deputy-registrar");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function rejectIdentityCardByHodOrSectionHead(
  submissionId: string,
  approverName: string,
  remark: string
) {
  await requireRole(["HOD", "SECTION_HEAD", "SYSTEM_ADMIN"]);

  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const form = await getIdentityCardFormById(submissionId);
  if (!form) {
    throw new Error("Identity card form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 1) {
    throw new Error("This form is not at HoD/Section Head stage.");
  }

  await rejectIdentityCardStage({
    submissionId,
    stageNumber: 1,
    approverName: approverName.trim(),
    approverRoleLabel: "HoD/Section Head",
    remark: remark.trim(),
  });

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card/hod-section-head");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function approveIdentityCardByDeputyRegistrar(
  submissionId: string,
  approverName: string
) {
  const user = await requireRole(["ESTABLISHMENT", "SYSTEM_ADMIN"]);

  const form = await getIdentityCardFormById(submissionId);
  if (!form) {
    throw new Error("Identity card form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 2) {
    throw new Error("This form is not at Deputy Registrar stage.");
  }

  const workflowUserId = await resolveWorkflowUserIdForActor({
    email: user.email,
    fullName: user.fullName ?? null,
    role: user.role,
  });

  await approveIdentityCardStage2({
    submissionId,
    approverName: approverName.trim(),
    approverWorkflowUserId: workflowUserId,
  });

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card/deputy-registrar");
  revalidatePath("/dashboard/identity-card/registrar");
  revalidatePath("/dashboard/identity-card/dean-faa");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function rejectIdentityCardByDeputyRegistrar(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const user = await requireRole(["ESTABLISHMENT", "SYSTEM_ADMIN"]);

  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const form = await getIdentityCardFormById(submissionId);
  if (!form) {
    throw new Error("Identity card form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 2) {
    throw new Error("This form is not at Deputy Registrar stage.");
  }

  const workflowUserId = await resolveWorkflowUserIdForActor({
    email: user.email,
    fullName: user.fullName ?? null,
    role: user.role,
  });

  await rejectIdentityCardStage({
    submissionId,
    stageNumber: 2,
    approverName: approverName.trim(),
    approverRoleLabel: "Deputy Registrar",
    remark: remark.trim(),
    approverWorkflowUserId: workflowUserId,
  });

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card/deputy-registrar");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function approveIdentityCardByRegistrarOrDean(
  submissionId: string,
  approverName: string
) {
  const user = await requireRole(["REGISTRAR", "DEAN_FAA", "SYSTEM_ADMIN"]);

  const form = await getIdentityCardFormById(submissionId);
  if (!form) {
    throw new Error("Identity card form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 3) {
    throw new Error("This form is not at Registrar/Dean FA&A stage.");
  }

  const workflowUserId = await resolveWorkflowUserIdForActor({
    email: user.email,
    fullName: user.fullName ?? null,
    role: user.role,
  });

  await approveIdentityCardStage3({
    submissionId,
    approverName: approverName.trim(),
    approverRoleLabel:
      user.role === "DEAN_FAA" ? "Dean FA&A" : user.role === "REGISTRAR" ? "Registrar" : "System Admin",
    approverWorkflowUserId: workflowUserId,
  });

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card/registrar");
  revalidatePath("/dashboard/identity-card/dean-faa");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function rejectIdentityCardByRegistrarOrDean(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const user = await requireRole(["REGISTRAR", "DEAN_FAA", "SYSTEM_ADMIN"]);

  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const form = await getIdentityCardFormById(submissionId);
  if (!form) {
    throw new Error("Identity card form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 3) {
    throw new Error("This form is not at Registrar/Dean FA&A stage.");
  }

  const workflowUserId = await resolveWorkflowUserIdForActor({
    email: user.email,
    fullName: user.fullName ?? null,
    role: user.role,
  });

  await rejectIdentityCardStage({
    submissionId,
    stageNumber: 3,
    approverName: approverName.trim(),
    approverRoleLabel:
      user.role === "DEAN_FAA" ? "Dean FA&A" : user.role === "REGISTRAR" ? "Registrar" : "System Admin",
    remark: remark.trim(),
    approverWorkflowUserId: workflowUserId,
  });

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card/registrar");
  revalidatePath("/dashboard/identity-card/dean-faa");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function bulkReviewIdentityCardForms(input: {
  submissionIds: string[];
  decision: "approve" | "reject";
  approverName: string;
  remark: string;
  stage: 1 | 2 | 3;
}) {
  const user =
    input.stage === 1
      ? await requireRole(["HOD", "SECTION_HEAD", "SYSTEM_ADMIN"])
      : input.stage === 2
        ? await requireRole(["ESTABLISHMENT", "SYSTEM_ADMIN"])
        : await requireRole(["REGISTRAR", "DEAN_FAA", "SYSTEM_ADMIN"]);

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

  const workflowUserId =
    input.stage === 2 || input.stage === 3
      ? await resolveWorkflowUserIdForActor({
          email: user.email,
          fullName: user.fullName ?? null,
          role: user.role,
        })
      : undefined;

  for (const submissionId of ids) {
    const form = await getIdentityCardFormById(submissionId);
    if (!form || form.currentStage !== input.stage) {
      continue;
    }
    if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
      continue;
    }

    if (input.stage === 1) {
      if (input.decision === "approve") {
        await approveIdentityCardStage1({
          submissionId,
          approverName: input.approverName,
          approverRoleLabel: user.role === "SECTION_HEAD" ? "Section Head" : "HoD",
        });
      } else {
        await rejectIdentityCardStage({
          submissionId,
          stageNumber: 1,
          approverName: input.approverName,
          approverRoleLabel: "HoD/Section Head",
          remark: input.remark,
        });
      }
    }

    if (input.stage === 2) {
      if (input.decision === "approve") {
        await approveIdentityCardStage2({
          submissionId,
          approverName: input.approverName,
          approverWorkflowUserId: workflowUserId!,
        });
      } else {
        await rejectIdentityCardStage({
          submissionId,
          stageNumber: 2,
          approverName: input.approverName,
          approverRoleLabel: "Establishment / Deputy Registrar",
          remark: input.remark,
          approverWorkflowUserId: workflowUserId,
        });
      }
    }

    if (input.stage === 3) {
      if (input.decision === "approve") {
        await approveIdentityCardStage3({
          submissionId,
          approverName: input.approverName,
          approverRoleLabel:
            user.role === "DEAN_FAA" ? "Dean FA&A" : user.role === "REGISTRAR" ? "Registrar" : "System Admin",
          approverWorkflowUserId: workflowUserId!,
        });
      } else {
        await rejectIdentityCardStage({
          submissionId,
          stageNumber: 3,
          approverName: input.approverName,
          approverRoleLabel:
            user.role === "DEAN_FAA" ? "Dean FA&A" : user.role === "REGISTRAR" ? "Registrar" : "System Admin",
          remark: input.remark,
          approverWorkflowUserId: workflowUserId,
        });
      }
    }
  }

  revalidatePath("/dashboard/identity-card/hod-section-head");
  revalidatePath("/dashboard/identity-card/deputy-registrar");
  revalidatePath("/dashboard/identity-card/registrar");
  revalidatePath("/dashboard/identity-card/dean-faa");
}
