import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useToastContext } from "../context/ToastContextGlobal";
import { useAuth } from "../context/AuthContext";

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastContext();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Active tab
  const [activeTab, setActiveTab] = useState("profile");

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ID verification state
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationFile, setVerificationFile] = useState(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await client.get("/auth/me");
      setUser(res.data.user);
      setName(res.data.user.name || "");
      setEmail(res.data.user.email || "");
      setPhone(res.data.user.phone || "");
      setBio(res.data.user.bio || "");
      setAvatarUrl(res.data.user.avatarUrl || "");
    } catch (err) {
      showError("Failed to load user profile");
      if (err.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, showError]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Fetch verification status
  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const res = await client.get("/verification/status");
        setVerificationStatus(res.data.idVerificationStatus || "none");
      } catch {
        // Endpoint may 401 if not logged in — ignore
      }
    };
    fetchVerification();
  }, []);

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!verificationFile) {
      showError("Please select a file to upload");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(verificationFile.type)) {
      showError("Only JPG, PNG, or PDF files are accepted");
      return;
    }
    if (verificationFile.size > 5 * 1024 * 1024) {
      showError("File must be under 5 MB");
      return;
    }

    setSubmittingVerification(true);
    try {
      const formData = new FormData();
      formData.append("idDocument", verificationFile);
      await client.post("/verification/request", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showSuccess("Verification request submitted! We'll review it shortly.");
      setVerificationStatus("pending");
      setVerificationFile(null);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to submit verification");
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showError("Only JPEG, PNG or WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError("Image must be under 5 MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await client.post("/auth/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatarUrl(res.data.avatarUrl || "");
      if (res.data.user) setUser(res.data.user);
      showSuccess("Profile photo updated");
    } catch (err) {
      showError(err.response?.data?.error || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setSaving(true);

    try {
      const payload = { name, email };
      if (phone !== undefined) payload.phone = phone.trim();
      if (bio !== undefined) payload.bio = bio;
      const res = await client.put("/auth/profile", payload);
      setUser(res.data.user);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      showSuccess("Profile updated successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to update profile";
      setMessage({ type: "error", text: errorMsg });
      showError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      showError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" });
      showError("Password must be at least 8 characters");
      return;
    }

    setSaving(true);

    try {
      await client.put("/auth/password", {
        currentPassword,
        newPassword,
      });
      setMessage({ type: "success", text: "Password changed successfully!" });
      showSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to change password";
      setMessage({ type: "error", text: errorMsg });
      showError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE MY ACCOUNT") {
      showError("Please type 'DELETE MY ACCOUNT' exactly to confirm");
      return;
    }

    if (!deletePassword) {
      showError("Password is required to delete your account");
      return;
    }

    setDeleting(true);

    try {
      await client.delete("/auth/account", {
        data: {
          password: deletePassword,
          confirmDelete: deleteConfirmText,
        },
      });

      showSuccess("Account deleted successfully. We're sorry to see you go.");
      
      // Clear all local storage and redirect
      localStorage.clear();
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to delete account";
      showError(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-blue-100">
      <Helmet><title>My Profile | ReachRipple</title></Helmet>
      {/* Navigation */}
      <nav className="w-full bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logomark.png" alt="ReachRipple" className="w-10 h-10 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow" />
            <div className="text-sm font-bold leading-tight"><span className="text-blue-500">Reach</span><span className="text-purple-600">Ripple</span></div>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-gray-600 hover:text-purple-600 transition"
            >
              Dashboard
            </Link>
            <Link
              to="/my-ads"
              className="text-gray-600 hover:text-purple-600 transition"
            >
              My Ads
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-500 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Account Settings</h1>
          <p className="text-gray-500">Manage your profile and security settings</p>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === "profile"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === "password"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Password
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === "account"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveTab("verification")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === "verification"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Verification
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Information</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Avatar upload */}
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 border border-gray-200 flex-shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl.startsWith("http") ? avatarUrl : `${process.env.REACT_APP_API_URL || ""}${avatarUrl}`}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-purple-500">
                      {(name || email || "U").trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition">
                    {avatarUrl ? "Change photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1.5">JPEG, PNG or WebP. Max 5 MB.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                  placeholder="Your display name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                  placeholder="+44 7700 900000"
                />
                <p className="text-xs text-gray-500 mt-1.5">Format: +44 followed by 10 digits.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none"
                  placeholder="Tell others a little about yourself..."
                  maxLength={500}
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${bio.length >= 480 ? "text-amber-600" : "text-gray-400"}`}>
                    {bio.length}/500
                  </span>
                </div>
              </div>
              <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900 text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                  placeholder="Enter new password"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900 text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {saving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Account Information</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Account Status</span>
                  <span className={`font-medium ${
                    user?.status === "active" ? "text-green-600" : "text-red-600"
                  }`}>
                    {user?.status === "active" ? "✓ Active" : "Suspended"}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Account Type</span>
                  <span className="text-gray-800 capitalize font-medium">{user?.role || "User"}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Member Since</span>
                  <span className="text-gray-800">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-GB", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Data Export (GDPR) */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
              <h2 className="text-xl font-semibold text-blue-700 mb-2">📦 Your Data</h2>
              <p className="text-gray-600 mb-4">
                Download a copy of all your personal data held by ReachRipple, including your profile, ads, search history, and notifications.
              </p>
              <button
                onClick={async () => {
                  try {
                    const res = await client.get("/auth/data-export", { responseType: "blob" });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `reachripple-data-export-${Date.now()}.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    showSuccess("Your data export has been downloaded.");
                  } catch {
                    showError("Failed to export data. Please try again.");
                  }
                }}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition"
              >
                Download My Data
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-200">
              <h2 className="text-xl font-semibold text-red-600 mb-4">⚠️ Danger Zone</h2>
              <p className="text-gray-600 mb-4">
                Once you delete your account, there is no going back. All your ads will be removed and your data will be anonymized.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Verification Tab */}
        {activeTab === "verification" && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">ID Verification</h2>
            <p className="text-gray-500 mb-6">
              Verify your identity to earn a trust badge on your profile. Upload a government-issued photo ID (passport, driving licence, or national ID card).
            </p>

            {verificationStatus === "verified" && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-semibold text-green-700">Identity Verified</p>
                  <p className="text-sm text-green-600">Your identity has been confirmed. A verification badge is shown on your profile.</p>
                </div>
              </div>
            )}

            {verificationStatus === "pending" && (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="font-semibold text-yellow-700">Verification Pending</p>
                  <p className="text-sm text-yellow-600">Your ID document is being reviewed. This usually takes 1-2 business days.</p>
                </div>
              </div>
            )}

            {verificationStatus === "rejected" && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                <span className="text-2xl">❌</span>
                <div>
                  <p className="font-semibold text-red-700">Verification Rejected</p>
                  <p className="text-sm text-red-600">Your previous submission was rejected. Please try again with a clearer photo.</p>
                </div>
              </div>
            )}

            {(verificationStatus === "none" || verificationStatus === "rejected") && (
              <form onSubmit={handleVerificationSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload ID Document
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => setVerificationFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="verification-file"
                    />
                    <label htmlFor="verification-file" className="cursor-pointer">
                      <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600 font-medium">
                        {verificationFile ? verificationFile.name : "Click to select a file"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF — Max 5 MB</p>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                  <p className="font-medium mb-1">What we accept:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-600">
                    <li>Passport (photo page)</li>
                    <li>Driving licence (front)</li>
                    <li>National ID card (front)</li>
                  </ul>
                  <p className="mt-2 text-xs text-blue-500">Your document is stored securely and never shared with other users.</p>
                </div>

                <button
                  type="submit"
                  disabled={submittingVerification || !verificationFile}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900 text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {submittingVerification ? "Submitting..." : "Submit for Verification"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            to="/dashboard"
            className="text-purple-600 hover:text-purple-700 transition font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Delete Account</h3>
            <p className="text-gray-600 mb-4">
              This action is <strong>permanent and irreversible</strong>. All your:
            </p>
            <ul className="text-gray-600 mb-4 list-disc list-inside text-sm">
              <li>Ads will be removed</li>
              <li>Saved profiles will be deleted</li>
              <li>Search history will be cleared</li>
              <li>Account data will be anonymized</li>
            </ul>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter your password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your current password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="font-mono text-red-600">DELETE MY ACCOUNT</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteConfirmText("");
                }}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== "DELETE MY ACCOUNT"}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
              >
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-xs text-gray-500">
            © {new Date().getFullYear()} <span className="text-blue-500">Reach</span><span className="text-purple-600">Ripple</span>. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
