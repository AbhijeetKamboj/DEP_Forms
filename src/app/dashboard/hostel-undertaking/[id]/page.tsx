import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboardPathForRole, requireRole } from "@/lib/auth";
import { getHostelUndertakingFormById } from "@/lib/hostel-undertaking-store";
import {
  getHostelUndertakingStatusBadgeClass,
  getHostelUndertakingStatusText,
} from "@/lib/hostel-undertaking-status";
import { HostelWardenApprovalPanel } from "./approval-panel";

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value ?? "-"}</dd>
    </div>
  );
}

export default async function HostelUndertakingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["HOSTEL_WARDEN", "SYSTEM_ADMIN"]);
  const { id } = await params;

  const form = await getHostelUndertakingFormById(id);
  if (!form) {
    notFound();
  }

  const dashboardHref = getDashboardPathForRole(user.role);
  const canReview =
    form.currentStage === 1 &&
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    (user.role === "HOSTEL_WARDEN" || user.role === "SYSTEM_ADMIN");

  const photoAttachment = form.attachments.find((item) => item.documentType === "passport_photo") ?? null;
  const parentDoc = form.attachments.find((item) => item.documentType === "supporting_document") ?? null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href={dashboardHref} className="hover:text-indigo-600 transition">
            Hostel Undertaking Requests
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-800">{form.studentName}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{form.studentName}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Ref: {form.submissionId} · Submitted {new Date(form.createdAt).toLocaleDateString("en-IN")}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">Current Stage: Hostel Warden Acknowledgement</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getHostelUndertakingStatusBadgeClass(form)}`}>
            {getHostelUndertakingStatusText(form)}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-700">Student Details</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Entry Number" value={form.entryNumber} />
            <Field label="Course" value={form.courseName} />
            <Field label="Department" value={form.department} />
            <Field label="Hostel Room" value={form.hostelRoomNo} />
            <Field label="Email" value={form.emailAddress} />
            <Field label="Date of Joining" value={new Date(form.dateOfJoining).toLocaleDateString("en-IN")} />
            <Field label="Blood Group" value={form.bloodGroup} />
            <Field label="Category" value={form.category} />
            <Field label="Emergency Contact" value={form.emergencyContactNo} />
            <Field label="Declaration Date" value={form.declarationDate ? new Date(form.declarationDate).toLocaleDateString("en-IN") : "-"} />
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-700">Fee Details</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="HEF Amount" value={form.hefAmount !== null ? String(form.hefAmount) : "-"} />
            <Field label="Mess Security" value={form.messSecurity !== null ? String(form.messSecurity) : "-"} />
            <Field label="Mess Admission Fee" value={form.messAdmissionFee !== null ? String(form.messAdmissionFee) : "-"} />
            <Field label="Mess Charges" value={form.messCharges !== null ? String(form.messCharges) : "-"} />
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Guardian Details</h2>
          <div className="space-y-4">
            {form.guardians.length === 0 ? (
              <p className="text-sm text-slate-500">No guardian details recorded.</p>
            ) : (
              form.guardians.map((guardian) => (
                <div key={guardian.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-800">
                    {guardian.guardianType === "parent" ? "Parent / Guardian" : "Local Guardian"}
                  </p>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <Field label="Relationship" value={guardian.relationship} />
                    <Field label="Office Mobile" value={guardian.officeMobile} />
                    <Field label="Office Telephone" value={guardian.officeTelephone} />
                    <Field label="Office Email" value={guardian.officeEmail} />
                    <Field label="Residence Mobile" value={guardian.residenceMobile} />
                    <Field label="Residence Telephone" value={guardian.residenceTelephone} />
                    <Field label="Residence Email" value={guardian.residenceEmail} />
                    <Field label="Office Address 1" value={guardian.officeAddressLine1} />
                    <Field label="Office Address 2" value={guardian.officeAddressLine2} />
                    <Field label="Residence Address 1" value={guardian.residenceAddressLine1} />
                    <Field label="Residence Address 2" value={guardian.residenceAddressLine2} />
                  </dl>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Attachments</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">Passport Photo</p>
              {photoAttachment ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoAttachment.filePath}
                  alt="Passport"
                  className="mt-3 h-44 w-full rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <p className="mt-3 text-xs text-slate-500">Not uploaded.</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">Parent Signature</p>
              {parentDoc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={parentDoc.filePath}
                  alt="Parent signature"
                  className="mt-3 h-44 w-full rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <p className="mt-3 text-xs text-slate-500">Not uploaded.</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Approval Progress</h2>
          <div className="space-y-3">
            {form.approvals.map((approval) => (
              <div key={approval.stageNumber} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-800">
                  Stage {approval.stageNumber} - {approval.stageName}
                </p>
                <p className="mt-1 text-slate-600">Decision: {approval.decision}</p>
                <p className="mt-1 text-slate-600">Recommendation: {approval.recommendationText ?? "-"}</p>
                <p className="mt-1 text-slate-600">
                  Decided At: {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString("en-IN") : "Pending"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {canReview ? <HostelWardenApprovalPanel submissionId={form.submissionId} /> : null}
      </div>
    </div>
  );
}
