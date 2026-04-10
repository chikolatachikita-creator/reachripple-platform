import React, { useEffect, useState } from "react";
import {
  getAdminUsers,
  updateUserStatus,
  deleteUser,
  AdminUser,
} from "../api/admin";
import { useConfirmModal } from "../components/ConfirmModal";
import { useToastContext } from "../context/ToastContextGlobal";
import Pagination from "../components/ui/Pagination";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { confirm, setIsLoading: setModalLoading, ConfirmModal } = useConfirmModal();
  const { showSuccess, showError } = useToastContext();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (roleFilter) params.role = roleFilter;

      const data = await getAdminUsers(params);
      setUsers(data.users);
      setTotalPages(data.pages);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "Failed to load users. Please try again.";
      setError(errorMessage);
      console.error("Load users error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleStatusChange = async (userId: string, newStatus: "active" | "suspended") => {
    const action = newStatus === "suspended" ? "suspend" : "activate";
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      message: `Are you sure you want to ${action} this user?`,
      type: newStatus === "suspended" ? "warning" : "info",
    });

    if (!confirmed) return;

    setModalLoading(true);
    setActionLoading(`${userId}:status`);
    setError(null);
    try {
      await updateUserStatus(userId, newStatus);
      showSuccess(`User ${newStatus === "suspended" ? "suspended" : "activated"} successfully`);
      await loadUsers();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "Failed to update user status";
      setError(errorMessage);
      showError(errorMessage);
      console.error("Update status error:", err);
    } finally {
      setActionLoading(null);
      setModalLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    const confirmed = await confirm({
      title: "Delete User",
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      type: "danger",
    });

    if (!confirmed) return;

    setModalLoading(true);
    setActionLoading(`${userId}:delete`);
    setError(null);
    try {
      await deleteUser(userId);
      showSuccess("User deleted successfully");
      await loadUsers();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "Failed to delete user";
      setError(errorMessage);
      showError(errorMessage);
      console.error("Delete user error:", err);
    } finally {
      setActionLoading(null);
      setModalLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: "bg-purple-100 text-purple-700 font-semibold",
      user: "bg-blue-100 text-blue-700 font-semibold",
    };
    const icons: Record<string, string> = {
      admin: "👑",
      user: "👤",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full ${styles[role] || "bg-gray-100 text-gray-600"}`}>
        <span>{icons[role]}</span>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      suspended: "bg-red-100 text-red-700",
    };
    return (
      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin Users Management</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <ConfirmModal />

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 p-3 rounded-lg w-full max-w-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </form>
          <select
            title="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="">Status: All</option>
            <option value="active">✅ Active</option>
            <option value="suspended">🔒 Suspended</option>
          </select>
          <select
            title="Filter by role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="">Role: All</option>
            <option value="admin">👑 Admin</option>
            <option value="user">👤 User</option>
          </select>
        </div>

        {loading ? (
          <div className="overflow-x-auto animate-pulse">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-40" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-purple-100 rounded-full w-16" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-green-100 rounded-full w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="flex gap-2"><div className="h-4 bg-gray-100 rounded w-14" /><div className="h-4 bg-gray-100 rounded w-12" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">👤</div>
            <h3 className="font-semibold text-gray-900">No Users Found</h3>
            <p className="text-gray-600">No users match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-purple-700">{user.name}</td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-6 py-4">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      {user.status === "active" ? (
                        <button
                          onClick={() => handleStatusChange(user._id, "suspended")}
                          disabled={actionLoading === `${user._id}:status`}
                          className="text-orange-500 text-sm mr-2 hover:underline disabled:opacity-50"
                        >
                          {actionLoading === `${user._id}:status` ? "..." : "Suspend"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(user._id, "active")}
                          disabled={actionLoading === `${user._id}:status`}
                          className="text-green-500 text-sm mr-2 hover:underline disabled:opacity-50"
                        >
                          {actionLoading === `${user._id}:status` ? "..." : "Activate"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user._id)}
                        disabled={actionLoading === `${user._id}:delete`}
                        className="text-red-500 text-sm hover:underline disabled:opacity-50"
                      >
                        {actionLoading === `${user._id}:delete` ? "..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between mt-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, users.length * page)} of {totalPages * limit} users
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
