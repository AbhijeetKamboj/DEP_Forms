import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listGuestHouseCompletedForms,
  listGuestHouseFormsForStage,
} from "@/lib/guest-house-store";
import {
  getGuestHouseStatusBadgeClass,
  getGuestHouseStatusLabel,
} from "@/lib/guest-house-status";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";
import { bulkReviewGuestHouseForms } from "@/app/actions/guest-house";

export default async function GuestHouseInChargeDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const { queue } = await searchParams;
  const isQueueOpen = queue === "open";

  await requireRole(["GUEST_HOUSE_INCHARGE", "SYSTEM_ADMIN"]);
  const trackingStage1Forms = await listGuestHouseFormsForStage(1);
  const pendingForms = await listGuestHouseFormsForStage(2);
  const trackingStage3Forms = await listGuestHouseFormsForStage(3);
  const completedForms = await listGuestHouseCompletedForms();
  const currentStagePendingCount = pendingForms.length;

  async function handleBulkReview(input: {
    ids: string[];
    decision: "approve" | "reject";
    approverName: string;
    remark: string;
  }) {
    "use server";
    await bulkReviewGuestHouseForms({
      submissionIds: input.ids,
      decision: input.decision,
      approverName: input.approverName,
      remark: input.remark,
      stage: 2,
    });
  }

  const pendingRows = pendingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.guestName,
    cell2: form.contactNumber,
    cell3: form.purposeOfBooking,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getGuestHouseStatusLabel(form.overallStatus),
    statusClassName: getGuestHouseStatusBadgeClass(form.overallStatus),
    viewHref: `/dashboard/guest-house/${form.submissionId}`,
  }));

  const trackingRows = [
    ...trackingStage1Forms.map((form) => ({
      id: form.submissionId,
      cell1: form.guestName,
      cell2: form.contactNumber,
      cell3: form.purposeOfBooking,
      submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
      statusText: "Awaiting Stage 1 Competent Authority",
      statusClassName: "bg-sky-100 text-sky-700",
      viewHref: `/dashboard/guest-house/${form.submissionId}`,
      selectable: false,
    })),
    ...trackingStage3Forms.map((form) => ({
      id: form.submissionId,
      cell1: form.guestName,
      cell2: form.contactNumber,
      cell3: form.purposeOfBooking,
      submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
      statusText: "Awaiting Chairman GH Committee",
      statusClassName: "bg-sky-100 text-sky-700",
      viewHref: `/dashboard/guest-house/${form.submissionId}`,
      selectable: false,
    })),
  ];

  const completedRows = completedForms.map((form) => ({
    id: form.submissionId,
    cell1: form.guestName,
    cell2: form.contactNumber,
    cell3: form.purposeOfBooking,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getGuestHouseStatusLabel(form.overallStatus),
    statusClassName: getGuestHouseStatusBadgeClass(form.overallStatus),
    viewHref: `/dashboard/guest-house/${form.submissionId}`,
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Guest House Workflow</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Guest House In-charge Dashboard</h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Guest House Queue Access</h2>
              <p className="mt-2 text-lg text-amber-700">Open queue to review pending Stage 2 requests.</p>
            </div>
            <div className="relative">
              <Link
                href={
                  isQueueOpen
                    ? "/dashboard/guest-house/in-charge"
                    : "/dashboard/guest-house/in-charge?queue=open"
                }
                className="rounded-2xl bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                {isQueueOpen ? "Hide Guest House Queue" : "Open Guest House Queue"}
              </Link>
              {currentStagePendingCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                  {currentStagePendingCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {isQueueOpen ? (
          <BulkReviewGrid
            pendingRows={[...pendingRows, ...trackingRows]}
            completedRows={completedRows}
            cell1Header="Guest Name"
            cell2Header="Contact"
            cell3Header="Purpose"
            onBulkReview={handleBulkReview}
          />
        ) : null}
      </div>
    </div>
  );
}
