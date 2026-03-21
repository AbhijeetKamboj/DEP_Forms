import { requireRole } from "@/lib/auth";
import {
  listEmailIdForms,
  type EmailFormWithApprovals,
  type EmailIdFormStatus,
} from "@/lib/email-id-store";
import {
  getEmailFormStatusBadgeClass,
  getEmailFormStatusText,
} from "@/lib/email-id-status";
import Link from "next/link";

export default async function EmailIdDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; queue?: string }>;
}) {
  const user = await requireRole(["IT_ADMIN", "SYSTEM_ADMIN"]);
  const { status, queue } = await searchParams;
  const isQueueOpen = queue === "open";
  const normalizedStatus =
    status && ["PENDING", "FORWARDED", "ISSUED"].includes(status)
      ? (status as EmailIdFormStatus)
      : undefined;

  const forms = (await listEmailIdForms({
    viewerRole: user.role,
    status: normalizedStatus,
    includeApprovals: true,
  })) as EmailFormWithApprovals[];
  const currentStageForms = (await listEmailIdForms({
    status: "FORWARDED",
    includeApprovals: true,
  })) as EmailFormWithApprovals[];
  const currentStagePendingCount = currentStageForms.length;

  const tabs = ["ALL", "PENDING", "FORWARDED", "ISSUED"];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Email ID Requests
            </h1>
          </div>
          <Link
            href="/forms/email-id"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            + New Request
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab}
              href={`/dashboard/email-id?status=${tab}`}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                (status ?? "ALL") === tab
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
              }`}
            >
              {tab === "ALL"
                ? "All"
                : tab === "ISSUED"
                  ? "Completed"
                  : "Pending"}
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Email Approval Queue Access</h2>
              <p className="mt-2 text-lg text-amber-700">Open queue to review Email ID requests.</p>
            </div>
            <div className="relative">
              <Link
                href={
                  isQueueOpen
                    ? `/dashboard/email-id?status=${status ?? "ALL"}`
                    : `/dashboard/email-id?status=${status ?? "ALL"}&queue=open`
                }
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
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {forms.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                No requests found.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Applicant</th>
                    <th className="px-5 py-3 text-left">Role</th>
                    <th className="px-5 py-3 text-left">Department</th>
                    <th className="px-5 py-3 text-left">Submitted</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {forms.map((f) => (
                    <tr
                      key={f.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {f.initials} {f.firstName} {f.lastName}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{f.role}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {f.department}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(f.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${getEmailFormStatusBadgeClass(f.status)}`}>
                          {getEmailFormStatusText({ status: f.status, approvals: f.approvals })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/email-id/${f.id}`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-slate-400">
          {forms.length} request{forms.length !== 1 ? "s" : ""} shown
        </p>
      </div>
    </div>
  );
}
