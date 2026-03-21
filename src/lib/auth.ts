import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserByEmail } from "@/lib/user-store";
import type { AppRole } from "@/lib/mock-db";

export const SESSION_COOKIE = "iitrpr_session_email";
const IITRPR_DOMAIN = "@iitrpr.ac.in";
const SYSTEM_ADMIN_EMAILS = ["admin@iitrpr.ac.in"];

export type ApplicantFormKey =
  | "email-id"
  | "guest-house"
  | "identity-card"
  | "vehicle-sticker"
  | "hostel-undertaking";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function canUseInstitutionLogin(email: string) {
  const normalized = normalizeEmail(email);
  return normalized.includes("@");
}

export function isInstituteEmail(email: string) {
  const normalized = normalizeEmail(email);
  return normalized.endsWith(IITRPR_DOMAIN);
}

export function getApplicantFormAccess(email: string, role: AppRole | null) {
  const instituteEmail = isInstituteEmail(email);

  if (!instituteEmail) {
    return {
      "email-id": true,
      "guest-house": true,
      "identity-card": false,
      "vehicle-sticker": false,
      "hostel-undertaking": false,
    } as const;
  }

  if (role === "STUDENT" || role === "INTERN") {
    return {
      "email-id": true,
      "guest-house": true,
      "identity-card": true,
      "vehicle-sticker": true,
      "hostel-undertaking": true,
    } as const;
  }

  if (role === "EMPLOYEE") {
    return {
      "email-id": true,
      "guest-house": true,
      "identity-card": true,
      "vehicle-sticker": true,
      "hostel-undertaking": false,
    } as const;
  }

  return {
    "email-id": false,
    "guest-house": false,
    "identity-card": false,
    "vehicle-sticker": false,
    "hostel-undertaking": false,
  } as const;
}

export function canAccessApplicantForm(email: string, role: AppRole | null, formKey: ApplicantFormKey) {
  return getApplicantFormAccess(email, role)[formKey];
}

export async function requireApplicantFormAccess(formKey: ApplicantFormKey) {
  const user = await requireUser();
  if (!canAccessApplicantForm(user.email, user.role, formKey)) {
    redirect("/");
  }
  return user;
}

export async function setSessionEmail(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, normalizeEmail(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionEmail() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionEmail() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser() {
  const sessionEmail = await getSessionEmail();
  if (!sessionEmail) {
    return null;
  }

  try {
    return await findUserByEmail(sessionEmail);
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

export async function requireAssignedUser() {
  const user = await requireUser();
  if (!user.role) {
    redirect("/pending-role");
  }
  return user;
}

export async function requireRole(roles: AppRole[]) {
  const user = await requireUser();
  if (!user.role || !roles.includes(user.role)) {
    redirect("/");
  }
  return user;
}

export function isSystemAdminEmail(email: string) {
  return SYSTEM_ADMIN_EMAILS.includes(normalizeEmail(email));
}

export function getDashboardPathForRole(role: AppRole | null) {
  switch (role) {
    case "HOSTEL_WARDEN":
      return "/dashboard/hostel-undertaking/warden";
    case "SUPERVISOR":
      return "/dashboard/vehicle-sticker/supervisor";
    case "SECTION_HEAD":
      return "/dashboard/identity-card/hod-section-head";
    case "HOD":
      return "/dashboard/vehicle-sticker/hod";
    case "REGISTRAR":
      return "/dashboard/identity-card/registrar";
    case "DEAN_FAA":
      return "/dashboard/identity-card/dean-faa";
    case "DIRECTOR":
    case "DEPUTY_DEAN":
      return "/dashboard/guest-house/approving-authority";
    case "STUDENT_AFFAIRS_HOSTEL_MGMT":
      return "/dashboard/vehicle-sticker/student-affairs-hostel-mgmt";
    case "SECURITY_OFFICE":
      return "/dashboard/vehicle-sticker/security-office";
    case "FORWARDING_AUTHORITY_ACADEMICS":
      return "/dashboard/email-id/academics";
    case "ESTABLISHMENT":
      return "/dashboard/email-id/establishment";
    case "FORWARDING_AUTHORITY_R_AND_D":
      return "/dashboard/email-id/rnd";
    case "APPROVING_AUTHORITY":
      return "/dashboard/guest-house/approving-authority";
    case "GUEST_HOUSE_INCHARGE":
      return "/dashboard/guest-house/in-charge";
    case "GUEST_HOUSE_COMMITTEE_CHAIR":
      return "/dashboard/guest-house/chairman";
    case "IT_ADMIN":
    case "SYSTEM_ADMIN":
      return "/dashboard/email-id";
    default:
      return "/";
  }
}

export function toDisplayRole(role: AppRole | null) {
  if (!role) return "Unassigned";

  switch (role) {
    case "STUDENT":
      return "Student";
    case "INTERN":
      return "Intern";
    case "EMPLOYEE":
      return "Employee";
    case "HOSTEL_WARDEN":
      return "Hostel Warden";
    case "SUPERVISOR":
      return "Supervisor";
    case "SECTION_HEAD":
      return "Section Head";
    case "HOD":
      return "HoD";
    case "REGISTRAR":
      return "Registrar";
    case "DEAN_FAA":
      return "Dean FA&A";
    case "DIRECTOR":
      return "Director";
    case "DEPUTY_DEAN":
      return "Deputy Dean";
    case "STUDENT_AFFAIRS_HOSTEL_MGMT":
      return "Student Affairs";
    case "SECURITY_OFFICE":
      return "Security Office";
    case "FORWARDING_AUTHORITY_ACADEMICS":
      return "Forwarding Authority (Academics)";
    case "ESTABLISHMENT":
      return "Establishment";
    case "FORWARDING_AUTHORITY_R_AND_D":
      return "Forwarding Authority (R&D)";
    case "APPROVING_AUTHORITY":
      return "Approving Authority";
    case "GUEST_HOUSE_INCHARGE":
      return "Guest House In-charge";
    case "GUEST_HOUSE_COMMITTEE_CHAIR":
      return "Chairman GH Committee";
    case "IT_ADMIN":
      return "IT Admin";
    case "SYSTEM_ADMIN":
      return "System Admin";
    default:
      return role;
  }
}
