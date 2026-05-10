import React, { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  getAgencyMe,
  upgradeToAgency,
  uploadAgencyKyc,
  updateAgencyDetails,
  AgencyMe,
} from "../api/agency";

const STATUS_BADGE: Record<string, string> = {
  unverified: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  unverified: "Not submitted",
  pending: "Pending review",
  verified: "Verified ✓",
  rejected: "Rejected",
};

export default function AgencyDashboardPage() {
  const [me, setMe] = useState<AgencyMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMe(await getAgencyMe());
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Helmet><title>Agency Account | ReachRipple</title></Helmet>
      <Navbar showSaved={false} />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">Agency Account</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your agency profile, complete KYC verification, and access agency-only features.
          </p>
        </div>

        {loading && <div className="p-10 text-center text-zinc-500">Loading…</div>}
        {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

        {!loading && me && (
          me.accountType !== "agency"
            ? <UpgradeToAgencyCard onUpgraded={load} />
            : <AgencyPanel me={me} onUpdated={load} />
        )}
      </main>
    </div>
  );
}

function UpgradeToAgencyCard({ onUpgraded }: { onUpgraded: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);
    if (!companyName.trim()) {
      setErr("Agency / business name is required");
      return;
    }
    setSubmitting(true);
    try {
      await upgradeToAgency({ companyName, companyNumber, website, directorName, phone });
      setOkMsg("You're now an agency. Complete KYC below to get verified.");
      onUpgraded();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Upgrade failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Switch to an agency account</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Agency accounts get higher posting limits, multi-listing dashboards, a dedicated public agency page, and access to agency-tier subscriptions.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Agency / business name" required>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} required />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Companies House number">
            <input value={companyNumber} onChange={(e) => setCompanyNumber(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Business phone">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Director name">
          <input value={directorName} onChange={(e) => setDirectorName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Website">
          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://" />
        </Field>

        {err && <p className="text-sm text-red-600">{err}</p>}
        {okMsg && <p className="text-sm text-green-600">{okMsg}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-700 text-white font-semibold disabled:opacity-50"
        >
          {submitting ? "Upgrading…" : "Upgrade to agency"}
        </button>
      </form>
    </div>
  );
}

function AgencyPanel({ me, onUpdated }: { me: AgencyMe; onUpdated: () => void }) {
  const d = me.agencyDetails || {};
  const status = me.verificationStatus || "unverified";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{d.companyName || "Your agency"}</h2>
            <p className="text-sm text-zinc-500">{d.directorName ? `Director: ${d.directorName}` : ""}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[status] || STATUS_BADGE.unverified}`}>
            {STATUS_LABEL[status] || status}
          </span>
        </div>

        {status === "rejected" && d.rejectionReason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <strong>Reason:</strong> {d.rejectionReason} — please re-upload corrected documents below.
          </div>
        )}

        <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Info label="Companies House #" value={d.companyNumber} />
          <Info label="VAT number" value={d.vatNumber} />
          <Info label="Website" value={d.website} />
          <Info label="Plan" value={`${me.postingPlan} / ${me.accountTier}`} />
        </dl>

        <div className="mt-5 flex gap-2 flex-wrap">
          <Link to="/tiers" className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600">
            Manage subscription
          </Link>
          <Link to="/dashboard" className="px-4 py-2 rounded-lg border border-zinc-200 text-sm font-semibold hover:bg-zinc-50">
            My listings
          </Link>
        </div>
      </div>

      <KycUploadCard initialStatus={status} onUploaded={onUpdated} />

      <UpdateDetailsCard initial={d} onSaved={onUpdated} />
    </div>
  );
}

function KycUploadCard({ initialStatus, onUploaded }: { initialStatus: string; onUploaded: () => void }) {
  const [companyDoc, setCompanyDoc] = useState<File | null>(null);
  const [addressDoc, setAddressDoc] = useState<File | null>(null);
  const [directorDoc, setDirectorDoc] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!companyDoc && !addressDoc && !directorDoc) {
      setMsg({ type: "err", text: "Please choose at least one document to upload." });
      return;
    }
    setSubmitting(true);
    try {
      await uploadAgencyKyc({
        companyRegistrationDoc: companyDoc || undefined,
        proofOfAddress: addressDoc || undefined,
        directorIdDoc: directorDoc || undefined,
      });
      setMsg({ type: "ok", text: "Documents uploaded. We'll review shortly." });
      setCompanyDoc(null);
      setAddressDoc(null);
      setDirectorDoc(null);
      onUploaded();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.response?.data?.message || e?.response?.data?.error || "Upload failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">KYC documents</h3>
      <p className="text-sm text-zinc-500 mt-1">
        Upload company registration, proof of business address, and director photo ID. JPG/PNG/PDF, max 8 MB each.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <FileField label="Company registration certificate" file={companyDoc} onChange={setCompanyDoc} />
        <FileField label="Proof of business address" file={addressDoc} onChange={setAddressDoc} />
        <FileField label="Director photo ID" file={directorDoc} onChange={setDirectorDoc} />

        {msg && (
          <p className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
        >
          {submitting ? "Uploading…" : initialStatus === "verified" ? "Replace documents" : "Submit for verification"}
        </button>
      </form>
    </div>
  );
}

function UpdateDetailsCard({ initial, onSaved }: { initial: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    companyName: initial.companyName || "",
    companyNumber: initial.companyNumber || "",
    vatNumber: initial.vatNumber || "",
    directorName: initial.directorName || "",
    registeredAddress: initial.registeredAddress || "",
    tradingAddress: initial.tradingAddress || "",
    website: initial.website || "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await updateAgencyDetails(form);
      setMsg("Saved.");
      onSaved();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Business details</h3>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Agency name"><input value={form.companyName} onChange={set("companyName")} className={inputCls} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Companies House #"><input value={form.companyNumber} onChange={set("companyNumber")} className={inputCls} /></Field>
          <Field label="VAT number"><input value={form.vatNumber} onChange={set("vatNumber")} className={inputCls} /></Field>
        </div>
        <Field label="Director name"><input value={form.directorName} onChange={set("directorName")} className={inputCls} /></Field>
        <Field label="Registered address"><input value={form.registeredAddress} onChange={set("registeredAddress")} className={inputCls} /></Field>
        <Field label="Trading address"><input value={form.tradingAddress} onChange={set("tradingAddress")} className={inputCls} /></Field>
        <Field label="Website"><input type="url" value={form.website} onChange={set("website")} className={inputCls} /></Field>

        {msg && <p className="text-sm text-zinc-600">{msg}</p>}
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save details"}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  "w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-800 dark:text-zinc-200">{value || "—"}</dd>
    </div>
  );
}

function FileField({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{label}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="block w-full text-sm text-zinc-700 dark:text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
      />
      {file && <p className="mt-1 text-xs text-zinc-500">Selected: {file.name}</p>}
    </label>
  );
}
