import Link from "next/link";
import {
  canAccessApplicantForm,
  getCurrentUser,
  getDashboardPathForRole,
  getApplicantFormAccess,
  isInstituteEmail,
  toDisplayRole,
} from "@/lib/auth";
import { redirect } from "next/navigation";
import { listGuestHouseFormsBySubmitterEmail } from "@/lib/guest-house-store";
import { getGuestHouseStatusLabel } from "@/lib/guest-house-status";
import { listEmailIdFormsBySubmitter } from "@/lib/email-id-store";
import { getEmailFormStatusText } from "@/lib/email-id-status";
import {
  listVehicleStickerFormsBySubmitterEmail,
} from "@/lib/vehicle-sticker-store";
import { getVehicleStickerStatusText } from "@/lib/vehicle-sticker-status";
import {
  listHostelUndertakingFormsBySubmitterEmail,
} from "@/lib/hostel-undertaking-store";
import { getHostelUndertakingStatusText } from "@/lib/hostel-undertaking-status";
import { listIdentityCardFormsBySubmitterEmail } from "@/lib/identity-card-store";
import { getIdentityCardStatusText } from "@/lib/identity-card-status";

const FORMS = [
  {
    key: "email-id",
    name: "Email ID Request",
    description:
      "Request an IIT Ropar institutional email ID.",
    href: "/forms/email-id",
    stage: "2 stages",
  },
  {
    key: "vehicle-sticker",
    name: "Vehicle Sticker",
    description: "Apply for a vehicle sticker for campus access.",
    href: "/forms/vehicle-sticker",
    stage: "4 stages",
  },
  {
    key: "hostel-undertaking",
    name: "Hostel Undertaking",
    description: "Submit hostel accommodation undertaking form.",
    href: "/forms/hostel-undertaking",
    stage: "1 stage",
  },
  {
    key: "identity-card",
    name: "Identity Card",
    description: "Request a new or replacement IIT Ropar identity card.",
    href: "/forms/identity-card",
    stage: "3 stages",
  },
  {
    key: "guest-house",
    name: "Guest House Booking",
    description: "Apply for guest house accommodation on campus.",
    href: "/forms/guest-house",
    stage: "3 stages",
  },
] as const;

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-14">
        <main className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            IIT Ropar
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Institute Forms Platform
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-500">
            Please log in or sign up to access forms.
          </p>
          <div className="mt-6">
            <Link
              href="/sign-in"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Log in / Sign up
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const stakeholderRoles = [
    "SUPERVISOR",
    "HOD",
    "STUDENT_AFFAIRS_HOSTEL_MGMT",
    "SECURITY_OFFICE",
    "FORWARDING_AUTHORITY_ACADEMICS",
    "ESTABLISHMENT",
    "FORWARDING_AUTHORITY_R_AND_D",
    "IT_ADMIN",
    "HOSTEL_WARDEN",
    "SECTION_HEAD",
    "REGISTRAR",
    "DEAN_FAA",
    "DIRECTOR",
    "DEPUTY_DEAN",
    "GUEST_HOUSE_INCHARGE",
    "GUEST_HOUSE_COMMITTEE_CHAIR",
  ];

  if (user.role === "SYSTEM_ADMIN") {
    redirect("/admin");
  }

  if (stakeholderRoles.includes(user.role ?? "")) {
    redirect(getDashboardPathForRole(user.role));
  }

  if (isInstituteEmail(user.email) && !user.role) {
    redirect("/pending-role");
  }

  const isExternalUser = !isInstituteEmail(user.email);
  const applicantFormAccess = getApplicantFormAccess(user.email, user.role);
  const isExternalNoRole = isExternalUser && !user.role;
  const isStudentLike =
    user.role === "STUDENT" || user.role === "INTERN" || user.role === "EMPLOYEE";
  const canReview =
    [
      "SUPERVISOR",
      "HOD",
      "STUDENT_AFFAIRS_HOSTEL_MGMT",
      "SECURITY_OFFICE",
      "FORWARDING_AUTHORITY_ACADEMICS",
      "ESTABLISHMENT",
      "FORWARDING_AUTHORITY_R_AND_D",
      "IT_ADMIN",
      "SYSTEM_ADMIN",
      "HOSTEL_WARDEN",
      "SECTION_HEAD",
      "REGISTRAR",
      "DEAN_FAA",
      "DIRECTOR",
      "DEPUTY_DEAN",
      "GUEST_HOUSE_INCHARGE",
      "GUEST_HOUSE_COMMITTEE_CHAIR",
    ].includes(user.role ?? "");

  const visibleForms = FORMS.filter((f) => canAccessApplicantForm(user.email, user.role, f.key));

  const emailSubmissions = await listEmailIdFormsBySubmitter(user.id);
  const vehicleSubmissions = await listVehicleStickerFormsBySubmitterEmail(user.email);
  const hostelUndertakingSubmissions = await listHostelUndertakingFormsBySubmitterEmail(user.email);
  const identityCardSubmissions = await listIdentityCardFormsBySubmitterEmail(user.email);
  const guestHouseSubmissions = await listGuestHouseFormsBySubmitterEmail(user.email);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <main className="mx-auto max-w-5xl">
        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            IIT Ropar
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Institute Forms Platform
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-500">
            {isExternalNoRole
              ? "Non-IITRPR users can submit only Email ID and Guest House forms."
              : user.role === "STUDENT"
                ? "Students can fill all 5 forms."
                : user.role === "INTERN"
                  ? "Interns can fill all 5 forms."
                : user.role === "EMPLOYEE"
                  ? "Employees can fill Email ID, Identity Card, Vehicle Sticker, and Guest House forms."
                  : "You can access forms based on your role and track your submissions."}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
              Signed in as {user.email} ({toDisplayRole(user.role)})
            </span>
            {canReview && (
              <Link
                href={getDashboardPathForRole(user.role)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
              >
                Open Dashboard
              </Link>
            )}
          </div>
        </div>

        {/* Forms Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleForms.map((form) => (
            <div
              key={form.name}
              className="group rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-sm transition-all duration-150 hover:border-indigo-400"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-slate-900">{form.name}</h2>
                <span className="ml-2 shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  Available
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{form.description}</p>
              <p className="mt-2 text-xs text-slate-400">{form.stage}</p>

              <div className="mt-5 flex gap-2">
                <Link
                  href={form.href}
                  className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-indigo-700"
                >
                  Fill Form
                </Link>
              </div>
            </div>
          ))}
        </div>

        {isStudentLike && (
          <section className="mt-10 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">My Submissions</h2>

            {applicantFormAccess["email-id"] && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
                Email ID Forms
              </div>
              {emailSubmissions.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">No email ID submissions yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Submitted On</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {emailSubmissions.map((f) => (
                      <tr key={f.id}>
                        <td className="px-5 py-3 font-medium text-slate-800">{f.id}</td>
                        <td className="px-5 py-3 text-slate-600">{new Date(f.createdAt).toLocaleDateString("en-IN")}</td>
                        <td className="px-5 py-3 text-slate-700">
                          {getEmailFormStatusText({ status: f.status, approvals: f.approvals })}
                        </td>
                        <td className="px-5 py-3">
                          <Link href={`/forms/email-id/${f.id}`} className="text-xs font-semibold text-indigo-700 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            )}

            {applicantFormAccess["vehicle-sticker"] && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
                Vehicle Sticker Forms
              </div>
              {vehicleSubmissions.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">No vehicle sticker submissions yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Submitted On</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleSubmissions.map((f) => (
                      <tr key={f.submissionId}>
                        <td className="px-5 py-3 font-medium text-slate-800">{f.submissionId}</td>
                        <td className="px-5 py-3 text-slate-600">{new Date(f.createdAt).toLocaleDateString("en-IN")}</td>
                        <td className="px-5 py-3 text-slate-700">{getVehicleStickerStatusText(f)}</td>
                        <td className="px-5 py-3">
                          <Link href={`/forms/vehicle-sticker/${f.submissionId}`} className="text-xs font-semibold text-indigo-700 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            )}

            {applicantFormAccess["identity-card"] && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
                Identity Card Forms
              </div>
              {identityCardSubmissions.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">No identity card submissions yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Submitted On</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {identityCardSubmissions.map((f) => (
                      <tr key={f.submissionId}>
                        <td className="px-5 py-3 font-medium text-slate-800">{f.submissionId}</td>
                        <td className="px-5 py-3 text-slate-600">{new Date(f.createdAt).toLocaleDateString("en-IN")}</td>
                        <td className="px-5 py-3 text-slate-700">{getIdentityCardStatusText(f)}</td>
                        <td className="px-5 py-3">
                          <Link href={`/forms/identity-card/${f.submissionId}`} className="text-xs font-semibold text-indigo-700 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            )}

            {applicantFormAccess["guest-house"] && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
                Guest House Forms
              </div>
              {guestHouseSubmissions.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">No guest house submissions yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Guest</th>
                      <th className="px-5 py-3">Submitted On</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {guestHouseSubmissions.map((f) => (
                      <tr key={f.submissionId}>
                        <td className="px-5 py-3 font-medium text-slate-800">{f.submissionId}</td>
                        <td className="px-5 py-3 text-slate-700">{f.guestName}</td>
                        <td className="px-5 py-3 text-slate-600">{new Date(f.createdAt).toLocaleDateString("en-IN")}</td>
                        <td className="px-5 py-3 text-slate-700">{getGuestHouseStatusLabel(f.overallStatus)}</td>
                        <td className="px-5 py-3">
                          <Link href={`/forms/guest-house/${f.submissionId}`} className="text-xs font-semibold text-indigo-700 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            )}

            {applicantFormAccess["hostel-undertaking"] && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
                Hostel Undertaking Forms
              </div>
              {hostelUndertakingSubmissions.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">No hostel undertaking submissions yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Submitted On</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hostelUndertakingSubmissions.map((f) => (
                      <tr key={f.submissionId}>
                        <td className="px-5 py-3 font-medium text-slate-800">{f.submissionId}</td>
                        <td className="px-5 py-3 text-slate-600">{new Date(f.createdAt).toLocaleDateString("en-IN")}</td>
                        <td className="px-5 py-3 text-slate-700">{getHostelUndertakingStatusText(f)}</td>
                        <td className="px-5 py-3">
                          <Link href={`/forms/hostel-undertaking/${f.submissionId}`} className="text-xs font-semibold text-indigo-700 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
