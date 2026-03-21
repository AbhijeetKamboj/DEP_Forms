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

export default async function SupervisorVehicleStickerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const { queue } = await searchParams;
  const isQueueOpen = queue === "open";

  await requireRole(["SUPERVISOR", "SYSTEM_ADMIN"]);
  const pendingForms = await listVehicleStickerFormsForStage(1);
  const trackingStage2Forms = await listVehicleStickerFormsForStage(2);
  const trackingStage3Forms = await listVehicleStickerFormsForStage(3);
  const trackingStage4Forms = await listVehicleStickerFormsForStage(4);
  const completedForms = await listVehicleStickerCompletedForms();
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
      stage: 1,
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

  const trackingRows = [
    ...trackingStage2Forms.map((form) => ({
      id: form.submissionId,
      cell1: form.applicantName,
      cell2: form.entryOrEmpNo ?? form.designation,
      cell3: form.department,
      submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
      statusText: "Awaiting HoD approval",
      statusClassName: "bg-sky-100 text-sky-700",
      viewHref: `/dashboard/vehicle-sticker/${form.submissionId}`,
      selectable: false,
    })),
    ...trackingStage3Forms.map((form) => ({
      id: form.submissionId,
      cell1: form.applicantName,
      cell2: form.entryOrEmpNo ?? form.designation,
      cell3: form.department,
      submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
      statusText: "Awaiting Student Affairs approval",
      statusClassName: "bg-sky-100 text-sky-700",
      viewHref: `/dashboard/vehicle-sticker/${form.submissionId}`,
      selectable: false,
    })),
    ...trackingStage4Forms.map((form) => ({
      id: form.submissionId,
      cell1: form.applicantName,
      cell2: form.entryOrEmpNo ?? form.designation,
      cell3: form.department,
      submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
      statusText: "Awaiting Security Office issuance",
      statusClassName: "bg-sky-100 text-sky-700",
      viewHref: `/dashboard/vehicle-sticker/${form.submissionId}`,
      selectable: false,
    })),
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Vehicle Sticker Workflow
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Supervisor Dashboard</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Vehicle Approval Queue Access</h2>
              <p className="mt-2 text-lg text-amber-700">Open queue to review pending Supervisor stage requests.</p>
            </div>
            <div className="relative">
              <Link
                href={
                  isQueueOpen
                    ? "/dashboard/vehicle-sticker/supervisor"
                    : "/dashboard/vehicle-sticker/supervisor?queue=open"
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
