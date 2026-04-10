import api from "./client";

export interface Notification {
  _id: string;
  user: string;
  type: string;
  message: string;
  read: boolean;
  meta?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const notificationsAPI = {
  // Get user's notifications
  getMy: () =>
    api.get<{ notifications: Notification[] }>("/notifications/my"),

  // Get unread count
  getUnreadCount: () =>
    api.get<{ count: number }>("/notifications/unread-count"),

  // Mark notification as read
  markAsRead: (id: string) =>
    api.patch<{ notification: Notification }>(`/notifications/${id}/read`),

  // Mark all notifications as read
  markAllAsRead: () =>
    api.patch<{ success: boolean }>("/notifications/mark-all-read"),
};

export default notificationsAPI;
