import React from 'react';

export default function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-2"><div className="h-4 bg-gray-200 rounded w-3/4" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
