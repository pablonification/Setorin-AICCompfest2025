'use client';

import { useRouter, usePathname } from 'next/navigation';
import { 
  FiUsers, 
  FiDollarSign, 
  FiBell, 
  FiBookOpen, 
  FiActivity, 
  FiDownload,
  FiTrendingUp,
  FiSettings,
  FiShield,
  FiHome
} from 'react-icons/fi';

export default function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();

  const adminSections = [
    {
      title: 'Dashboard',
      href: '/admin',
      icon: FiHome,
      color: 'bg-gray-500'
    },
    {
      title: 'User Management',
      href: '/admin/users',
      icon: FiUsers,
      color: 'bg-blue-500'
    },
    {
      title: 'Withdrawal Management',
      href: '/admin/withdrawals',
      icon: FiDollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Notification Center',
      href: '/admin/notifications',
      icon: FiBell,
      color: 'bg-yellow-500'
    },
    {
      title: 'Educational Content',
      href: '/admin/education',
      icon: FiBookOpen,
      color: 'bg-purple-500'
    },
    {
      title: 'System Monitoring',
      href: '/admin/monitoring',
      icon: FiActivity,
      color: 'bg-red-500'
    },
    {
      title: 'Data Export',
      href: '/admin/export',
      icon: FiDownload,
      color: 'bg-indigo-500'
    }
  ];

  const isActive = (href) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Navigation</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {adminSections.map((section) => {
          const IconComponent = section.icon;
          const active = isActive(section.href);
          return (
            <button
              key={section.href}
              onClick={() => router.push(section.href)}
              className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center justify-center ${
                active
                  ? 'ring-2 ring-blue-500 shadow-lg transform scale-105'
                  : 'hover:shadow-md hover:transform hover:scale-105'
              }`}
            >
              <div className={`p-2 rounded-lg ${section.color} mb-2`}>
                <IconComponent className="h-5 w-5 text-white" />
              </div>
              <span className={`text-xs font-medium text-center ${
                active ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {section.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
