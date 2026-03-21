import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listVehicleStickerCompletedForms,
  listVehicleStickerFormsForStage,
} from "@/lib/vehicle-sticker-store";
import { bulkReviewVehicleStickerForms } from "@/app/actions/vehicle-sticker";
import {
  getVehicleStickerStatusBadgeClass,
  getVehicleStickerStatusText,
} from "@/lib/vehicle-sticker-status";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";
import { listIdentityCardFormsForStage } from "@/lib/identity-card-store";
import { listGuestHouseFormsForStage } from "@/lib/guest-house-store";
import { canRoleApproveGuestHouseStage1 } from "@/lib/guest-house-approver-matrix";

export default async function HodVehicleStickerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const { queue } = await searchParams;
  const isQueueOpen = queue === "open";

  await requireRole(["HOD", "SYSTEM_ADMIN"]);
  const pendingForms = await listVehicleStickerFormsForStage(2);
  const awaitingFromStage1 = await listVehicleStickerFormsForStage(1);
  const completedForms = await listVehicleStickerCompletedForms();
  const pendingIdentityForms = await listIdentityCardFormsForStage(1);
  const guestHouseStage1Count = (await listGuestHouseFormsForStage(1)).filter((form) =>
    canRoleApproveGuestHouseStage1("HOD", {
      roomType: form.roomType,
      bookingCategory: form.bookingCategory ?? "",
    })
  ).length;
  const currentStagePendingCount = pendingForms.length;

  async function handleBulkReview(input: {
    ids: string[];
    decision: "approve" | "reject";
    approverName: string;
    remark: string;
  }) {
    "use server";
    await bulkReviewVehicleStickerForms({
      submissionIds: input.ids,
      decision: input.decision,
      approverName: input.approverName,
      remark: input.remark,
      stage: 2,
    });
  }

  const pendingRows = pendingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.applicantName,
    cell2: form.entryOrEmpNo ?? form.designation,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getVehicleStickerStatusText(form),
    statusClassName: getVehicleStickerStatusBadgeClass(form),
    viewHref: `/dashboard/vehicle-sticker/${form.submissionId}`,
  }));

  const completedRows = completedForms.map((form) => ({
    id: form.submissionId,
    cell1: form.applicantName,
    cell2: form.entryOrEmpNo ?? form.designation,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getVehicleStickerStatusText(form),
    statusClassName: getVehicleStickerStatusBadgeClass(form),
    viewHref: `/dashboard/vehicle-sticker/${form.submissionId}`,
  }));

  const waitingRows = awaitingFromStage1.map((form) => ({
    id: form.submissionId,
    cell1: form.applicantName,
    cell2: form.entryOrEmpNo ?? form.designation,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: "Awaiting Supervisor approval",
    statusClassName: "bg-sky-100 text-sky-700",
    viewHref: `/dashboard/vehicle-sticker/${form.submissionId}`,
    selectable: false,
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Vehicle Sticker Workflow
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">HoD Dashboard</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Vehicle Approval Queue Access</h2>
              <p className="mt-2 text-lg text-amber-700">Open queue to review pending HoD stage requests.</p>
            </div>
            <div className="relative">
              <Link
                href={
                  isQueueOpen
                    ? "/dashboard/vehicle-sticker/hod"
                    : "/dashboard/vehicle-sticker/hod?queue=open"
                }
                className="rounded-2xl bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                {isQueueOpen ? "Hide Vehicle Approval Queue" : "Open Vehicle Approval Queue"}
              </Link>
              {currentStagePendingCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                  {currentStagePendingCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Identity Card Queue Access</h2>
              <p className="mt-2 text-lg text-amber-700">
                Open queue to review pending HoD/Section Head identity requests.
              </p>
            </div>
            <div className="relative">
              <Link
                href="/dashboard/identity-card/hod-section-head?queue=open"
                className="rounded-2xl bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                Open Identity Card Queue
              </Link>
              {pendingIdentityForms.length > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                  {pendingIdentityForms.length}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Guest House Stage 1 Queue</h2>
              <p className="mt-2 text-lg text-amber-700">
                Open queue for category-based competent authority requests assigned to HoD.
              </p>
            </div>
            <div className="relative">
              <Link
                href="/dashboard/guest-house/approving-authority?queue=open"
                className="rounded-2xl bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                Open Guest House Queue
              </Link>
              {guestHouseStage1Count > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                  {guestHouseStage1Count}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {isQueueOpen && (
          <BulkReviewGrid
            pendingRows={[...pendingRows, ...waitingRows]}
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
