import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

const roleLabel: Record<string, string> = {
  admin: '管理員', nurse: '護理師', doctor: '醫師', caregiver: '照服員'
};

export default function TopBar() {
  const { user, logout } = useAuth();
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="text-sm text-gray-500">
        {new Date().toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <User size={16} className="text-gray-400" />
          <span className="font-medium">{user?.name}</span>
          <span className="text-gray-400 text-xs">({roleLabel[user?.role || ''] || user?.role})</span>
        </div>
        <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors">
          <LogOut size={15} />
          登出
        </button>
      </div>
    </header>
  );
}
