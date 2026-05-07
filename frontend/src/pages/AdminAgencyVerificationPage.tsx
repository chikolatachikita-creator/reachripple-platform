import React, { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Building2, CheckCircle2, XCircle, ExternalLink, FileText } from "lucide-react";
import { getPendingAgencies, approveAgency, rejectAgency } from "../api/agency";

interface PendingAgency {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  verificationStatus: string;
  agencyDetails?: {
    companyName?: string;
    companyNumber?: string;
    website?: string;
    directorName?: string;
    companyRegistrationDoc?: string;
    proofOfAddress?: string;
    directorIdDoc?: string;
  };
  createdAt: string;
}

const apiBase = process.env.REACT_APP_API_URL || "";
const docUrl = (p?: string) => {
  if (!p) return null;
  if (p.startsWith("http")) return p;
  if (p.startsWith("/uploads")) return `${apiBase.replace(/\/api$/, "")}${p}`;
  return `${apiBase.replace(/\/api$/, "")}/${p.replace(/^\//, "")}`;
};

export default function AdminAgencyVerificationPage() {
  const [agencies, setAgencies] = useState<PendingAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPendingAgencies();
      setAgencies(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load pending agencies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: string) => {
    if (!window.confirm("Approve this agency? They'll be marked verified.")) return;
    setBusyId(id);
    try {
      await approveAgency(id);
      setAgencies((prev) => prev.filter((a) => a._id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Reason for rejection (shown to agency):", "Documents could not be verified");
    if (reason === null) return;
    setBusyId(id);
    try {
      await rejectAgency(id, reason || undefined);
      setAgencies((prev) => prev.filter((a) => a._id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <Helmet><title>Agency Verification | Admin</title></Helmet>
      <div className="mb-6 flex items-center gap-3">
        <Building2 className="w-7 h-7 text-orange-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agency Verification</h1>
          <p className="text-sm text-gray-500">Review and approve business KYC submissions.</p>
        </div>
      </div>

      {loading && <div className="p-10 text-center text-gray-500">Loading…</div>}
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      {!loading && !error && agencies.length === 0 && (
        <div className="p-10 bg-white border border-gray-100 rounded-2xl text-center text-gray-500">
          No pending agency verifications. 🎉
        </div>
      )}

      <div className="grid gap-4">
        {agencies.map((a) => (
          <div key={a._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {a.agencyDetails?.companyName || a.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Contact: <strong>{a.name}</strong> · {a.email}
                  {a.phone ? ` · ${a.phone}` : ""}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Submitted {new Date(a.createdAt).toLocaleString("en-GB")}
                </p>

                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {a.agencyDetails?.companyNumber && (
                    <div>
                      <dt className="text-gray-500">Companies House #</dt>
                      <dd className="font-medium text-gray-800">{a.agencyDetails.companyNumber}</dd>
                    </div>
                  )}
                  {a.agencyDetails?.directorName && (
                    <div>
                      <dt className="text-gray-500">Director</dt>
                      <dd className="font-medium text-gray-800">{a.agencyDetails.directorName}</dd>
                    </div>
                  )}
                  {a.agencyDetails?.website && (
                    <div className="sm:col-span-2">
                      <dt className="text-gray-500">Website</dt>
                      <dd>
                        <a
                          href={a.agencyDetails.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          {a.agencyDetails.website} <ExternalLink size={12} />
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { label: "Company Reg.", path: a.agencyDetails?.companyRegistrationDoc },
                    { label: "Proof of Address", path: a.agencyDetails?.proofOfAddress },
                    { label: "Director ID", path: a.agencyDetails?.directorIdDoc },
                  ].map((d) => {
                    const url = docUrl(d.path);
                    return url ? (
                      <a
                        key={d.label}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                      >
                        <FileText size={14} /> {d.label}
                      </a>
                    ) : (
                      <span
                        key={d.label}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-semibold"
                      >
                        <FileText size={14} /> {d.label} (missing)
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex md:flex-col gap-2 md:w-44">
                <button
                  onClick={() => handleApprove(a._id)}
                  disabled={busyId === a._id}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Approve
                </button>
                <button
                  onClick={() => handleReject(a._id)}
                  disabled={busyId === a._id}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
