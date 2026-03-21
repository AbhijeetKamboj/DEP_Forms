import { assignRole } from "@/app/actions/auth";
import { isInstituteEmail, requireRole, toDisplayRole } from "@/lib/auth";
import Link from "next/link";
import { getEmailFormStatusText } from "@/lib/email-id-status";
import {
  listEmailIdForms,
  type EmailFormWithApprovals,
} from "@/lib/email-id-store";
import {
  listVehicleStickerFormsForAdmin,
} from "@/lib/vehicle-sticker-store";
import { getVehicleStickerStatusText } from "@/lib/vehicle-sticker-status";
import {
  listIdentityCardCompletedForms,
  listIdentityCardFormsForStage,
} from "@/lib/identity-card-store";
import { getIdentityCardStatusText } from "@/lib/identity-card-status";
import { listGuestHouseFormsForAdmin } from "@/lib/guest-house-store";
import { getGuestHouseStatusLabel } from "@/lib/guest-house-status";
import {
  type AppRole,
} from "@/lib/mock-db";
import { listUsers } from "@/lib/user-store";

const ROLE_OPTIONS: AppRole[] = [
  "STUDENT",
  "INTERN",
  "EMPLOYEE",
  "HOSTEL_WARDEN",
  "SUPERVISOR",
  "SECTION_HEAD",
  "HOD",
  "REGISTRAR",
  "DEAN_FAA",
  "DIRECTOR",
  "DEPUTY_DEAN",
  "STUDENT_AFFAIRS_HOSTEL_MGMT",
  "SECURITY_OFFICE",
  "FORWARDING_AUTHORITY_ACADEMICS",
  "ESTABLISHMENT",
  "FORWARDING_AUTHORITY_R_AND_D",
  "GUEST_HOUSE_INCHARGE",
  "GUEST_HOUSE_COMMITTEE_CHAIR",
  "IT_ADMIN",
  "SYSTEM_ADMIN",
];

const ADMIN_TABS = [
  { key: "role-requests", label: "Role Requests" },
  { key: "users", label: "Users" },
  { key: "email-queue", label: "Email Queue" },
  { key: "vehicle-queue", label: "Vehicle Queue" },
  { key: "id-card-queue", label: "ID Card Queue" },
  { key: "guest-house-queue", label: "Guest House Queue" },
  { key: "undertaking-queue", label: "Undertaking Queue" },
  { key: "approval-logs", label: "Approval Logs" },
] as const;

type AdminTabKey = (typeof ADMIN_TABS)[number]["key"];

function isAdminTabKey(value: string): value is AdminTabKey {
  return ADMIN_TABS.some((tab) => tab.key === value);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: AdminTabKey = tab && isAdminTabKey(tab) ? tab : "role-requests";

  const currentUser = await requireRole(["SYSTEM_ADMIN"]);
  const users = await listUsers();
  const emailForms = (await listEmailIdForms({
    includeApprovals: true,
  })) as EmailFormWithApprovals[];
  const vehicleForms = await listVehicleStickerFormsForAdmin();
  const identityStage1 = await listIdentityCardFormsForStage(1);
  const identityStage2 = await listIdentityCardFormsForStage(2);
  const identityStage3 = await listIdentityCardFormsForStage(3);
  const identityCompleted = await listIdentityCardCompletedForms();
  const guestHouseForms = await listGuestHouseFormsForAdmin();

  const pendingUsers = users.filter((u) => !u.role && isInstituteEmail(u.email));
  const emailInProcess = emailForms.filter((f) => f.status !== "ISSUED");
  const emailCompleted = emailForms.filter((f) => f.status === "ISSUED");
  const vehicleInProcess = vehicleForms.filter((f) => f.overallStatus !== "approved");
  const vehicleCompleted = vehicleForms.filter((f) => f.overallStatus === "approved");
  const identityInProcess = [...identityStage1, ...identityStage2, ...identityStage3];
  const guestHouseInProcess = guestHouseForms.filter((f) => f.overallStatus !== "approved" && f.overallStatus !== "rejected");
  const guestHouseCompleted = guestHouseForms.filter((f) => f.overallStatus === "approved" || f.overallStatus === "rejected");

  const totalPendingForms =
    emailInProcess.length + vehicleInProcess.length + identityInProcess.length + guestHouseInProcess.length;
  const emailPendingCount = emailInProcess.length;
  const vehiclePendingCount = vehicleInProcess.length;
  const idPendingCount = identityInProcess.length;
  const guestHousePendingCount = guestHouseInProcess.length;
  const undertakingPendingCount = 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <main className="mx-auto max-w-7xl space-y-6">
        <section>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-2xl text-slate-500">
            Approve user role requests and monitor pending workflows
          </p>
          <p className="mt-2 text-sm text-slate-500">Signed in as {currentUser.email}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pending Role Requests" value={pendingUsers.length} accent="text-amber-600" />
          <StatCard label="All Pending Forms" value={totalPendingForms} accent="text-amber-600" />
          <StatCard label="Email Forms" value={emailPendingCount} accent="text-slate-900" />
          <StatCard label="Vehicle Forms" value={vehiclePendingCount} accent="text-slate-900" />
          <StatCard label="Identity Forms" value={idPendingCount} accent="text-slate-900" />
          <StatCard label="Guest House" value={guestHousePendingCount} accent="text-slate-900" />
          <StatCard label="Undertaking" value={undertakingPendingCount} accent="text-slate-900" />
        </section>

        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex min-w-[980px] gap-3">
            {ADMIN_TABS.map((tab) => (
              <Link
                key={tab.key}
                href={`/admin?tab=${tab.key}`}
                className={
                  activeTab === tab.key
                    ? "rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white"
                    : "rounded-xl px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                }
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </section>

        {activeTab === "role-requests" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-semibold text-slate-900">User Role Requests</h2>
              <p className="text-sm text-slate-500">
                Pending role requests: <span className="font-semibold text-slate-800">{pendingUsers.length}</span>
              </p>
            </div>

            <div className="space-y-3">
              {pendingUsers.length === 0 ? (
                <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No pending role requests.
                </p>
              ) : (
                pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <p className="text-xl font-semibold text-slate-900">{user.email}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Requested: {new Date(user.createdAt).toLocaleString("en-IN")}
                    </p>
                    <div className="mt-3">
                      <form action={assignRole} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="role"
                          defaultValue=""
                          className="input max-w-[260px]"
                          required
                        >
                          <option value="" disabled>
                            Select role
                          </option>
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {toDisplayRole(role)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "users" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-semibold text-slate-900">Users</h2>
              <p className="text-sm text-slate-500">Total users: <span className="font-semibold text-slate-800">{users.length}</span></p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-3 font-medium text-slate-900">{user.email}</td>
                      <td className="px-5 py-3 text-slate-700">{user.fullName ?? "-"}</td>
                      <td className="px-5 py-3 text-slate-700">{toDisplayRole(user.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "email-queue" && (
          <>
            <QueueSection
              title="Email Queue - In Process"
              emptyText="No in-process Email ID forms."
              rows={emailInProcess.map((form) => ({
                id: form.id,
                writtenBy: form.submittedByEmail,
                stage: getEmailFormStatusText({ status: form.status, approvals: form.approvals }),
                approvedBy:
                  form.approvals.length === 0
                    ? "-"
                    : form.approvals.map((approval) => approval.approverName).join(", "),
              }))}
            />

            <QueueSection
              title="Email Queue - Completed"
              emptyText="No completed Email ID forms."
              rows={emailCompleted.map((form) => ({
                id: form.id,
                writtenBy: form.submittedByEmail,
                stage: "Completed - Email issued",
                approvedBy: form.approvals.map((approval) => approval.approverName).join(", "),
              }))}
            />
          </>
        )}

        {activeTab === "guest-house-queue" && (
          <>
            <QueueSection
              title="Guest House Queue - In Process"
              emptyText="No in-process guest house forms."
              rows={guestHouseInProcess.map((form) => ({
                id: form.submissionId,
                writtenBy: form.submittedByEmail,
                stage: getGuestHouseStatusLabel(form.overallStatus),
                approvedBy:
                  form.approvals.length === 0
                    ? "-"
                    : form.approvals
                        .filter((approval) => approval.decision === "approved")
                        .map((approval) => approval.recommendationText ?? "-")
                        .join(", "),
              }))}
            />

            <QueueSection
              title="Guest House Queue - Completed"
              emptyText="No completed guest house forms."
              rows={guestHouseCompleted.map((form) => ({
                id: form.submissionId,
                writtenBy: form.submittedByEmail,
                stage: getGuestHouseStatusLabel(form.overallStatus),
                approvedBy:
                  form.approvals.length === 0
                    ? "-"
                    : form.approvals
                        .filter((approval) => approval.decision === "approved")
                        .map((approval) => approval.recommendationText ?? "-")
                        .join(", "),
              }))}
            />
          </>
        )}

        {activeTab === "vehicle-queue" && (
          <>
            <QueueSection
              title="Vehicle Queue - In Process"
              emptyText="No in-process Vehicle Sticker forms."
              rows={vehicleInProcess.map((form) => ({
                id: form.submissionId,
                writtenBy: form.submittedByEmail,
                stage: getVehicleStickerStatusText(form),
                approvedBy:
                  form.approvals.length === 0
                    ? "-"
                    : form.approvals
                        .filter((approval) => approval.decision === "approved")
                        .map((approval) => approval.recommendationText ?? "-")
                        .join(", "),
              }))}
            />

            <QueueSection
              title="Vehicle Queue - Completed"
              emptyText="No completed Vehicle Sticker forms."
              rows={vehicleCompleted.map((form) => ({
                id: form.submissionId,
                writtenBy: form.submittedByEmail,
                stage: "Completed - Sticker issued",
                approvedBy:
                  form.approvals.length === 0
                    ? "-"
                    : form.approvals
                        .filter((approval) => approval.decision === "approved")
                        .map((approval) => approval.recommendationText ?? "-")
                        .join(", "),
              }))}
            />
          </>
        )}

        {activeTab === "id-card-queue" && (
          <>
            <QueueSection
              title="ID Card Queue - In Process"
              emptyText="No in-process identity card forms."
              rows={identityInProcess.map((form) => ({
                id: form.submissionId,
                writtenBy: form.submittedByEmail,
                stage: getIdentityCardStatusText(form),
                approvedBy:
                  form.approvals.length === 0
                    ? "-"
                    : form.approvals
                        .filter((approval) => approval.decision === "approved")
                        .map((approval) => approval.recommendationText ?? "-")
                        .join(", "),
              }))}
            />

            <QueueSection
              title="ID Card Queue - Completed"
              emptyText="No completed identity card forms."
              rows={identityCompleted.map((form) => ({
                id: form.submissionId,
                writtenBy: form.submittedByEmail,
                stage: "Completed - ID card ready",
                approvedBy:
                  form.approvals.length === 0
                    ? "-"
                    : form.approvals
                        .filter((approval) => approval.decision === "approved")
                        .map((approval) => approval.recommendationText ?? "-")
                        .join(", "),
              }))}
            />
          </>
        )}

        {activeTab !== "role-requests" &&
          activeTab !== "users" &&
          activeTab !== "email-queue" &&
          activeTab !== "vehicle-queue" &&
          activeTab !== "id-card-queue" &&
          activeTab !== "guest-house-queue" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">{ADMIN_TABS.find((tab) => tab.key === activeTab)?.label}</h2>
              <p className="mt-2 text-sm text-slate-500">This section UI is ready. Queue data wiring for this tab will be added next.</p>
            </section>
          )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-3 text-5xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function QueueSection({
  title,
  emptyText,
  rows,
}: {
  title: string;
  emptyText: string;
  rows: Array<{
    id: string;
    writtenBy: string;
    stage: string;
    approvedBy: string;
  }>;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-6 text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Written By</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 font-medium text-slate-800">{row.id}</td>
                  <td className="px-5 py-3 text-slate-700">{row.writtenBy}</td>
                  <td className="px-5 py-3 text-slate-700">{row.stage}</td>
                  <td className="px-5 py-3 text-slate-700">{row.approvedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
