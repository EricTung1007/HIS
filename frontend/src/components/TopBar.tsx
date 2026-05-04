import { Menu, LogOut, User, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const roleLabel: Record<string, string> = {
  admin: '管理員', nurse: '護理師', doctor: '醫師', caregiver: '照服員'
};

interface Props {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-5 py-3.5 flex items-center justify-between shrink-0 gap-3 sticky top-0 z-40">
      {/* Hamburger — visible on mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-500 hover:text-slate-800 p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        aria-label="開啟選單"
      >
        <Menu size={20} />
      </button>

      <div className="hidden sm:block text-sm font-medium text-slate-500 tracking-wide">
        {new Date().toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

      <div className="flex items-center gap-5 ml-auto">
        {/* Prominent Hero Button for Voice Assistant */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-60 group-hover:opacity-80 transition duration-500 animate-pulse"></div>
          <Link
            to="/caretaker"
            className="relative flex items-center gap-2 text-sm sm:text-base font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full transition-all duration-300 shadow-md border border-slate-700"
          >
            <Mic size={18} className="text-indigo-400" />
            <span className="tracking-wide whitespace-nowrap">AI 語音助手</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-slate-700 border-l border-slate-200/60 pl-5">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
            <User size={16} className="text-slate-500" />
          </div>
          <div className="hidden sm:block">
            <div className="font-semibold leading-none">{user?.name}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{roleLabel[user?.role || ''] || user?.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors ml-1"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">登出</span>
        </button>
      </div>
    </header>
  );
}
