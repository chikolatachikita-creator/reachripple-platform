import React from 'react';

const statusMap = {
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  featured: { label: 'Featured', color: 'bg-amber-100 text-amber-700' },
  vip: { label: 'VIP', color: 'bg-purple-100 text-purple-700' },
};

export default function StatusPill({ status }) {
  const s = statusMap[status?.toLowerCase()] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${s.color}`}>{s.label}</span>
  );
}
