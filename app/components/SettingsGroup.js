'use client';

import Link from 'next/link';

export default function SettingsGroup({ title, items }) {
  return (
    <div className="rounded-[var(--radius-md)] [box-shadow:var(--shadow-card)] bg-white p-4">
      <div className="text-[14px] leading-5 font-semibold text-[var(--color-primary-700)] mb-4">
        {title}
      </div>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <Link 
            key={index}
            href={item.href} 
            className="flex items-center justify-between px-4 py-3 rounded-[var(--radius-sm)] bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 flex items-center justify-center">
                {item.icon}
              </div>
              <span className="text-[14px] leading-5 font-medium text-[var(--color-primary-700)]">
                {item.label}
              </span>
            </div>
            
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--color-muted)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
