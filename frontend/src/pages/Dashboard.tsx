import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BedDouble, AlertTriangle, Activity } from 'lucide-react';
import api from '../api/client';
import { Patient } from '../types';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">儀表板</h1>
        <span className="text-sm text-gray-500">{today}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} className="text-blue-600" />} label="在住住民" value={patients.length} color="bg-blue-50" />
        <StatCard icon={<BedDouble size={20} className="text-green-600" />} label="使用床位" value={patients.length} color="bg-green-50" />
        <StatCard icon={<Activity size={20} className="text-purple-600" />} label="今日量測" value="--" color="bg-purple-50" />
        <StatCard icon={<AlertTriangle size={20} className="text-orange-600" />} label="注意事項" value={patients.filter(p => p.notes).length} color="bg-orange-50" />
      </div>

      {/* Room Overview */}
      <div className="card">
        <div className="section-title">床位總覽</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(byRoom).map(([room, pts]) => (
            <div key={room} className="border border-gray-200 rounded-lg p-3">
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <BedDouble size={15} className="text-gray-400" />
                {room}房
              </div>
              <div className="space-y-2">
                {pts.map(p => (
                  <Link key={p.id} to={`/patients/${p.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${p.gender === 'F' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                        {p.gender === 'F' ? '女' : '男'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{p.name}</div>
                        <div className="text-xs text-gray-400">床{p.bed_no} · {p.care_level}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">{p.patient_no}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        {patients.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">目前無在住住民資料</div>
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
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs text-gray-500">{p.patient_no}</td>
                  <td className="table-cell">
                    <Link to={`/patients/${p.id}`} className="font-medium text-blue-600 hover:text-blue-800">{p.name}</Link>
                  </td>
                  <td className="table-cell text-gray-600">{p.room_no || '-'} / {p.bed_no || '-'}</td>
                  <td className="table-cell"><span className="badge-active">{p.care_level || '-'}</span></td>
                  <td className="table-cell text-gray-600 text-xs">{p.admission_date}</td>
                  <td className="table-cell text-xs text-orange-600">{p.notes ? p.notes.substring(0, 20) + (p.notes.length > 20 ? '...' : '') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className={`${color} rounded-xl p-4 flex items-center gap-3`}>
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-600">{label}</div>
      </div>
    </div>
  );
}
