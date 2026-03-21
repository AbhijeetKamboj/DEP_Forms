import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listEmailIdForms } from "@/lib/email-id-store";
import { bulkReviewEmailIdForms } from "@/app/actions/email-id";
import {
  getEmailFormStatusBadgeClass,
  getEmailFormStatusText,
} from "@/lib/email-id-status";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";

export default async function RndForwardingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const { queue } = await searchParams;
  const isQueueOpen = queue === "open";

  await requireRole(["FORWARDING_AUTHORITY_R_AND_D", "SYSTEM_ADMIN"]);
  const pendingForms = await listEmailIdForms({ status: "PENDING", includeApprovals: true });
  const forwardedForms = await listEmailIdForms({ status: "FORWARDED", includeApprovals: true });
  const allForms = await listEmailIdForms({ includeApprovals: true });
  const completedForms = allForms.filter((form) => form.status === "ISSUED" || form.status === "REJECTED");
  const currentStagePendingCount = pendingForms.length;

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
      section: "RESEARCH_AND_DEVELOPMENT",
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

  const trackingRows = forwardedForms.map((form) => ({
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

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Forwarding Authority
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              R&amp;D Dashboard
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Email Approval Queue Access</h2>
              <p className="mt-2 text-lg text-amber-700">Open queue to review pending Email ID requests.</p>
            </div>
            <div className="relative">
              <Link
                href={isQueueOpen ? "/dashboard/email-id/rnd" : "/dashboard/email-id/rnd?queue=open"}
                className="rounded-2xl bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                {isQueueOpen ? "Hide Email Approval Queue" : "Open Email Approval Queue"}
              </Link>
              {currentStagePendingCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                  {currentStagePendingCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {isQueueOpen && (
          <BulkReviewGrid
            pendingRows={[...pendingRows, ...trackingRows]}
            completedRows={completedRows}
            cell1Header="Applicant"
            cell2Header="Employee Code"
            cell3Header="Department"
            onBulkReview={handleBulkReview}
          />
        )}
      </div>
    </div>
  );
}
