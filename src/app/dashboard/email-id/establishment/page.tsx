import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listEmailIdForms } from "@/lib/email-id-store";
import { bulkReviewEmailIdForms } from "@/app/actions/email-id";
import {
  getEmailFormStatusText,
  getEmailFormStatusBadgeClass,
} from "@/lib/email-id-status";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";
import {
  listIdentityCardCompletedForms,
  listIdentityCardFormsForStage,
} from "@/lib/identity-card-store";
import {
  getIdentityCardStatusBadgeClass,
  getIdentityCardStatusText,
} from "@/lib/identity-card-status";
import { bulkReviewIdentityCardForms } from "@/app/actions/identity-card";

export default async function EstablishmentForwardingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ emailQueue?: string; identityQueue?: string }>;
}) {
  const { emailQueue, identityQueue } = await searchParams;
  const isEmailQueueOpen = emailQueue === "open";
  const isIdentityQueueOpen = identityQueue === "open";

  const emailQueueHref = isEmailQueueOpen
    ? `/dashboard/email-id/establishment${isIdentityQueueOpen ? "?identityQueue=open" : ""}`
    : `/dashboard/email-id/establishment?emailQueue=open${isIdentityQueueOpen ? "&identityQueue=open" : ""}`;
  const identityQueueHref = isIdentityQueueOpen
    ? `/dashboard/email-id/establishment${isEmailQueueOpen ? "?emailQueue=open" : ""}`
    : `/dashboard/email-id/establishment?identityQueue=open${isEmailQueueOpen ? "&emailQueue=open" : ""}`;

  await requireRole(["ESTABLISHMENT", "SYSTEM_ADMIN"]);
  const pendingForms = await listEmailIdForms({ status: "PENDING", includeApprovals: true });
  const forwardedForms = await listEmailIdForms({ status: "FORWARDED", includeApprovals: true });
  const allForms = await listEmailIdForms({ includeApprovals: true });
  const completedForms = allForms.filter((form) => form.status === "ISSUED" || form.status === "REJECTED");
  const pendingIdentityForms = await listIdentityCardFormsForStage(2);
  const awaitingIdentityForms = await listIdentityCardFormsForStage(1);
  const trackingIdentityForms = await listIdentityCardFormsForStage(3);
  const completedIdentityForms = await listIdentityCardCompletedForms();
  const pendingCount = pendingForms.length;
  const pendingIdentityCount = pendingIdentityForms.length;

  async function handleBulkReview(input: {
    ids: string[];
    decision: "approve" | "reject";
    approverName: string;
    remark: string;
  }) {
    "use server";
    await bulkReviewEmailIdForms({
      formIds: input.ids,
      decision: input.decision,
      approverName: input.approverName,
      remark: input.remark,
      section: "ESTABLISHMENT",
    });
  }

  async function handleIdentityBulkReview(input: {
    ids: string[];
    decision: "approve" | "reject";
    approverName: string;
    remark: string;
  }) {
    "use server";
    await bulkReviewIdentityCardForms({
      submissionIds: input.ids,
      decision: input.decision,
      approverName: input.approverName,
      remark: input.remark,
      stage: 2,
    });
  }

  const pendingRows = pendingForms.map((form) => ({
    id: form.id,
    cell1: `${form.initials} ${form.firstName} ${form.lastName}`,
    cell2: form.orgId,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getEmailFormStatusText({ status: form.status, approvals: form.approvals }),
    statusClassName: getEmailFormStatusBadgeClass(form.status),
    viewHref: `/dashboard/email-id/${form.id}`,
  }));

  const completedRows = completedForms.map((form) => ({
    id: form.id,
    cell1: `${form.initials} ${form.firstName} ${form.lastName}`,
    cell2: form.orgId,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getEmailFormStatusText({ status: form.status, approvals: form.approvals }),
    statusClassName: getEmailFormStatusBadgeClass(form.status),
    viewHref: `/dashboard/email-id/${form.id}`,
  }));

  const trackingEmailRows = forwardedForms.map((form) => ({
    id: form.id,
    cell1: `${form.initials} ${form.firstName} ${form.lastName}`,
    cell2: form.orgId,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getEmailFormStatusText({ status: form.status, approvals: form.approvals }),
    statusClassName: getEmailFormStatusBadgeClass(form.status),
    viewHref: `/dashboard/email-id/${form.id}`,
    selectable: false,
  }));

  const pendingIdentityRows = pendingIdentityForms.map((form) => ({
    id: form.submissionId,
    cell1: form.nameInCapitals,
    cell2: form.employeeCodeSnapshot ?? "-",
    cell3: form.departmentSnapshot ?? "-",
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getIdentityCardStatusText(form),
    statusClassName: getIdentityCardStatusBadgeClass(form),
    viewHref: `/dashboard/identity-card/${form.submissionId}`,
  }));

  const completedIdentityRows = completedIdentityForms.map((form) => ({
    id: form.submissionId,
    cell1: form.nameInCapitals,
    cell2: form.employeeCodeSnapshot ?? "-",
    cell3: form.departmentSnapshot ?? "-",
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getIdentityCardStatusText(form),
    statusClassName: getIdentityCardStatusBadgeClass(form),
    viewHref: `/dashboard/identity-card/${form.submissionId}`,
  }));

  const awaitingIdentityRows = awaitingIdentityForms.map((form) => ({
    id: form.submissionId,
    cell1: form.nameInCapitals,
    cell2: form.employeeCodeSnapshot ?? "-",
    cell3: form.departmentSnapshot ?? "-",
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: "Awaiting HoD / Section Head approval",
    statusClassName: "bg-sky-100 text-sky-700",
    viewHref: `/dashboard/identity-card/${form.submissionId}`,
    selectable: false,
  }));

  const trackingIdentityRows = trackingIdentityForms.map((form) => ({
    id: form.submissionId,
    cell1: form.nameInCapitals,
    cell2: form.employeeCodeSnapshot ?? "-",
    cell3: form.departmentSnapshot ?? "-",
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getIdentityCardStatusText(form),
    statusClassName: getIdentityCardStatusBadgeClass(form),
    viewHref: `/dashboard/identity-card/${form.submissionId}`,
    selectable: false,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-10">
        <div className="mx-auto max-w-6xl flex items-start justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-3 text-2xl text-slate-500">Manage your institutional forms</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xl text-slate-600">
            Assigned role: <span className="font-semibold text-slate-900">Establishment</span>
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">Email Approval Queue Access</h2>
              <p className="mt-2 text-xl text-amber-700">
                Your role can review and approve pending email ID requests.
              </p>
            </div>
            <div className="relative">
              <Link
                href={emailQueueHref}
                className="rounded-2xl bg-black px-8 py-4 text-lg font-semibold text-white transition hover:bg-slate-800"
              >
                {isEmailQueueOpen ? "Hide Email Approval Queue" : "Open Email Approval Queue"}
              </Link>
              {pendingCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                  {pendingCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-4xl font-bold tracking-tight text-slate-900">Identity Card Queue Access</h2>
                <p className="mt-2 text-xl text-amber-700">
                  Your role can review stage-2 identity card requests and view earlier pending requests.
                </p>
              </div>
              <div className="relative">
                <Link
                  href={identityQueueHref}
                  className="rounded-2xl bg-black px-8 py-4 text-lg font-semibold text-white transition hover:bg-slate-800"
                >
                  {isIdentityQueueOpen ? "Hide Identity Queue" : "Open Identity Queue"}
                </Link>
                {pendingIdentityCount > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                    {pendingIdentityCount}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {isEmailQueueOpen && (
          <BulkReviewGrid
            pendingRows={[...pendingRows, ...trackingEmailRows]}
            completedRows={completedRows}
            cell1Header="Applicant"
            cell2Header="Employee Code"
            cell3Header="Department"
            onBulkReview={handleBulkReview}
          />
        )}

          {isIdentityQueueOpen && (
            <BulkReviewGrid
              pendingRows={[...pendingIdentityRows, ...awaitingIdentityRows, ...trackingIdentityRows]}
              completedRows={completedIdentityRows}
              cell1Header="Applicant"
              cell2Header="Employee Code"
              cell3Header="Department"
              onBulkReview={handleIdentityBulkReview}
            />
          )}
      </div>
    </div>
  );
}
