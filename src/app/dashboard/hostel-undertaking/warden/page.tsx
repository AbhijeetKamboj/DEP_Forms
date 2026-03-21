import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listHostelUndertakingCompletedForms,
  listHostelUndertakingFormsForStage,
} from "@/lib/hostel-undertaking-store";
import {
  getHostelUndertakingStatusBadgeClass,
  getHostelUndertakingStatusText,
} from "@/lib/hostel-undertaking-status";
import { bulkReviewHostelUndertakingForms } from "@/app/actions/hostel-undertaking";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";

export default async function HostelWardenDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const { queue } = await searchParams;
  const isQueueOpen = queue === "open";

  await requireRole(["HOSTEL_WARDEN", "SYSTEM_ADMIN"]);
  const pendingForms = await listHostelUndertakingFormsForStage(1);
  const completedForms = await listHostelUndertakingCompletedForms();
  const currentStagePendingCount = pendingForms.length;

  async function handleBulkReview(input: {
    ids: string[];
    decision: "approve" | "reject";
    approverName: string;
    remark: string;
  }) {
    "use server";
    await bulkReviewHostelUndertakingForms({
      submissionIds: input.ids,
      decision: input.decision,
      approverName: input.approverName,
      remark: input.remark,
    });
  }

  const pendingRows = pendingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.studentName,
    cell2: form.entryNumber,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getHostelUndertakingStatusText(form),
    statusClassName: getHostelUndertakingStatusBadgeClass(form),
    viewHref: `/dashboard/hostel-undertaking/${form.submissionId}`,
  }));

  const completedRows = completedForms.map((form) => ({
    id: form.submissionId,
    cell1: form.studentName,
    cell2: form.entryNumber,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getHostelUndertakingStatusText(form),
    statusClassName: getHostelUndertakingStatusBadgeClass(form),
    viewHref: `/dashboard/hostel-undertaking/${form.submissionId}`,
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Hostel Undertaking Workflow
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Hostel Warden Dashboard</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Undertaking Queue Access</h2>
              <p className="mt-2 text-lg text-amber-700">
                Open queue to process pending student undertakings.
              </p>
            </div>
            <div className="relative">
              <Link
                href={
                  isQueueOpen
                    ? "/dashboard/hostel-undertaking/warden"
                    : "/dashboard/hostel-undertaking/warden?queue=open"
                }
                className="rounded-2xl bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                {isQueueOpen ? "Hide Undertaking Queue" : "Open Undertaking Queue"}
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
            pendingRows={pendingRows}
            completedRows={completedRows}
            cell1Header="Student"
            cell2Header="Entry Number"
            cell3Header="Department"
            onBulkReview={handleBulkReview}
          />
        )}
      </div>
    </div>
  );
}
