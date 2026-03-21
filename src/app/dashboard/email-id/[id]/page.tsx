import { getDashboardPathForRole, requireRole } from "@/lib/auth";
import { getEmailIdFormById } from "@/lib/email-id-store";
import {
  getEmailFormStatusBadgeClass,
  getEmailFormStatusText,
} from "@/lib/email-id-status";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ForwardingAuthorityPanel,
  ITAdminPanel,
} from "./approval-panels";

const SECTION_LABELS: Record<string, string> = {
  ACADEMICS: "Academics",
  ESTABLISHMENT: "Establishment",
  RESEARCH_AND_DEVELOPMENT: "Research & Development",
};

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}

export default async function EmailIdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole([
    "FORWARDING_AUTHORITY_ACADEMICS",
    "ESTABLISHMENT",
    "FORWARDING_AUTHORITY_R_AND_D",
    "IT_ADMIN",
    "SYSTEM_ADMIN",
  ]);
  const { id } = await params;
  const form = await getEmailIdFormById(id);
  const dashboardHref = getDashboardPathForRole(user.role);

  if (!form) notFound();

  const stage1 = form.approvals.find((a: { stage: number }) => a.stage === 1);
  const stage2 = form.approvals.find((a: { stage: number }) => a.stage === 2);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href={dashboardHref}
            className="hover:text-indigo-600 transition"
          >
            Email ID Requests
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">
            {form.initials} {form.firstName} {form.lastName}
          </span>
        </div>

        {/* Title + Status */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {form.initials} {form.firstName} {form.lastName}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Ref: {form.id} &middot; Submitted{" "}
              {new Date(form.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getEmailFormStatusBadgeClass(form.status)}`}
          >
            {getEmailFormStatusText({ status: form.status, approvals: form.approvals })}
          </span>
        </div>

        {/* Form Data */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-700">
            Personal Details
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Gender" value={form.gender} />
            <Field label="Org / Roll ID" value={form.orgId} />
            <Field
              label="Permanent Address"
              value={form.permanentAddress}
            />
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-700">
            Employment Details
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nature of Engagement"
              value={form.natureOfEngagement}
            />
            <Field label="Role" value={form.role} />
            <Field label="Department" value={form.department} />
            {form.projectName && (
              <Field label="Project Name" value={form.projectName} />
            )}
            {form.joiningDate && (
              <Field
                label="Joining Date"
                value={new Date(form.joiningDate).toLocaleDateString("en-IN")}
              />
            )}
            {form.anticipatedEndDate && (
              <Field
                label="Anticipated End Date"
                value={new Date(form.anticipatedEndDate).toLocaleDateString(
                  "en-IN"
                )}
              />
            )}
            {form.reportingOfficerName && (
              <Field
                label="Reporting Officer"
                value={form.reportingOfficerName}
              />
            )}
            {form.reportingOfficerEmail && (
              <Field
                label="Reporting Officer Email"
                value={form.reportingOfficerEmail}
              />
            )}
          </dl>

          <h2 className="mb-4 mt-6 text-sm font-semibold uppercase tracking-wider text-slate-700">
            Alternate Contact
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile" value={form.mobileNo} />
            <Field label="Alternate Email" value={form.alternateEmail} />
          </dl>
        </div>

        {/* Existing Approvals */}
        {(stage1 || stage2) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
              Approvals
            </h2>
            <div className="space-y-4">
              {stage1 && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm">
                  <p className="font-semibold text-amber-800">
                    Stage 1 — Forwarding Authority
                  </p>
                  <p className="mt-1 text-slate-700">
                    By {stage1.approverName} (
                    {stage1.forwardingSection
                      ? SECTION_LABELS[stage1.forwardingSection]
                      : ""}
                    ) on {new Date(stage1.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
              {stage2 && (
                <div className="rounded-lg bg-green-50 border border-green-100 p-4 text-sm">
                  <p className="font-semibold text-green-800">
                    Stage 2 — IT Admin Issuance
                  </p>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-2 text-slate-700">
                    <div>
                      <span className="font-medium">Assigned Email: </span>
                      <span className="font-mono text-indigo-700">
                        {stage2.assignedEmailId}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Created by: </span>
                      {stage2.idCreatedBy}
                    </div>
                    <div>
                      <span className="font-medium">Date of Creation: </span>
                      {stage2.dateOfCreation
                        ? new Date(stage2.dateOfCreation).toLocaleDateString(
                            "en-IN"
                          )
                        : "—"}
                    </div>
                    <div>
                      <span className="font-medium">Tentative Removal: </span>
                      {stage2.tentativeRemovalDate
                        ? new Date(
                            stage2.tentativeRemovalDate
                          ).toLocaleDateString("en-IN")
                        : "N/A"}
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Panels */}
        {form.status === "PENDING" &&
          (user.role === "FORWARDING_AUTHORITY_ACADEMICS" ||
            user.role === "ESTABLISHMENT" ||
            user.role === "FORWARDING_AUTHORITY_R_AND_D" ||
            user.role === "SYSTEM_ADMIN") && (
          <ForwardingAuthorityPanel
            formId={form.id}
            fixedSection={
              user.role === "FORWARDING_AUTHORITY_ACADEMICS"
                ? "ACADEMICS"
                : user.role === "ESTABLISHMENT"
                  ? "ESTABLISHMENT"
                  : user.role === "FORWARDING_AUTHORITY_R_AND_D"
                    ? "RESEARCH_AND_DEVELOPMENT"
                    : undefined
            }
          />
        )}
        {form.status === "FORWARDED" &&
          (user.role === "IT_ADMIN" || user.role === "SYSTEM_ADMIN") && (
          <ITAdminPanel formId={form.id} />
        )}

        {form.status === "ISSUED" && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
            ✅ This request has been fully processed and the email ID has been
            issued.
          </div>
        )}
      </div>
    </div>
  );
}
