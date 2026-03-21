import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboardPathForRole, requireRole } from "@/lib/auth";
import {
  getIdentityCardFormById,
  listIdentityCardAttachmentsBySubmissionId,
  type IdentityCardAttachmentRecord,
} from "@/lib/identity-card-store";
import {
  getIdentityCardStatusBadgeClass,
  getIdentityCardStatusText,
} from "@/lib/identity-card-status";
import {
  DeputyRegistrarPanel,
  HodSectionHeadPanel,
  RegistrarDeanPanel,
} from "./approval-panels";

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

export default async function IdentityCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole([
    "HOD",
    "SECTION_HEAD",
    "ESTABLISHMENT",
    "REGISTRAR",
    "DEAN_FAA",
    "SYSTEM_ADMIN",
  ]);

  const { id } = await params;
  const form = await getIdentityCardFormById(id);
  if (!form) {
    notFound();
  }

  const attachments = await listIdentityCardAttachmentsBySubmissionId(id);
  const dashboardHref = getDashboardPathForRole(user.role);

  const canApproveStage1 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 1 &&
    (user.role === "HOD" || user.role === "SECTION_HEAD" || user.role === "SYSTEM_ADMIN");

  const canApproveStage2 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 2 &&
    (user.role === "ESTABLISHMENT" || user.role === "SYSTEM_ADMIN");

  const canApproveStage3 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 3 &&
    (user.role === "REGISTRAR" || user.role === "DEAN_FAA" || user.role === "SYSTEM_ADMIN");

  const attachmentLabel: Record<IdentityCardAttachmentRecord["documentType"], string> = {
    passport_photo: "Passport Photo",
    previous_id_card: "Previous ID Card",
    deposit_slip: "Deposit Slip",
    fir_copy: "FIR Copy",
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href={dashboardHref} className="hover:text-indigo-600 transition">
            Identity Card Requests
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-800">{form.nameInCapitals}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{form.nameInCapitals}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Ref: {form.submissionId} · Submitted {new Date(form.createdAt).toLocaleDateString("en-IN")}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">Current Stage: {form.currentStage}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getIdentityCardStatusBadgeClass(form)}`}>
            {getIdentityCardStatusText(form)}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-700">Applicant Details</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee / Entry Code" value={form.employeeCodeSnapshot} />
            <Field label="Designation" value={form.designationSnapshot} />
            <Field label="Employment Type" value={form.employmentType} />
            <Field
              label="Contract Upto"
              value={form.contractUpto ? new Date(form.contractUpto).toLocaleDateString("en-IN") : "-"}
            />
            <Field label="Department" value={form.departmentSnapshot} />
            <Field label="Father / Husband Name" value={form.fathersHusbandName} />
            <Field label="Date of Birth" value={new Date(form.dateOfBirth).toLocaleDateString("en-IN")} />
            <Field label="Date of Joining" value={new Date(form.dateOfJoining).toLocaleDateString("en-IN")} />
            <Field label="Blood Group" value={form.bloodGroup} />
            <Field label="Office Phone" value={form.officePhone} />
            <Field label="Mobile" value={form.mobileNumber} />
            <Field label="Email" value={form.emailId} />
            <Field label="Address Line 1" value={form.presentAddress} />
            <Field label="Address Line 2" value={form.presentAddressLine2} />
            <Field label="Card Type" value={form.cardType} />
            <Field label="Previous Card Validity" value={form.previousCardValidity} />
            <Field label="Reason" value={form.reasonForRenewal} />
          </dl>
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Attachments</h2>
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500">No attachments found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {attachments.map((attachment) => {
                const isImage = (attachment.mimeType ?? "").startsWith("image/");
                return (
                  <div key={attachment.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">{attachmentLabel[attachment.documentType]}</p>
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachment.filePath}
                        alt={attachmentLabel[attachment.documentType]}
                        className="mt-3 h-44 w-full rounded-lg border border-slate-200 object-cover"
                      />
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">Preview not available for this file type.</p>
                    )}
                    <a
                      href={attachment.filePath}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-xs font-semibold text-indigo-700 hover:underline"
                    >
                      Open file
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {canApproveStage1 ? <HodSectionHeadPanel submissionId={form.submissionId} /> : null}
        {canApproveStage2 ? <DeputyRegistrarPanel submissionId={form.submissionId} /> : null}
        {canApproveStage3 ? <RegistrarDeanPanel submissionId={form.submissionId} /> : null}

        {form.overallStatus === "approved" ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
            This request has been fully processed. ID card is ready.
          </div>
        ) : null}
      </div>
    </div>
  );
}
