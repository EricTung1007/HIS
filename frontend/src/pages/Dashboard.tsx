import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BedDouble, AlertTriangle, Activity } from 'lucide-react';
import api from '../api/client';
import { Patient } from '../types';
import ActivityFeed from '../components/ActivityFeed';

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  useEffect(() => {
    api.get('/patients').then(r => setPatients(r.data));
  }, []);

  const byRoom: Record<string, Patient[]> = {};
  patients.forEach(p => {
    const room = p.room_no || '未分配';
    if (!byRoom[room]) byRoom[room] = [];
    byRoom[room].push(p);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">儀表板</h1>
        <span className="text-sm font-medium text-slate-500">{today}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={22} className="text-indigo-600" />} label="在住住民" value={patients.length} iconBg="bg-indigo-50" />
        <StatCard icon={<BedDouble size={22} className="text-emerald-600" />} label="使用床位" value={patients.length} iconBg="bg-emerald-50" />
        <StatCard icon={<Activity size={22} className="text-violet-600" />} label="今日量測" value="--" iconBg="bg-violet-50" />
        <StatCard icon={<AlertTriangle size={22} className="text-rose-600" />} label="注意事項" value={patients.filter(p => p.notes).length} iconBg="bg-rose-50" />
      </div>

      {/* Main Grid: Room Overview + Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {/* Room Overview */}
          <div className="card">
            <div className="section-title">床位總覽</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {Object.entries(byRoom).map(([room, pts]) => (
                <div key={room} className="border border-slate-200/60 rounded-xl p-4 bg-slate-50/50">
                  <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <BedDouble size={16} className="text-slate-400" />
                    {room}房
                  </div>
                  <div className="space-y-2">
                    {pts.map(p => (
                      <Link key={p.id} to={`/patients/${p.id}`}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${p.gender === 'F' ? 'bg-rose-400' : 'bg-indigo-400'}`}>
                            {p.gender === 'F' ? '女' : '男'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{p.name}</div>
                            <div className="text-xs text-slate-400 font-medium mt-0.5">床{p.bed_no} · {p.care_level}</div>
                          </div>
                        </div>
                        <div className="text-xs font-mono text-slate-300 group-hover:text-slate-400 transition-colors">{p.patient_no}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {patients.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm font-medium">目前無在住住民資料</div>
            )}
          </div>

          {/* Recent Patients */}
          <div className="card">
            <div className="section-title">住民列表</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">住民編號</th>
                    <th className="table-header">姓名</th>
                    <th className="table-header">房號/床號</th>
                    <th className="table-header">照護等級</th>
                    <th className="table-header">入住日期</th>
                    <th className="table-header">注意事項</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="table-cell font-mono text-xs text-slate-400">{p.patient_no}</td>
                      <td className="table-cell">
                        <Link to={`/patients/${p.id}`} className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">{p.name}</Link>
                      </td>
                      <td className="table-cell font-medium text-slate-600">{p.room_no || '-'} <span className="text-slate-300 mx-1">/</span> {p.bed_no || '-'}</td>
                      <td className="table-cell"><span className="badge-active">{p.care_level || '-'}</span></td>
                      <td className="table-cell text-slate-500 text-xs font-medium">{p.admission_date}</td>
                      <td className="table-cell text-xs font-medium text-rose-600">{p.notes ? p.notes.substring(0, 20) + (p.notes.length > 20 ? '...' : '') : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, iconBg }: { icon: React.ReactNode; label: string; value: string | number; iconBg: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    </div>
  );
}
