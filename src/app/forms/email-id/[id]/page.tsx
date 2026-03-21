import { requireUser } from "@/lib/auth";
import { getEmailIdFormById } from "@/lib/email-id-store";
import {
  getEmailFormStatusBadgeClass,
  getEmailFormStatusText,
  getForwardingSectionLabel,
} from "@/lib/email-id-status";
import { notFound, redirect } from "next/navigation";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    description:
      "Your request has been submitted and is awaiting review by the Forwarding Authority (Academics / Establishment / R&D).",
  },
  FORWARDED: {
    label: "Pending",
    description:
      "The Forwarding Authority has approved your request. It is now with IT Admin for email ID creation.",
  },
  ISSUED: {
    label: "Email ID Issued",
    description:
      "Your IIT Ropar email ID has been created successfully. See details below.",
  },
};

export default async function EmailIdStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const form = await getEmailIdFormById(id);

  if (!form) notFound();

  const canReviewAny =
    user.role === "FORWARDING_AUTHORITY_ACADEMICS" ||
    user.role === "ESTABLISHMENT" ||
    user.role === "FORWARDING_AUTHORITY_R_AND_D" ||
    user.role === "IT_ADMIN" ||
    user.role === "SYSTEM_ADMIN";
  if (!canReviewAny && form.submittedById !== user.id) {
    redirect("/");
  }

  const statusCfg = STATUS_CONFIG[form.status as keyof typeof STATUS_CONFIG];
  const stage1 = form.approvals.find((a: { stage: number }) => a.stage === 1);
  const stage2 = form.approvals.find((a: { stage: number }) => a.stage === 2);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            IIT Ropar — Email ID Request
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Application Status
          </h1>
          <p className="mt-1 text-sm text-slate-500">Reference ID: {form.id}</p>
        </div>

        {/* Status Banner */}
        <div className={`rounded-xl px-5 py-4 ${getEmailFormStatusBadgeClass(form.status)}`}>
          <p className="font-semibold">
            {getEmailFormStatusText({ status: form.status, approvals: form.approvals })}
          </p>
          <p className="mt-0.5 text-sm">{statusCfg.description}</p>
        </div>

        {/* Stage Tracker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-700">
            Approval Progress
          </h2>
          <ol className="relative border-l border-slate-200 space-y-8 ml-3">
            {/* Stage 0: Submitted */}
            <li className="ml-6">
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-white text-white text-xs font-bold">
                ✓
              </span>
              <p className="font-medium text-slate-900">Form Submitted</p>
              <p className="text-sm text-slate-500">
                {new Date(form.createdAt).toLocaleString("en-IN")}
              </p>
            </li>

            {/* Stage 1: Forwarding Authority */}
            <li className="ml-6">
              <span
                className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white text-xs font-bold ${
                  stage1
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {stage1 ? "✓" : "2"}
              </span>
              <p className="font-medium text-slate-900">
                Forwarding Authority Approval
              </p>
              {stage1 ? (
                <p className="text-sm text-slate-500">
                  Approved by {stage1.approverName} (
                  {getForwardingSectionLabel(stage1.forwardingSection)}
                  ) on{" "}
                  {new Date(stage1.createdAt).toLocaleString("en-IN")}
                </p>
              ) : (
                <p className="text-sm text-slate-400">Awaiting approval</p>
              )}
            </li>

            {/* Stage 2: IT Admin */}
            <li className="ml-6">
              <span
                className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white text-xs font-bold ${
                  stage2
                    ? "bg-green-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {stage2 ? "✓" : "3"}
              </span>
              <p className="font-medium text-slate-900">Email ID Issuance</p>
              {stage2 ? (
                <div className="mt-1 text-sm text-slate-600 space-y-1">
                  <p>
                    <span className="font-medium">Assigned Email:</span>{" "}
                    <span className="font-mono text-indigo-700">
                      {stage2.assignedEmailId}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Created on:</span>{" "}
                    {stage2.dateOfCreation
                      ? new Date(stage2.dateOfCreation).toLocaleDateString(
                          "en-IN"
                        )
                      : "—"}
                  </p>
                  <p>
                    <span className="font-medium">Tentative Removal:</span>{" "}
                    {stage2.tentativeRemovalDate
                      ? new Date(
                          stage2.tentativeRemovalDate
                        ).toLocaleDateString("en-IN")
                      : "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Created by:</span>{" "}
                    {stage2.idCreatedBy}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Pending IT Admin</p>
              )}
            </li>
          </ol>
        </div>

        {/* Submitted Data Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
            Submitted Details
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">
                {form.initials} {form.firstName} {form.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Gender</dt>
              <dd className="font-medium text-slate-900">{form.gender}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Permanent Address</dt>
              <dd className="font-medium text-slate-900">
                {form.permanentAddress}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Org / Roll ID</dt>
              <dd className="font-medium text-slate-900">{form.orgId}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Nature of Engagement</dt>
              <dd className="font-medium text-slate-900">
                {form.natureOfEngagement}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium text-slate-900">{form.role}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Department</dt>
              <dd className="font-medium text-slate-900">{form.department}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Mobile</dt>
              <dd className="font-medium text-slate-900">{form.mobileNo}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Alternate Email</dt>
              <dd className="font-medium text-slate-900">
                {form.alternateEmail}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
