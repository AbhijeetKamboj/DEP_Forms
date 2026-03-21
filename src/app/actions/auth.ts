"use server";

import {
  canUseInstitutionLogin,
  clearSessionEmail,
  getDashboardPathForRole,
  isInstituteEmail,
  isSystemAdminEmail,
  requireRole,
  setSessionEmail,
} from "@/lib/auth";
import type { AppRole } from "@/lib/mock-db";
import { authenticateUser, updateUserRole } from "@/lib/user-store";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const modeRaw = String(formData.get("mode") ?? "login");
  const mode = modeRaw === "signup" ? "signup" : "login";

  if (!email) {
    return { error: "Email is required." };
  }

  if (!canUseInstitutionLogin(email)) {
    return { error: "Use your @iitrpr.ac.in institutional email to sign in." };
  }

  if (!password) {
    return { error: "Password is required." };
  }

  if (mode === "signup" && password !== confirmPassword) {
    return { error: "Password and confirm password do not match." };
  }

  let user;
  try {
    user = (
      await authenticateUser({
      mode,
      email,
      password,
      forceSystemAdmin: isSystemAdminEmail(email),
      })
    ).user;
  } catch (error) {
    return { error: (error as Error).message };
  }

  await setSessionEmail(email);

  if (user.role === "SYSTEM_ADMIN") {
    redirect("/admin");
  }

  if (isInstituteEmail(user.email) && !user.role) {
    redirect("/pending-role");
  }

  redirect(getDashboardPathForRole(user.role));
}

export async function signOut() {
  await clearSessionEmail();
  redirect("/sign-in");
}

export async function assignRole(formData: FormData) {
  await requireRole(["SYSTEM_ADMIN"]);

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as AppRole;

  const allowedRoles: AppRole[] = [
    "STUDENT",
    "INTERN",
    "EMPLOYEE",
    "SUPERVISOR",
    "SECTION_HEAD",
    "HOD",
    "REGISTRAR",
    "DEAN_FAA",
    "DIRECTOR",
    "DEPUTY_DEAN",
    "STUDENT_AFFAIRS_HOSTEL_MGMT",
    "SECURITY_OFFICE",
    "FORWARDING_AUTHORITY_ACADEMICS",
    "ESTABLISHMENT",
    "FORWARDING_AUTHORITY_R_AND_D",
    "GUEST_HOUSE_INCHARGE",
    "GUEST_HOUSE_COMMITTEE_CHAIR",
    "IT_ADMIN",
    "SYSTEM_ADMIN",
  ];

  if (!allowedRoles.includes(role)) {
    throw new Error("Invalid role selected.");
  }

  await updateUserRole(userId, role);

  revalidatePath("/admin");
  revalidatePath("/pending-role");
  revalidatePath("/");
}
