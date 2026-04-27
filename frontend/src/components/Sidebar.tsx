import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, X } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '儀表板' },
  { to: '/patients', icon: Users, label: '住民管理' },
];

interface Props {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: Props) {
  return (
    <div className="w-56 h-full bg-blue-900 text-white flex flex-col">
      <div className="px-4 py-5 border-b border-blue-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <div>
            <div className="font-bold text-sm leading-tight">長照資訊系統</div>
            <div className="text-xs text-blue-300">LTC-HIS v1.0</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-blue-300 hover:text-white p-1">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`
            }
          >
            <item.icon size={17} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-4">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              isActive ? 'bg-blue-700 text-white' : 'text-blue-300 hover:bg-blue-800 hover:text-white'
            }`
          }
        >
          <Settings size={17} />
          <span>AI 設定</span>
        </NavLink>
      </div>

      <div className="px-4 py-3 border-t border-blue-800">
        <div className="text-xs text-blue-400">台灣長照照護機構</div>
      </div>
    </div>
  );
}
