import React from "react";
import { Bell, Search } from "lucide-react";

export default function AdminTopbar() {
  const adminName = localStorage.getItem("userName") || "Admin";

  return (
    <header className="flex items-center justify-between h-16 px-8 bg-white border-b border-gray-200 shadow-sm">
      {/* Search Bar */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search ads, users..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      </div>

      {/* Right Side - Notifications & Profile */}
      <div className="flex items-center gap-6 ml-8">
        {/* Notifications */}
        <button className="relative text-gray-600 hover:text-gray-900 transition" title="Notifications">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Profile Dropdown */}
        <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="text-sm">
            <p className="font-semibold text-gray-900">{adminName}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
