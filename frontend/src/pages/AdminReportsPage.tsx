import React, { useEffect, useState } from "react";
import { getAdminReports, resolveReport, AdminReport } from "../api/admin";
import { useConfirmModal } from "../components/ConfirmModal";
import { useToastContext } from "../context/ToastContextGlobal";
import Pagination from "../components/ui/Pagination";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { confirm, setIsLoading: setModalLoading, ConfirmModal } = useConfirmModal();
  const { showSuccess, showError } = useToastContext();

  const [statusFilter, setStatusFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Expandable row for notes
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (searchFilter.trim()) params.search = searchFilter.trim();
      const data = await getAdminReports(params);
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setTotalPages(typeof data.pages === "number" ? data.pages : 1);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadReports();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilter]);

  const handleAction = async (
    reportId: string,
    status: "reviewing" | "reviewed" | "dismissed",
    notes?: string
  ) => {
    const config = {
      reviewing: {
        title: "Mark as Under Review",
        message: "Mark this report as being actively reviewed?",
        type: "info" as const,
        successMsg: "Report marked as under review",
      },
      reviewed: {
        title: "Mark as Reviewed",
        message: "Confirm this report has been fully reviewed and actioned?",
        type: "info" as const,
        successMsg: "Report marked as reviewed",
      },
      dismissed: {
        title: "Dismiss Report",
        message: "Dismiss this report? It will be marked as no action required.",
        type: "warning" as const,
        successMsg: "Report dismissed",
      },
    };

    const actionConfig = config[status];
    const confirmed = await confirm({
      title: actionConfig.title,
      message: actionConfig.message,
      type: actionConfig.type,
    });

    if (!confirmed) return;

    setModalLoading(true);
    setActionLoading(`${reportId}:${status}`);
    try {
      await resolveReport(reportId, status, notes || undefined);
      showSuccess(actionConfig.successMsg);
      setExpandedId(null);
      setNotesInput("");
      await loadReports();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "Failed to update report";
      showError(errorMessage);
    } finally {
      setActionLoading(null);
      setModalLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getAdTitle = (report: AdminReport) => {
    if (typeof report.adId === "object" && report.adId?.title) return report.adId.title;
    return String(report.adId);
  };

  const getReporterInfo = (report: AdminReport) => {
    if (typeof report.reporterId === "object" && report.reporterId?.name) {
      return { name: report.reporterId.name, email: report.reporterId.email };
    }
    return { name: "Unknown", email: "" };
  };

  const getReviewerName = (report: AdminReport) => {
    if (typeof report.reviewedBy === "object" && report.reviewedBy?.name) {
      return report.reviewedBy.name;
    }
    return null;
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      reviewing: "bg-blue-100 text-blue-700",
      reviewed: "bg-green-100 text-green-700",
      dismissed: "bg-gray-100 text-gray-600",
    };
    return (
      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const toggleExpand = (id: string, existingNotes?: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setNotesInput("");
    } else {
      setExpandedId(id);
      setNotesInput(existingNotes || "");
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports Management</h1>
        <span className="text-sm text-gray-500">{total} total report{total !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <ConfirmModal />

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by reason..."
            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm min-w-[200px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            <option value="">Status: All</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Under Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        {loading ? (
          <div className="animate-pulse">
            <div className="bg-gray-100 rounded-t-lg h-12 mb-1" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 py-4 px-6 border-b border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-6 bg-gray-200 rounded-full w-20" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📋</div>
            <h3 className="font-semibold text-gray-900">No Reports Found</h3>
            <p className="text-gray-600">No reports match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Ad</th>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const reporter = getReporterInfo(report);
                  const reviewer = getReviewerName(report);
                  const isExpanded = expandedId === report._id;

                  return (
                    <React.Fragment key={report._id}>
                      <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(report._id, report.adminNotes)}>
                        <td className="px-4 py-4 font-medium text-purple-700 max-w-[160px] truncate" title={getAdTitle(report)}>
                          {getAdTitle(report)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-gray-800 text-sm">{reporter.name}</div>
                          {reporter.email && <div className="text-gray-400 text-xs">{reporter.email}</div>}
                        </td>
                        <td className="px-4 py-4 max-w-[200px]">
                          <div className="font-medium text-gray-800 truncate" title={report.reason}>{report.reason}</div>
                          {report.description && (
                            <div className="text-gray-500 text-xs mt-1 truncate" title={report.description}>
                              {report.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">{formatDate(report.createdAt)}</td>
                        <td className="px-4 py-4">{statusBadge(report.status)}</td>
                        <td className="px-4 py-4">
                          {reviewer ? (
                            <div>
                              <div className="text-xs text-gray-700">{reviewer}</div>
                              {report.reviewedAt && <div className="text-xs text-gray-400">{formatDate(report.reviewedAt)}</div>}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {(report.status === "pending" || report.status === "reviewing") && (
                            <div className="flex gap-2 justify-end flex-wrap">
                              {report.status === "pending" && (
                                <button
                                  onClick={() => handleAction(report._id, "reviewing")}
                                  disabled={!!actionLoading}
                                  className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50"
                                >
                                  {actionLoading === `${report._id}:reviewing` ? "..." : "Review"}
                                </button>
                              )}
                              <button
                                onClick={() => handleAction(report._id, "reviewed", notesInput || undefined)}
                                disabled={!!actionLoading}
                                className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
                              >
                                {actionLoading === `${report._id}:reviewed` ? "..." : "Resolve"}
                              </button>
                              <button
                                onClick={() => handleAction(report._id, "dismissed", notesInput || undefined)}
                                disabled={!!actionLoading}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
                              >
                                {actionLoading === `${report._id}:dismissed` ? "..." : "Dismiss"}
                              </button>
                            </div>
                          )}
                          {report.status !== "pending" && report.status !== "reviewing" && (
                            <span className="text-xs text-gray-400">Closed</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-gray-50 border-b">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left: Report details */}
                              <div>
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Report Details</h4>
                                <div className="text-sm space-y-1">
                                  <p><span className="font-medium text-gray-600">Reason:</span> {report.reason}</p>
                                  {report.description && (
                                    <p className="text-gray-600">
                                      <span className="font-medium">Description:</span> {report.description}
                                    </p>
                                  )}
                                  <p><span className="font-medium text-gray-600">Filed:</span> {formatDate(report.createdAt)}</p>
                                  {reviewer && (
                                    <p>
                                      <span className="font-medium text-gray-600">Reviewed by:</span> {reviewer}
                                      {report.reviewedAt && ` on ${formatDate(report.reviewedAt)}`}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Right: Admin notes */}
                              <div>
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Admin Notes</h4>
                                {(report.status === "pending" || report.status === "reviewing") ? (
                                  <textarea
                                    value={notesInput}
                                    onChange={(e) => setNotesInput(e.target.value)}
                                    placeholder="Add notes about this report (saved when resolving/dismissing)..."
                                    maxLength={2000}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <p className="text-sm text-gray-600">
                                    {report.adminNotes || <span className="text-gray-400 italic">No notes</span>}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between mt-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              size="sm"
              variant="default"
              siblingCount={1}
            />
          </div>
        )}
      </div>
    </div>
  );
}
