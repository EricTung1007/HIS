import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(username, password);
      if (loggedInUser.role === 'caretaker') {
        navigate('/caretaker');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '登入失敗，請檢查帳號密碼');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-100/50 to-transparent"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl"></div>
      <div className="absolute top-40 -left-40 w-72 h-72 bg-blue-200/40 rounded-full blur-3xl"></div>
      
      <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-slate-100 w-full max-w-[400px] p-10 relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-indigo-100">
            <Activity className="text-indigo-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">長照資訊系統</h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5 uppercase tracking-widest">HIS System</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">帳號</label>
            <input
              type="text"
              className="input-field"
              placeholder="請輸入帳號"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">密碼</label>
            </div>
            <input
              type="password"
              className="input-field"
              placeholder="請輸入密碼"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 font-medium">{error}</div>}
          
          <button type="submit" className="btn-primary w-full py-3 mt-2 text-base shadow-[0_4px_14px_0_rgba(15,23,42,0.2)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.23)] hover:-translate-y-0.5" disabled={loading}>
            {loading ? '登入中...' : '登入系統'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 text-center space-y-1.5 font-medium">
          <div>測試帳號：admin / admin123</div>
          <div>護理師：nurse1 / nurse123</div>
        </div>
      </div>
    </div>
  );
}
