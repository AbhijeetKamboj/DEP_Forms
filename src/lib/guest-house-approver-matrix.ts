import type { AppRole } from "@/lib/mock-db";

type Stage1Context = {
  roomType: "executive_suite" | "business_room";
  bookingCategory: string;
};

function normalizeBookingCategory(category: string) {
  const normalized = category.trim().toLowerCase().replace(/-/g, "_");
  if (normalized === "b1") return "b_1";
  if (normalized === "b2") return "b_2";
  return normalized;
}

export function getGuestHouseStage1AllowedRoles(context: Stage1Context): AppRole[] {
  const bookingCategory = normalizeBookingCategory(context.bookingCategory);

  if (context.roomType === "executive_suite" && bookingCategory === "cat_a") {
    return ["DIRECTOR", "DEAN_FAA"];
  }

  if (context.roomType === "executive_suite" && bookingCategory === "cat_b") {
    return ["GUEST_HOUSE_COMMITTEE_CHAIR"];
  }

  if (context.roomType === "business_room" && bookingCategory === "cat_a") {
    return ["REGISTRAR", "DEAN_FAA", "DIRECTOR"];
  }

  if (context.roomType === "business_room" && bookingCategory === "b_1") {
    return ["DEAN_FAA", "DEPUTY_DEAN", "HOD", "REGISTRAR"];
  }

  if (context.roomType === "business_room" && bookingCategory === "b_2") {
    return ["GUEST_HOUSE_COMMITTEE_CHAIR"];
  }

  return [];
}

export function canRoleApproveGuestHouseStage1(
  role: AppRole | null,
  context: Stage1Context
): boolean {
  if (!role) return false;
  if (role === "SYSTEM_ADMIN") return true;
  return getGuestHouseStage1AllowedRoles(context).includes(role);
}

export function getGuestHouseStage1ApproverLabel(context: Stage1Context): string {
  const bookingCategory = normalizeBookingCategory(context.bookingCategory);

  if (context.roomType === "executive_suite" && bookingCategory === "cat_a") {
    return "Director / Concerned Dean";
  }

  if (context.roomType === "executive_suite" && bookingCategory === "cat_b") {
    return "Chairman, Guest House Committee";
  }

  if (context.roomType === "business_room" && bookingCategory === "cat_a") {
    return "Registrar / Concerned Dean / Director";
  }

  if (context.roomType === "business_room" && bookingCategory === "b_1") {
    return "Dean / Deputy Dean / HoD / Registrar";
  }

  if (context.roomType === "business_room" && bookingCategory === "b_2") {
    return "Chairman, Guest House Committee";
  }

  return "Category-specific competent authority";
}
