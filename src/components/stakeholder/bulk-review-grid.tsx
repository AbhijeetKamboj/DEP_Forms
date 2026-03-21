"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

export type BulkReviewDecision = "approve" | "reject";

export type BulkReviewRow = {
  id: string;
  cell1: string;
  cell2: string;
  cell3: string;
  submittedAt: string;
  statusText: string;
  statusClassName: string;
  viewHref: string;
  selectable?: boolean;
};

export function BulkReviewGrid(props: {
  pendingRows: BulkReviewRow[];
  completedRows: BulkReviewRow[];
  cell1Header: string;
  cell2Header: string;
  cell3Header: string;
  onBulkReview: (input: {
    ids: string[];
    decision: BulkReviewDecision;
    approverName: string;
    remark: string;
  }) => Promise<void>;
}) {
  const { pendingRows, completedRows, cell1Header, cell2Header, cell3Header, onBulkReview } = props;
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [approverName, setApproverName] = useState("");
  const [bulkRemark, setBulkRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rows = activeTab === "pending" ? pendingRows : completedRows;
  const isPendingTab = activeTab === "pending";
  const pendingIdSet = useMemo(
    () => new Set(pendingRows.filter((row) => row.selectable !== false).map((row) => row.id)),
    [pendingRows]
  );
  const actionablePendingCount = pendingIdSet.size;

  const selectedCount = selectedIds.filter((id) => pendingIdSet.has(id)).length;
  const isAllSelected = actionablePendingCount > 0 && selectedCount === actionablePendingCount;

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((currentId) => currentId !== id) : [...prev, id]
    );
  }

  function toggleSelectAllPending() {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pendingIdSet.has(id)));
      return;
    }

    setSelectedIds((prev) => {
      const merged = new Set(prev);
      for (const row of pendingRows) {
        merged.add(row.id);
      }
      return Array.from(merged);
    });
  }

  function runBulkReview(decision: BulkReviewDecision) {
    const actionableIds = selectedIds.filter((id) => pendingIdSet.has(id));
    if (actionableIds.length === 0) {
      setError("Please select at least one pending request.");
      return;
    }
    if (!approverName.trim()) {
      setError("Approver name is required.");
      return;
    }
    if (!bulkRemark.trim()) {
      setError("Bulk remark is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await onBulkReview({
          ids: actionableIds,
          decision,
          approverName: approverName.trim(),
          remark: bulkRemark.trim(),
        });
        setSelectedIds([]);
        setBulkRemark("");
      } catch (actionError) {
        setError((actionError as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`rounded-xl border px-6 py-2 text-sm font-semibold transition ${
            activeTab === "pending"
              ? "border-amber-400 bg-amber-100 text-amber-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          Pending ({pendingRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`rounded-xl border px-6 py-2 text-sm font-semibold transition ${
            activeTab === "completed"
              ? "border-green-400 bg-green-100 text-green-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          Completed ({completedRows.length})
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {isPendingTab ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-4">
              <button
                type="button"
                onClick={toggleSelectAllPending}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {isAllSelected ? "Clear All" : "Select All"}
              </button>
              <span className="text-sm text-slate-600">
                Selected: {selectedCount}/{actionablePendingCount}
              </span>
            </div>

            <label className="mb-1 block text-sm font-semibold text-slate-700">Approver Name</label>
            <input
              value={approverName}
              onChange={(event) => setApproverName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="Name used for approval or rejection entries"
            />

            <label className="mb-1 mt-3 block text-sm font-semibold text-slate-700">Bulk Remark *</label>
            <textarea
              value={bulkRemark}
              onChange={(event) => setBulkRemark(event.target.value)}
              className="h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="One common remark for all selected requests"
            />

            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => runBulkReview("approve")}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Approve All Selected"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => runBulkReview("reject")}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Reject All Selected"}
              </button>
            </div>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No requests in this tab.</div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  {isPendingTab ? <th className="px-4 py-3">Select</th> : null}
                  <th className="px-4 py-3">{cell1Header}</th>
                  <th className="px-4 py-3">{cell2Header}</th>
                  <th className="px-4 py-3">{cell3Header}</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const isPendingRow = pendingIdSet.has(row.id);
                  const checked = selectedIds.includes(row.id);
                  return (
                    <tr key={row.id} className="bg-white">
                      {isPendingTab ? (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!isPendingRow}
                            onChange={() => toggleSelection(row.id)}
                            className="h-6 w-6 rounded border-slate-300"
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 font-medium text-slate-900">{row.cell1}</td>
                      <td className="px-4 py-3 text-slate-700">{row.cell2}</td>
                      <td className="px-4 py-3 text-slate-700">{row.cell3}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${row.statusClassName}`}>
                          {row.statusText}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.submittedAt}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={row.viewHref}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Full Form
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
