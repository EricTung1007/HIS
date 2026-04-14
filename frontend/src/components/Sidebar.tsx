import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '儀表板' },
  { to: '/patients', icon: Users, label: '住民管理' },
];

export default function Sidebar() {
  return (
    <div className="w-56 bg-blue-900 text-white flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-blue-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <div>
            <div className="font-bold text-sm leading-tight">長照資訊系統</div>
            <div className="text-xs text-blue-300">LTC-HIS v1.0</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`
            }
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-2 pb-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive ? 'bg-blue-700 text-white' : 'text-blue-300 hover:bg-blue-800 hover:text-white'
            }`
          }
        >
          <Settings size={16} />
          <span>AI 設定</span>
        </NavLink>
      </div>
      <div className="px-4 py-3 border-t border-blue-800">
        <div className="text-xs text-blue-400">台灣長照照護機構</div>
      </div>
    </div>
  );
}
