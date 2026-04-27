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
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 gap-3">
      {/* Hamburger — visible on mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-500 hover:text-gray-700 p-1 -ml-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="開啟選單"
      >
        <Menu size={22} />
      </button>

      <div className="hidden sm:block text-sm text-gray-500 truncate">
        {new Date().toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <Link
          to="/caretaker"
          className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full transition-colors mr-1 sm:mr-2 shadow-sm"
        >
          <Mic size={15} />
          <span className="hidden sm:inline font-medium">語音助手</span>
        </Link>
        <div className="flex items-center gap-1.5 text-sm text-gray-700 border-l border-gray-200 pl-3">
          <User size={15} className="text-gray-400 shrink-0" />
          <span className="font-medium truncate max-w-[100px] sm:max-w-none">{user?.name}</span>
          <span className="text-gray-400 text-xs hidden sm:inline">
            ({roleLabel[user?.role || ''] || user?.role})
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap ml-2"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">登出</span>
        </button>
      </div>
    </header>
  );
}
