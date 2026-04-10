import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import ConfirmModal from "./ConfirmModal";
import {
  LayoutDashboard,
  FileText,
  Users,
  Flag,
  BarChart3,
  DollarSign,
  Settings,
  LogOut,
  ShieldAlert,
  GitBranch,
} from "lucide-react";

export default function AdminSidebar() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.clear();
    window.location.replace("/login");
  };

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-br from-pink-500 via-purple-600 to-blue-900 text-white flex flex-col shadow-lg">
      {/* Header */}
      <div className="px-6 py-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <img src="/logomark.png" alt="ReachRipple" className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/20" />
          <h1 className="text-xl font-bold tracking-tight">ReachRipple Admin</h1>
        </div>
        <p className="text-xs text-white/70 mt-1">Dashboard & Control Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-3">
        {/* Dashboard */}
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-white/25 shadow-lg backdrop-blur-sm border border-white/30"
                : "text-white/80 hover:bg-white/10"
            }`
          }
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        {/* Manage Ads */}
        <NavLink
          to="/admin/ads"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-white/25 shadow-lg backdrop-blur-sm border border-white/30"
                : "text-white/80 hover:bg-white/10"
            }`
          }
        >
          <FileText size={20} />
          <span>Manage Ads</span>
        </NavLink>

        {/* Users */}
        <NavLink
          to="/admin/users"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-white/25 shadow-lg backdrop-blur-sm border border-white/30"
                : "text-white/80 hover:bg-white/10"
            }`
          }
        >
          <Users size={20} />
          <span>Users</span>
        </NavLink>

        {/* Reports */}
        <NavLink
          to="/admin/reports"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-white/25 shadow-lg backdrop-blur-sm border border-white/30"
                : "text-white/80 hover:bg-white/10"
            }`
          }
        >
          <Flag size={20} />
          <span>Reports</span>
        </NavLink>

        {/* Moderation */}
        <NavLink
          to="/admin/moderation"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-white/25 shadow-lg backdrop-blur-sm border border-white/30"
                : "text-white/80 hover:bg-white/10"
            }`
          }
        >
          <ShieldAlert size={20} />
          <span>Moderation</span>
        </NavLink>

        {/* Network Detection */}
        <NavLink
          to="/admin/network"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-white/25 shadow-lg backdrop-blur-sm border border-white/30"
                : "text-white/80 hover:bg-white/10"
            }`
          }
        >
          <GitBranch size={20} />
          <span>Network Detection</span>
        </NavLink>

        {/* Analytics */}
        <NavLink
          to="/admin/analytics"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-white/25 shadow-lg backdrop-blur-sm border border-white/30"
                : "text-white/80 hover:bg-white/10"
            }`
          }
        >
          <BarChart3 size={20} />
          <span>Analytics</span>
        </NavLink>

        {/* Revenue */}
        <NavLink
          to="/admin/revenue"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-white/25 shadow-lg backdrop-blur-sm border border-white/30"
                : "text-white/80 hover:bg-white/10"
            }`
          }
        >
          <DollarSign size={20} />
          <span>Revenue</span>
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-white/25 shadow-lg backdrop-blur-sm border border-white/30"
                : "text-white/80 hover:bg-white/10"
            }`
          }
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* Logout Button */}
      <div className="px-4 pb-6 border-t border-white/20 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-red-500/80 hover:bg-red-600 transition-all"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        type="warning"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </aside>
  );
}
