"use server";

import { requireRole } from "@/lib/auth";
import {
  approveVehicleStickerStage1,
  approveVehicleStickerStage2,
  approveVehicleStickerStage3,
  approveVehicleStickerStage4,
  createVehicleStickerForm,
  getVehicleStickerFormById,
  rejectVehicleStickerStage1,
  rejectVehicleStickerStage2,
  rejectVehicleStickerStage3,
  rejectVehicleStickerStage4,
  upsertVehicleStickerAttachmentsForSubmission,
} from "@/lib/vehicle-sticker-store";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitVehicleStickerForm(formData: FormData) {
  const user = await requireRole(["STUDENT", "INTERN", "EMPLOYEE"]);

  const registrationNo = String(formData.get("vehicleRegistrationNo") ?? "").trim();
  const vehicleType = String(formData.get("vehicleType") ?? "").trim();
  const makeModel = String(formData.get("vehicleMakeModel") ?? "").trim();
  const colour = String(formData.get("vehicleColour") ?? "").trim();

  if (!registrationNo || !vehicleType || !makeModel || !colour) {
    throw new Error("Please fill all vehicle details.");
  }

  const vehicleDetails = [
    {
      serialNo: 1,
      registrationNo,
      vehicleType: vehicleType as "2W" | "4W",
      makeModel,
      colour,
    },
  ];

  const requiredFiles: Array<{ key: string; label: string }> = [
    { key: "applicantPhoto", label: "Applicant Photo" },
    { key: "vehicleRc", label: "Vehicle RC" },
    { key: "drivingLicenseDoc", label: "Driving License (DL)" },
    { key: "collegeIdDoc", label: "College ID" },
  ];

  for (const fileField of requiredFiles) {
    const value = formData.get(fileField.key);
    if (!(value instanceof File) || value.size === 0) {
      throw new Error(`${fileField.label} is required.`);
    }
  }

  const applicantPhoto = formData.get("applicantPhoto") as File;
  const vehicleRc = formData.get("vehicleRc") as File;
  const drivingLicenseDoc = formData.get("drivingLicenseDoc") as File;
  const collegeIdDoc = formData.get("collegeIdDoc") as File;

  const applicantName = String(formData.get("applicantName") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const entryOrEmpNo = String(formData.get("entryOrEmpNo") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const emailContact = String(formData.get("emailContact") ?? "").trim();
  const drivingLicenseNo = String(formData.get("drivingLicenseNo") ?? "").trim();
  const dlValidUpto = String(formData.get("dlValidUpto") ?? "").trim();
  const declarationDateRaw = String(formData.get("declarationDate") ?? "").trim();

  if (
    !applicantName ||
    !designation ||
    !entryOrEmpNo ||
    !department ||
    !address ||
    !phone ||
    !emailContact ||
    !drivingLicenseNo ||
    !dlValidUpto ||
    !declarationDateRaw
  ) {
    throw new Error("Please fill all required fields.");
  }

  const submissionId = await createVehicleStickerForm({
    submitter: {
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? null,
      role: user.role,
    },
    applicantName,
    designation,
    department,
    entryOrEmpNo,
    address,
    phone,
    emailContact,
    drivingLicenseNo,
    dlValidUpto,
    declarationDate: declarationDateRaw,
    vehicleDetails,
    attachments: {
      applicantPhoto: {
        fileName: applicantPhoto.name,
        mimeType: applicantPhoto.type || "application/octet-stream",
        buffer: Buffer.from(await applicantPhoto.arrayBuffer()),
      },
      vehicleRc: {
        fileName: vehicleRc.name,
        mimeType: vehicleRc.type || "application/octet-stream",
        buffer: Buffer.from(await vehicleRc.arrayBuffer()),
      },
      drivingLicenseDoc: {
        fileName: drivingLicenseDoc.name,
        mimeType: drivingLicenseDoc.type || "application/octet-stream",
        buffer: Buffer.from(await drivingLicenseDoc.arrayBuffer()),
      },
      collegeIdDoc: {
        fileName: collegeIdDoc.name,
        mimeType: collegeIdDoc.type || "application/octet-stream",
        buffer: Buffer.from(await collegeIdDoc.arrayBuffer()),
      },
    },
  });

  redirect(`/forms/vehicle-sticker/${submissionId}`);
}

export async function approveVehicleStickerBySupervisor(
  submissionId: string,
  approverName: string
) {
  await requireRole(["SUPERVISOR", "SYSTEM_ADMIN"]);

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 1) {
    throw new Error("This form is not at Supervisor stage.");
  }

  await approveVehicleStickerStage1({ submissionId, approverName });

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker/supervisor");
  revalidatePath("/dashboard/vehicle-sticker/hod");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function rejectVehicleStickerBySupervisor(
  submissionId: string,
  approverName: string,
  remark: string
) {
  await requireRole(["SUPERVISOR", "SYSTEM_ADMIN"]);

  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 1) {
    throw new Error("This form is not at Supervisor stage.");
  }

  await rejectVehicleStickerStage1({ submissionId, approverName, remark: remark.trim() });

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker/supervisor");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function approveVehicleStickerByHod(
  submissionId: string,
  approverName: string
) {
  await requireRole(["HOD", "SYSTEM_ADMIN"]);

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 2) {
    throw new Error("This form is not at HoD stage.");
  }

  await approveVehicleStickerStage2({ submissionId, approverName });

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker/hod");
  revalidatePath("/dashboard/vehicle-sticker/student-affairs-hostel-mgmt");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function rejectVehicleStickerByHod(
  submissionId: string,
  approverName: string,
  remark: string
) {
  await requireRole(["HOD", "SYSTEM_ADMIN"]);

  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 2) {
    throw new Error("This form is not at HoD stage.");
  }

  await rejectVehicleStickerStage2({ submissionId, approverName, remark: remark.trim() });

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker/hod");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function approveVehicleStickerByStudentAffairsHostel(
  submissionId: string,
  approverName: string,
  residingInHostel: boolean,
  recommendationText: string
) {
  await requireRole(["STUDENT_AFFAIRS_HOSTEL_MGMT", "SYSTEM_ADMIN"]);

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 3) {
    throw new Error("This form is not at Student Affairs stage.");
  }

  await approveVehicleStickerStage3({
    submissionId,
    approverName,
    residingInHostel,
    recommendationText,
  });

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker/student-affairs-hostel-mgmt");
  revalidatePath("/dashboard/vehicle-sticker/security-office");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function rejectVehicleStickerByStudentAffairsHostel(
  submissionId: string,
  approverName: string,
  remark: string
) {
  await requireRole(["STUDENT_AFFAIRS_HOSTEL_MGMT", "SYSTEM_ADMIN"]);

  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 3) {
    throw new Error("This form is not at Student Affairs stage.");
  }

  await rejectVehicleStickerStage3({ submissionId, approverName, remark: remark.trim() });

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker/student-affairs-hostel-mgmt");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function issueVehicleStickerBySecurityOffice(
  submissionId: string,
  approverName: string,
  issuedStickerNo: string,
  validUpto: string,
  issueDate: string
) {
  await requireRole(["SECURITY_OFFICE", "SYSTEM_ADMIN"]);

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 4) {
    throw new Error("This form is not at Security Office stage.");
  }

  await approveVehicleStickerStage4({
    submissionId,
    approverName,
    issuedStickerNo,
    validUpto,
    issueDate,
  });

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker/security-office");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function rejectVehicleStickerBySecurityOffice(
  submissionId: string,
  approverName: string,
  remark: string
) {
  await requireRole(["SECURITY_OFFICE", "SYSTEM_ADMIN"]);

  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }
  if (form.currentStage !== 4) {
    throw new Error("This form is not at Security Office stage.");
  }

  await rejectVehicleStickerStage4({ submissionId, approverName, remark: remark.trim() });

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker/security-office");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function uploadMissingVehicleStickerAttachments(formData: FormData) {
  const user = await requireRole(["STUDENT", "INTERN", "EMPLOYEE", "SYSTEM_ADMIN"]);

  const submissionId = String(formData.get("submissionId") ?? "").trim();
  if (!submissionId) {
    throw new Error("Submission ID is required.");
  }

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }

  if (
    user.role !== "SYSTEM_ADMIN" &&
    form.submittedByEmail.toLowerCase() !== user.email.toLowerCase()
  ) {
    throw new Error("You are not allowed to update attachments for this form.");
  }

  const requiredFiles: Array<{ key: string; label: string }> = [
    { key: "applicantPhoto", label: "Applicant Photo" },
    { key: "vehicleRc", label: "Vehicle RC" },
    { key: "drivingLicenseDoc", label: "Driving License (DL)" },
    { key: "collegeIdDoc", label: "College ID" },
  ];

  for (const fileField of requiredFiles) {
    const value = formData.get(fileField.key);
    if (!(value instanceof File) || value.size === 0) {
      throw new Error(`${fileField.label} is required.`);
    }
  }

  const applicantPhoto = formData.get("applicantPhoto") as File;
  const vehicleRc = formData.get("vehicleRc") as File;
  const drivingLicenseDoc = formData.get("drivingLicenseDoc") as File;
  const collegeIdDoc = formData.get("collegeIdDoc") as File;

  await upsertVehicleStickerAttachmentsForSubmission({
    submissionId,
    submitter: {
      email: user.email,
      fullName: user.fullName ?? null,
      role: user.role,
    },
    attachments: {
      applicantPhoto: {
        fileName: applicantPhoto.name,
        mimeType: applicantPhoto.type || "application/octet-stream",
        buffer: Buffer.from(await applicantPhoto.arrayBuffer()),
      },
      vehicleRc: {
        fileName: vehicleRc.name,
        mimeType: vehicleRc.type || "application/octet-stream",
        buffer: Buffer.from(await vehicleRc.arrayBuffer()),
      },
      drivingLicenseDoc: {
        fileName: drivingLicenseDoc.name,
        mimeType: drivingLicenseDoc.type || "application/octet-stream",
        buffer: Buffer.from(await drivingLicenseDoc.arrayBuffer()),
      },
      collegeIdDoc: {
        fileName: collegeIdDoc.name,
        mimeType: collegeIdDoc.type || "application/octet-stream",
        buffer: Buffer.from(await collegeIdDoc.arrayBuffer()),
      },
    },
  });

  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
}

function getVehicleStickerNoForBulk(submissionId: string, index: number) {
  const seed = submissionId.replace(/-/g, "").slice(-6).toUpperCase();
  return `VS-${new Date().getFullYear()}-${seed}-${index + 1}`;
}

export async function bulkReviewVehicleStickerForms(input: {
  submissionIds: string[];
  decision: "approve" | "reject";
  approverName: string;
  remark: string;
  stage: 1 | 2 | 3 | 4;
}) {
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

  if (input.stage === 1) {
    await requireRole(["SUPERVISOR", "SYSTEM_ADMIN"]);
  } else if (input.stage === 2) {
    await requireRole(["HOD", "SYSTEM_ADMIN"]);
  } else if (input.stage === 3) {
    await requireRole(["STUDENT_AFFAIRS_HOSTEL_MGMT", "SYSTEM_ADMIN"]);
  } else {
    await requireRole(["SECURITY_OFFICE", "SYSTEM_ADMIN"]);
  }

  const now = new Date();
  const issueDate = now.toISOString().slice(0, 10);
  const validUptoDate = new Date(now);
  validUptoDate.setDate(validUptoDate.getDate() + 365);
  const validUpto = validUptoDate.toISOString().slice(0, 10);

  for (let index = 0; index < ids.length; index += 1) {
    const submissionId = ids[index];
    const form = await getVehicleStickerFormById(submissionId);
    if (!form || form.overallStatus === "approved" || form.overallStatus === "rejected") {
      continue;
    }

    if (input.stage === 1 && form.currentStage === 1) {
      if (input.decision === "approve") {
        await approveVehicleStickerStage1({ submissionId, approverName: `${input.approverName} | ${input.remark}` });
      } else {
        await rejectVehicleStickerStage1({ submissionId, approverName: input.approverName, remark: input.remark });
      }
      continue;
    }

    if (input.stage === 2 && form.currentStage === 2) {
      if (input.decision === "approve") {
        await approveVehicleStickerStage2({ submissionId, approverName: `${input.approverName} | ${input.remark}` });
      } else {
        await rejectVehicleStickerStage2({ submissionId, approverName: input.approverName, remark: input.remark });
      }
      continue;
    }

    if (input.stage === 3 && form.currentStage === 3) {
      if (input.decision === "approve") {
        await approveVehicleStickerStage3({
          submissionId,
          approverName: input.approverName,
          residingInHostel: true,
          recommendationText: input.remark,
        });
      } else {
        await rejectVehicleStickerStage3({ submissionId, approverName: input.approverName, remark: input.remark });
      }
      continue;
    }

    if (input.stage === 4 && form.currentStage === 4) {
      if (input.decision === "approve") {
        await approveVehicleStickerStage4({
          submissionId,
          approverName: input.approverName,
          issuedStickerNo: getVehicleStickerNoForBulk(submissionId, index),
          validUpto,
          issueDate,
        });
      } else {
        await rejectVehicleStickerStage4({ submissionId, approverName: input.approverName, remark: input.remark });
      }
    }
  }

  revalidatePath("/dashboard/vehicle-sticker/supervisor");
  revalidatePath("/dashboard/vehicle-sticker/hod");
  revalidatePath("/dashboard/vehicle-sticker/student-affairs-hostel-mgmt");
  revalidatePath("/dashboard/vehicle-sticker/security-office");
}
