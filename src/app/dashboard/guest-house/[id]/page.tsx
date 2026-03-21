import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboardPathForRole, requireRole } from "@/lib/auth";
import { getGuestHouseFormById } from "@/lib/guest-house-store";
import {
  getGuestHouseStatusBadgeClass,
  getGuestHouseStatusLabel,
} from "@/lib/guest-house-status";
import {
  ApprovingAuthorityPanel,
  ChairmanPanel,
  InChargePanel,
} from "./approval-panels";
import { canRoleApproveGuestHouseStage1 } from "@/lib/guest-house-approver-matrix";

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value ?? "-"}</dd>
    </div>
  );
}

export default async function GuestHouseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole([
    "DIRECTOR",
    "DEAN_FAA",
    "REGISTRAR",
    "DEPUTY_DEAN",
    "HOD",
    "APPROVING_AUTHORITY",
    "GUEST_HOUSE_INCHARGE",
    "GUEST_HOUSE_COMMITTEE_CHAIR",
    "SYSTEM_ADMIN",
  ]);
  const { id } = await params;
  const form = await getGuestHouseFormById(id);
  if (!form) notFound();

  const dashboardHref = getDashboardPathForRole(user.role);

  const canApproveStage1 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 1 &&
    canRoleApproveGuestHouseStage1(user.role, {
      roomType: form.roomType,
      bookingCategory: form.bookingCategory ?? "",
    });
  const canApproveStage2 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 2 &&
    (user.role === "GUEST_HOUSE_INCHARGE" || user.role === "SYSTEM_ADMIN");
  const canApproveStage3 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 3 &&
    (user.role === "GUEST_HOUSE_COMMITTEE_CHAIR" || user.role === "SYSTEM_ADMIN");

  const visibleApprovals = form.approvals.filter(
    (approval) => approval.decision !== "pending" || approval.stageNumber === form.currentStage
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href={dashboardHref} className="hover:text-indigo-600 transition">
            Guest House Requests
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{form.guestName}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{form.guestName}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Ref: {form.submissionId} - Submitted {new Date(form.createdAt).toLocaleDateString("en-IN")}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">Current Stage: {form.currentStage}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getGuestHouseStatusBadgeClass(
              form.overallStatus
            )}`}
          >
            {getGuestHouseStatusLabel(form.overallStatus)}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-700">Guest & Booking Details</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Guest Name" value={form.guestName} />
            <Field label="Gender" value={form.guestGender} />
            <Field label="Contact Number" value={form.contactNumber} />
            <Field label="Guest Address" value={form.guestAddress} />
            <Field label="No. of Guests" value={form.numberOfGuests} />
            <Field label="No. of Rooms" value={form.numberOfRoomsRequired} />
            <Field label="Occupancy" value={form.occupancyType} />
            <Field label="Purpose" value={form.purposeOfBooking} />
            <Field label="Room Type" value={form.roomType} />
            <Field label="Booking Category" value={form.bookingCategory} />
            <Field label="Tariff" value={form.categoryTariffAmount} />
            <Field label="Booking Date" value={form.bookingDate ? new Date(form.bookingDate).toLocaleDateString("en-IN") : "-"} />
            <Field label="Arrival" value={`${new Date(form.arrivalDate).toLocaleDateString("en-IN")} ${form.arrivalTime ?? ""}`} />
            <Field label="Departure" value={`${new Date(form.departureDate).toLocaleDateString("en-IN")} ${form.departureTime ?? ""}`} />
            <Field label="Institute Guest" value={form.isInstituteGuest ? "Yes" : "No"} />
            <Field
              label="Boarding/Lodging by Guest"
              value={form.boardingLodgingByGuest === null ? "-" : form.boardingLodgingByGuest ? "Yes" : "No"}
            />
            <Field label="Room No (stage 2)" value={form.roomNoConfirmed} />
            <Field label="SR No / Page No" value={form.srNoEnteredAtPageNo} />
            <Field label="Check-in" value={form.checkInDateTime ? new Date(form.checkInDateTime).toLocaleString("en-IN") : "-"} />
            <Field label="Check-out" value={form.checkOutDateTime ? new Date(form.checkOutDateTime).toLocaleString("en-IN") : "-"} />
            <Field label="Office Remarks" value={form.officeRemarks} />
            <Field label="Total Charges" value={form.totalCharges} />
            <Field label="Budget Department" value={form.budgetDepartment} />
            <Field label="Submitter" value={form.submittedByEmail} />
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Proposer Details</h2>
          <div className="space-y-3">
            {form.proposers.map((proposer) => (
              <div key={proposer.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-900">{proposer.nameOfProposer}</p>
                <p className="text-slate-700">Designation: {proposer.designation ?? "-"}</p>
                <p className="text-slate-700">Department: {proposer.department ?? "-"}</p>
                <p className="text-slate-700">Employee Code: {proposer.employeeCode ?? "-"}</p>
                <p className="text-slate-700">Entry Number: {proposer.entryNumber ?? "-"}</p>
                <p className="text-slate-700">Mobile Number: {proposer.mobileNumber ?? "-"}</p>
              </div>
            ))}
          </div>
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
                <p className="mt-1 text-slate-600">Recommendation: {approval.recommendationText ?? "-"}</p>
                <p className="mt-1 text-slate-600">
                  Decided At: {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString("en-IN") : "Pending"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {canApproveStage1 ? <ApprovingAuthorityPanel submissionId={form.submissionId} /> : null}
        {canApproveStage2 ? <InChargePanel submissionId={form.submissionId} /> : null}
        {canApproveStage3 ? <ChairmanPanel submissionId={form.submissionId} /> : null}
      </div>
    </div>
  );
}
