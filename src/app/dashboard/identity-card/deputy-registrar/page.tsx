import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listIdentityCardCompletedForms,
  listIdentityCardFormsForStage,
} from "@/lib/identity-card-store";
import {
  getIdentityCardStatusBadgeClass,
  getIdentityCardStatusText,
} from "@/lib/identity-card-status";
import { bulkReviewIdentityCardForms } from "@/app/actions/identity-card";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";

export default async function DeputyRegistrarIdentityDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const { queue } = await searchParams;
  const isQueueOpen = queue === "open";

  await requireRole(["ESTABLISHMENT", "SYSTEM_ADMIN"]);
  const pendingForms = await listIdentityCardFormsForStage(2);
  const awaitingFromStage1 = await listIdentityCardFormsForStage(1);
  const trackingFromStage3 = await listIdentityCardFormsForStage(3);
  const completedForms = await listIdentityCardCompletedForms();
  const currentStagePendingCount = pendingForms.length;

  async function handleBulkReview(input: {
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
    id: form.submissionId,
    cell1: form.nameInCapitals,
    cell2: form.employeeCodeSnapshot ?? "-",
    cell3: form.departmentSnapshot ?? "-",
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getIdentityCardStatusText(form),
    statusClassName: getIdentityCardStatusBadgeClass(form),
    viewHref: `/dashboard/identity-card/${form.submissionId}`,
  }));

  const completedRows = completedForms.map((form) => ({
    id: form.submissionId,
    cell1: form.nameInCapitals,
    cell2: form.employeeCodeSnapshot ?? "-",
    cell3: form.departmentSnapshot ?? "-",
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getIdentityCardStatusText(form),
    statusClassName: getIdentityCardStatusBadgeClass(form),
    viewHref: `/dashboard/identity-card/${form.submissionId}`,
  }));

  const waitingRows = awaitingFromStage1.map((form) => ({
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

  const trackingRows = trackingFromStage3.map((form) => ({
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
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Identity Card Workflow
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Establishment / Deputy Registrar Dashboard</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Identity Queue Access</h2>
              <p className="mt-2 text-lg text-amber-700">Open queue to process stage 2 establishment recommendations.</p>
            </div>
            <div className="relative">
              <Link
                href={
                  isQueueOpen
                    ? "/dashboard/identity-card/deputy-registrar"
                    : "/dashboard/identity-card/deputy-registrar?queue=open"
                }
                className="rounded-2xl bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                {isQueueOpen ? "Hide Identity Queue" : "Open Identity Queue"}
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
            pendingRows={[...pendingRows, ...waitingRows, ...trackingRows]}
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
