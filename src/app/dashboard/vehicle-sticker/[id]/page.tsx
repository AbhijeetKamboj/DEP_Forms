import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboardPathForRole, requireRole } from "@/lib/auth";
import {
  getVehicleStickerFormById,
  listVehicleStickerAttachmentsBySubmissionId,
  type VehicleStickerAttachmentRecord,
} from "@/lib/vehicle-sticker-store";
import {
  getVehicleStickerStatusBadgeClass,
  getVehicleStickerStatusText,
} from "@/lib/vehicle-sticker-status";
import {
  HodPanel,
  SecurityOfficePanel,
  StudentAffairsHostelPanel,
  SupervisorPanel,
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

function StageLabel({ stage }: { stage: number }) {
  if (stage === 1) return <span>Supervisor Recommendation</span>;
  if (stage === 2) return <span>HoD Recommendation</span>;
  if (stage === 3) return <span>Student Affairs</span>;
  if (stage === 4) return <span>Security Office Issuance</span>;
  return <span>Unknown Stage</span>;
}

export default async function VehicleStickerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole([
    "SUPERVISOR",
    "HOD",
    "STUDENT_AFFAIRS_HOSTEL_MGMT",
    "SECURITY_OFFICE",
    "SYSTEM_ADMIN",
  ]);

  const { id } = await params;
  const form = await getVehicleStickerFormById(id);
  if (!form) notFound();
  const attachments = await listVehicleStickerAttachmentsBySubmissionId(id);

  const dashboardHref = getDashboardPathForRole(user.role);

  const canApproveStage1 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 1 &&
    (user.role === "SUPERVISOR" || user.role === "SYSTEM_ADMIN");
  const canApproveStage2 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 2 &&
    (user.role === "HOD" || user.role === "SYSTEM_ADMIN");
  const canApproveStage3 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 3 &&
    (user.role === "STUDENT_AFFAIRS_HOSTEL_MGMT" || user.role === "SYSTEM_ADMIN");
  const canApproveStage4 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 4 &&
    (user.role === "SECURITY_OFFICE" || user.role === "SYSTEM_ADMIN");

  const attachmentLabel: Record<VehicleStickerAttachmentRecord["documentType"], string> = {
    passport_photo: "Applicant Photo",
    vehicle_rc: "Vehicle RC",
    driving_license: "Driving License",
    college_id: "College ID",
  };

  const visibleApprovals = form.approvals.filter(
    (approval) => approval.decision !== "pending" || approval.stageNumber === form.currentStage
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href={dashboardHref} className="hover:text-indigo-600 transition">
            Vehicle Sticker Requests
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{form.applicantName}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{form.applicantName}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Ref: {form.submissionId} · Submitted {new Date(form.createdAt).toLocaleDateString("en-IN")}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Current Stage: <StageLabel stage={form.currentStage} />
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getVehicleStickerStatusBadgeClass(form)}`}>
            {getVehicleStickerStatusText(form)}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-700">Applicant Details</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Designation" value={form.designation} />
            <Field label="Department" value={form.department} />
            <Field label="Entry / Employee No" value={form.entryOrEmpNo} />
            <Field label="Phone" value={form.phone} />
            <Field label="Email" value={form.emailContact} />
            <Field label="Driving License No" value={form.drivingLicenseNo} />
            <Field label="DL Valid Upto" value={new Date(form.dlValidUpto).toLocaleDateString("en-IN")} />
            <Field label="Address" value={form.address} />
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-700">Vehicle Details</h2>
          {form.vehicleDetails.length === 0 ? (
            <p className="text-sm text-slate-500">No vehicle details recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Sr No</th>
                    <th className="px-4 py-3">Registration No</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Make & Model</th>
                    <th className="px-4 py-3">Colour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.vehicleDetails.map((v) => (
                    <tr key={v.serialNo}>
                      <td className="px-4 py-3 text-slate-700">{v.serialNo}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{v.registrationNo}</td>
                      <td className="px-4 py-3 text-slate-700">{v.vehicleType}</td>
                      <td className="px-4 py-3 text-slate-700">{v.makeModel}</td>
                      <td className="px-4 py-3 text-slate-700">{v.colour}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Approval Progress</h2>
          <div className="space-y-3">
            {visibleApprovals.map((approval) => (
              <div key={approval.stageNumber} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-800">
                  Stage {approval.stageNumber} - {approval.stageName}
                </p>
                <p className="mt-1 text-slate-600">Decision: {approval.decision}</p>
                <p className="mt-1 text-slate-600">
                  Recommendation: {approval.recommendationText ?? "-"}
                </p>
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

        {canApproveStage1 && <SupervisorPanel submissionId={form.submissionId} />}
        {canApproveStage2 && <HodPanel submissionId={form.submissionId} />}
        {canApproveStage3 && <StudentAffairsHostelPanel submissionId={form.submissionId} />}
        {canApproveStage4 && <SecurityOfficePanel submissionId={form.submissionId} />}

        {form.overallStatus === "approved" && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
            This request has been fully processed and the vehicle sticker has been issued.
          </div>
        )}
      </div>
    </div>
  );
}
