import { requireUser } from "@/lib/auth";
import {
  getHostelUndertakingFormById,
  type HostelUndertakingAttachmentRecord,
} from "@/lib/hostel-undertaking-store";
import {
  getHostelUndertakingStatusBadgeClass,
  getHostelUndertakingStatusText,
} from "@/lib/hostel-undertaking-status";
import { notFound, redirect } from "next/navigation";

export default async function HostelUndertakingStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const form = await getHostelUndertakingFormById(id);
  if (!form) {
    notFound();
  }

  const canReviewAny = user.role === "HOSTEL_WARDEN" || user.role === "SYSTEM_ADMIN";
  if (!canReviewAny && form.submittedByEmail.toLowerCase() !== user.email.toLowerCase()) {
    redirect("/");
  }

  const attachmentLabel: Record<HostelUndertakingAttachmentRecord["documentType"], string> = {
    passport_photo: "Passport Photo",
    supporting_document: "Parent Signed Undertaking",
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">IIT Ropar - Hostel Undertaking</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Application Status</h1>
          <p className="mt-1 text-sm text-slate-500">Reference ID: {form.submissionId}</p>
        </div>

        <div className={`rounded-xl px-5 py-4 ${getHostelUndertakingStatusBadgeClass(form)}`}>
          <p className="font-semibold">{getHostelUndertakingStatusText(form)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Stage Flow</h2>
          <ol className="space-y-3">
            {form.approvals.map((approval) => {
              const isComplete = approval.decision === "approved";
              const isRejected = approval.decision === "rejected";
              return (
                <li key={approval.stageNumber} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-800">Stage {approval.stageNumber} - {approval.stageName}</p>
                  <p className="mt-1 text-slate-600">
                    {isRejected
                      ? "Rejected"
                      : isComplete
                        ? "Completed"
                        : "Pending"}
                  </p>
                  {approval.recommendationText ? (
                    <p className="mt-1 text-slate-500">Remark: {approval.recommendationText}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Form Snapshot</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Student Name</dt>
              <dd className="font-medium text-slate-900">{form.studentName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Entry Number</dt>
              <dd className="font-medium text-slate-900">{form.entryNumber}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Course</dt>
              <dd className="font-medium text-slate-900">{form.courseName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Department</dt>
              <dd className="font-medium text-slate-900">{form.department}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Date of Joining</dt>
              <dd className="font-medium text-slate-900">{new Date(form.dateOfJoining).toLocaleDateString("en-IN")}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Hostel Room</dt>
              <dd className="font-medium text-slate-900">{form.hostelRoomNo ?? "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Attachments</h2>
          {form.attachments.length === 0 ? (
            <p className="text-sm text-slate-500">No attachments found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {form.attachments.map((attachment) => {
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
      </div>
    </div>
  );
}
