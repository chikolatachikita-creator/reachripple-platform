import React from 'react';

export default function SectionCard({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md border border-slate-100 p-6 ${className}`}>
      {children}
    </div>
  );
}
