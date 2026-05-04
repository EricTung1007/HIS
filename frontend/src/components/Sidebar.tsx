import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, X, Receipt } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '儀表板' },
  { to: '/patients', icon: Users, label: '住民管理' },
  { to: '/billing', icon: Receipt, label: '核銷管理' },
];

interface Props {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: Props) {
  return (
    <div className="w-56 h-full bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800">
      <div className="px-5 py-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <span className="text-xl">🏥</span>
          </div>
          <div>
            <div className="font-bold text-sm leading-tight tracking-wide">長照資訊系統</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">HIS System</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 font-medium ${
                isActive ? 'bg-indigo-600/10 text-indigo-400 shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-6">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 font-medium ${
              isActive ? 'bg-indigo-600/10 text-indigo-400 shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`
          }
        >
          <Settings size={18} />
          <span>系統設定</span>
        </NavLink>
      </div>

      <div className="px-5 py-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
          <div className="text-[11px] text-slate-500 font-medium">系統連線正常</div>
        </div>
      </div>
    </div>
  );
}
