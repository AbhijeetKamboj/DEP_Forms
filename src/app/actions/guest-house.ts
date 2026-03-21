"use server";

import { canAccessApplicantForm, requireRole, requireUser } from "@/lib/auth";
import {
  approveGuestHouseStage1,
  approveGuestHouseStage2,
  approveGuestHouseStage3,
  createGuestHouseForm,
  getGuestHouseFormById,
  rejectGuestHouseStage1,
  rejectGuestHouseStage2,
  rejectGuestHouseStage3,
} from "@/lib/guest-house-store";
import { canRoleApproveGuestHouseStage1 } from "@/lib/guest-house-approver-matrix";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitGuestHouseForm(formData: FormData) {
  const user = await requireUser();
  if (!canAccessApplicantForm(user.email, user.role, "guest-house")) {
    throw new Error("You are not allowed to submit Guest House form.");
  }

  const guestName = String(formData.get("guestName") ?? "").trim();
  const guestGender = String(formData.get("guestGender") ?? "").trim();
  const guestAddress = String(formData.get("guestAddress") ?? "").trim();
  const contactNumber = String(formData.get("contactNumber") ?? "").trim();
  const purposeOfBooking = String(formData.get("purposeOfBooking") ?? "").trim();
  const numberOfGuests = String(formData.get("numberOfGuests") ?? "").trim();
  const numberOfRoomsRequired = String(formData.get("numberOfRoomsRequired") ?? "").trim();
  const occupancyType = String(formData.get("occupancyType") ?? "").trim();
  const arrivalDateRaw = String(formData.get("arrivalDate") ?? "").trim();
  const arrivalTimeRaw = String(formData.get("arrivalTime") ?? "").trim();
  const departureDateRaw = String(formData.get("departureDate") ?? "").trim();
  const departureTimeRaw = String(formData.get("departureTime") ?? "").trim();
  const roomType = String(formData.get("roomType") ?? "").trim();
  const bookingCategory = String(formData.get("bookingCategory") ?? "").trim();
  const bookingDate = String(formData.get("bookingDate") ?? "").trim();
  const remarksIfAny = String(formData.get("remarksIfAny") ?? "").trim();
  const budgetDepartment = String(formData.get("budgetDepartment") ?? "").trim();
  const proposerName = String(formData.get("proposerName") ?? "").trim();
  const proposerDesignation = String(formData.get("proposerDesignation") ?? "").trim();
  const proposerDepartment = String(formData.get("proposerDepartment") ?? "").trim();
  const proposerEmployeeCode = String(formData.get("proposerEmployeeCode") ?? "").trim();
  const proposerEntryNumber = String(formData.get("proposerEntryNumber") ?? "").trim();
  const proposerMobile = String(formData.get("proposerMobile") ?? "").trim();
  const isInstituteGuestRaw = String(formData.get("isInstituteGuest") ?? "").trim().toLowerCase();
  const guestToBeCharged = formData.get("guestToBeCharged") === "on";
  const boardingLodgingByGuestRaw = String(formData.get("boardingLodgingByGuest") ?? "").trim().toLowerCase();
  const undertakingAccepted = formData.get("undertakingAccepted") === "on";

  const categoryAmountMap: Record<string, Record<string, number>> = {
    executive_suite: {
      cat_a: 0,
      cat_b: 3500,
    },
    business_room: {
      cat_a: 0,
      b_1: 2000,
      b_2: 1200,
    },
  };

  if (
    !guestName ||
    !guestGender ||
    !guestAddress ||
    !contactNumber ||
    !purposeOfBooking ||
    !numberOfGuests ||
    !numberOfRoomsRequired ||
    !occupancyType ||
    !arrivalDateRaw ||
    !arrivalTimeRaw ||
    !departureDateRaw ||
    !departureTimeRaw ||
    !roomType ||
    !bookingCategory ||
    !bookingDate ||
    !proposerName ||
    !proposerDesignation ||
    !proposerDepartment ||
    !proposerMobile ||
    !isInstituteGuestRaw ||
    !boardingLodgingByGuestRaw
  ) {
    throw new Error("Please fill all required guest house form fields.");
  }

  const roomTypeKey = roomType === "business_room" ? "business_room" : "executive_suite";
  const validCategoryMap = categoryAmountMap[roomTypeKey];
  const expectedAmount = validCategoryMap[bookingCategory];
  if (expectedAmount === undefined) {
    throw new Error("Selected booking category is invalid for the chosen room type.");
  }
  const parsedTariffAmount = expectedAmount;

  const guestNotToBeCharged = !guestToBeCharged;
  if (guestNotToBeCharged && !budgetDepartment) {
    throw new Error("Project no / Budget Head is required when guest is not to be charged.");
  }
  if (!undertakingAccepted) {
    throw new Error("Please accept the undertaking to submit this form.");
  }

  const isInstituteGuest = isInstituteGuestRaw === "yes";

  const createdId = await createGuestHouseForm({
    submitter: {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    guestName,
    guestGender,
    guestAddress,
    contactNumber,
    numberOfGuests: Number(numberOfGuests),
    numberOfRoomsRequired: Number(numberOfRoomsRequired),
    occupancyType: occupancyType === "double" ? "double" : "single",
    arrivalDate: arrivalDateRaw,
    arrivalTime: arrivalTimeRaw,
    departureDate: departureDateRaw,
    departureTime: departureTimeRaw,
    purposeOfBooking,
    roomType: roomType === "business_room" ? "business_room" : "executive_suite",
    bookExecutiveSuite: roomType === "executive_suite",
    bookBusinessRoom: roomType === "business_room",
    bookingCategory,
    categoryTariffAmount: String(parsedTariffAmount),
    remarksIfAny,
    boardingLodgingByGuest: boardingLodgingByGuestRaw === "yes",
    isInstituteGuest,
    guestNotToBeCharged,
    budgetDepartment: budgetDepartment || null,
    bookingDate,
    proposer: {
      nameOfProposer: proposerName,
      designation: proposerDesignation,
      department: proposerDepartment,
      employeeCode: proposerEmployeeCode,
      entryNumber: proposerEntryNumber,
      mobileNumber: proposerMobile,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard/guest-house/approving-authority");
  redirect(`/forms/guest-house/${createdId}`);
}

export async function approveGuestHouseByApprovingAuthority(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const user = await requireUser();

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and remark are required.");
  }

  const form = await getGuestHouseFormById(submissionId);
  if (!form) {
    throw new Error("Guest house form not found.");
  }

  if (
    !canRoleApproveGuestHouseStage1(user.role, {
      roomType: form.roomType,
      bookingCategory: form.bookingCategory ?? "",
    })
  ) {
    throw new Error("You are not authorized to approve Stage 1 for this booking category.");
  }

  await approveGuestHouseStage1({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });

  revalidatePath("/dashboard/guest-house/approving-authority");
  revalidatePath("/dashboard/guest-house/in-charge");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function rejectGuestHouseByApprovingAuthority(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const user = await requireUser();

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and rejection remark are required.");
  }

  const form = await getGuestHouseFormById(submissionId);
  if (!form) {
    throw new Error("Guest house form not found.");
  }

  if (
    !canRoleApproveGuestHouseStage1(user.role, {
      roomType: form.roomType,
      bookingCategory: form.bookingCategory ?? "",
    })
  ) {
    throw new Error("You are not authorized to reject Stage 1 for this booking category.");
  }

  await rejectGuestHouseStage1({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });

  revalidatePath("/dashboard/guest-house/approving-authority");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function approveGuestHouseByIncharge(input: {
  submissionId: string;
  approverName: string;
  roomNoConfirmed: string;
  entryDate: string;
  checkInDateTime: string;
  checkOutDateTime: string;
  officeRemarks: string;
}) {
  await requireRole(["GUEST_HOUSE_INCHARGE", "SYSTEM_ADMIN"]);

  if (
    !input.approverName.trim() ||
    !input.roomNoConfirmed.trim() ||
    !input.entryDate.trim() ||
    !input.checkInDateTime.trim() ||
    !input.checkOutDateTime.trim() ||
    !input.officeRemarks.trim()
  ) {
    throw new Error("All Stage 2 fields are required.");
  }

  await approveGuestHouseStage2({
    submissionId: input.submissionId,
    approverName: input.approverName.trim(),
    roomNoConfirmed: input.roomNoConfirmed.trim(),
    entryDate: input.entryDate.trim(),
    checkInDateTime: input.checkInDateTime.trim(),
    checkOutDateTime: input.checkOutDateTime.trim(),
    officeRemarks: input.officeRemarks.trim(),
  });

  revalidatePath("/dashboard/guest-house/in-charge");
  revalidatePath("/dashboard/guest-house/chairman");
  revalidatePath(`/dashboard/guest-house/${input.submissionId}`);
  revalidatePath(`/forms/guest-house/${input.submissionId}`);
}

export async function rejectGuestHouseByIncharge(
  submissionId: string,
  approverName: string,
  remark: string
) {
  await requireRole(["GUEST_HOUSE_INCHARGE", "SYSTEM_ADMIN"]);

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and rejection remark are required.");
  }

  await rejectGuestHouseStage2({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });

  revalidatePath("/dashboard/guest-house/in-charge");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function approveGuestHouseByChairman(
  submissionId: string,
  approverName: string,
  remark: string
) {
  await requireRole(["GUEST_HOUSE_COMMITTEE_CHAIR", "SYSTEM_ADMIN"]);

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and remark are required.");
  }

  await approveGuestHouseStage3({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });

  revalidatePath("/dashboard/guest-house/chairman");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function rejectGuestHouseByChairman(
  submissionId: string,
  approverName: string,
  remark: string
) {
  await requireRole(["GUEST_HOUSE_COMMITTEE_CHAIR", "SYSTEM_ADMIN"]);

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and rejection remark are required.");
  }

  await rejectGuestHouseStage3({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });

  revalidatePath("/dashboard/guest-house/chairman");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function bulkReviewGuestHouseForms(input: {
  submissionIds: string[];
  decision: "approve" | "reject";
  approverName: string;
  remark: string;
  stage: 1 | 2 | 3;
}) {
  if (!input.submissionIds.length) {
    throw new Error("No forms selected for bulk review.");
  }

  if (!input.approverName.trim() || !input.remark.trim()) {
    throw new Error("Approver name and remark are required.");
  }

  if (input.stage === 1) {
    const user = await requireUser();

    for (const submissionId of input.submissionIds) {
      const form = await getGuestHouseFormById(submissionId);
      if (!form) {
        throw new Error(`Guest house form not found: ${submissionId}`);
      }

      if (
        !canRoleApproveGuestHouseStage1(user.role, {
          roomType: form.roomType,
          bookingCategory: form.bookingCategory ?? "",
        })
      ) {
        throw new Error(
          `You are not authorized to review Stage 1 for ${form.guestName} (${form.bookingCategory ?? "N/A"}).`
        );
      }
    }
  } else if (input.stage === 2) {
    await requireRole(["GUEST_HOUSE_INCHARGE", "SYSTEM_ADMIN"]);
  } else {
    await requireRole(["GUEST_HOUSE_COMMITTEE_CHAIR", "SYSTEM_ADMIN"]);
  }

  for (const submissionId of input.submissionIds) {
    if (input.stage === 1) {
      if (input.decision === "approve") {
        await approveGuestHouseStage1({
          submissionId,
          approverName: input.approverName,
          remark: input.remark,
        });
      } else {
        await rejectGuestHouseStage1({
          submissionId,
          approverName: input.approverName,
          remark: input.remark,
        });
      }
      continue;
    }

    if (input.stage === 2) {
      if (input.decision === "approve") {
        await approveGuestHouseStage2({
          submissionId,
          approverName: input.approverName,
          roomNoConfirmed: "To be allotted",
          entryDate: new Date().toISOString().slice(0, 10),
          checkInDateTime: new Date().toISOString(),
          checkOutDateTime: new Date().toISOString(),
          officeRemarks: input.remark,
        });
      } else {
        await rejectGuestHouseStage2({
          submissionId,
          approverName: input.approverName,
          remark: input.remark,
        });
      }
      continue;
    }

    if (input.decision === "approve") {
      await approveGuestHouseStage3({
        submissionId,
        approverName: input.approverName,
        remark: input.remark,
      });
    } else {
      await rejectGuestHouseStage3({
        submissionId,
        approverName: input.approverName,
        remark: input.remark,
      });
    }
  }

  revalidatePath("/dashboard/guest-house/approving-authority");
  revalidatePath("/dashboard/guest-house/in-charge");
  revalidatePath("/dashboard/guest-house/chairman");
}
