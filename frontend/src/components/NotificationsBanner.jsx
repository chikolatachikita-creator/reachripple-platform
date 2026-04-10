// src/components/NotificationsBanner.jsx
import React, { useState, useEffect } from "react";
import api from "../api/client";

const NOTIFICATION_ICONS = {
  "ad-approved": "🎉",
  "ad-rejected": "❌",
  default: "🔔",
};

const NOTIFICATION_COLORS = {
  "ad-approved": "bg-green-50 border-green-500 text-green-800",
  "ad-rejected": "bg-red-50 border-red-500 text-red-800",
  default: "bg-blue-50 border-blue-500 text-blue-800",
};

export default function NotificationsBanner() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const res = await api.get("/notifications/my");
      
      // Only show unread notifications
      const unread = (res.data.notifications || []).filter(n => !n.read);
      setNotifications(unread.slice(0, 3)); // Show max 3
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await api.patch(`/notifications/${notifId}/read`, {});

      // Remove from local state
      setNotifications(notifications.filter(n => n._id !== notifId));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const dismissAll = async () => {
    try {
      await api.patch("/notifications/mark-all-read", {});

      setNotifications([]);
    } catch (err) {
      console.error("Failed to dismiss all:", err);
    }
  };

  if (loading || notifications.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {notifications.map((notif) => {
        const icon = NOTIFICATION_ICONS[notif.type] || NOTIFICATION_ICONS.default;
        const colorClass = NOTIFICATION_COLORS[notif.type] || NOTIFICATION_COLORS.default;
        
        return (
          <div
            key={notif._id}
            className={`flex items-start justify-between p-4 rounded-xl border-l-4 ${colorClass}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="font-medium">{notif.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(notif.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={() => markAsRead(notif._id)}
              className="text-sm opacity-60 hover:opacity-100 transition ml-4 flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        );
      })}
      
      {notifications.length > 1 && (
        <div className="text-right">
          <button
            onClick={dismissAll}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Dismiss all notifications
          </button>
        </div>
      )}
    </div>
  );
}
