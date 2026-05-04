import { useEffect, useState } from 'react';
import { Activity, Pill, BookOpen, Droplets, Banknote, Users, Clock } from 'lucide-react';
import api from '../api/client';

interface ActivityRecord {
  activity_type: string;
  source_id: number;
  patient_id: number;
  created_at: string;
  title: string;
  description: string;
  patient_name: string;
  patient_room: string;
  patient_bed: string;
  user_name: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  vitals: <Activity size={16} className="text-blue-500" />,
  io: <Droplets size={16} className="text-cyan-500" />,
  note: <BookOpen size={16} className="text-purple-500" />,
  medication: <Pill size={16} className="text-green-500" />,
  family_log: <Users size={16} className="text-amber-500" />,
  billing: <Banknote size={16} className="text-emerald-500" />,
};

const TYPE_COLORS: Record<string, string> = {
  vitals: 'bg-blue-50 border-blue-100',
  io: 'bg-cyan-50 border-cyan-100',
  note: 'bg-purple-50 border-purple-100',
  medication: 'bg-green-50 border-green-100',
  family_log: 'bg-amber-50 border-amber-100',
  billing: 'bg-emerald-50 border-emerald-100',
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activity?limit=30');
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to fetch activities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // Poll every 15 seconds for real-time feel
    const interval = setInterval(fetchActivities, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="card flex flex-col h-[calc(100vh-120px)] sticky top-4">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">即時動態追蹤</h2>
        </div>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={12} /> 自動更新
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
        {loading && activities.length === 0 ? (
          <div className="flex justify-center py-8 text-gray-400">載入中...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">目前無任何活動紀錄</div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-200"></div>

            <div className="space-y-4">
              {activities.map((item, idx) => (
                <div key={`${item.activity_type}-${item.source_id}-${idx}`} className="relative pl-10">
                  {/* Icon Badge */}
                  <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center z-10 shadow-sm">
                    {TYPE_ICONS[item.activity_type] || <Activity size={16} className="text-gray-400" />}
                  </div>

                  {/* Content Card */}
                  <div className={`p-3 rounded-lg border ${TYPE_COLORS[item.activity_type] || 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{item.patient_name}</span>
                        <span className="text-xs bg-white/60 px-1.5 py-0.5 rounded text-gray-600">
                          {item.patient_room}房 {item.patient_bed ? `${item.patient_bed}床` : ''}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{formatTime(item.created_at)}</span>
                    </div>
                    
                    <div className="text-sm text-gray-800 font-medium mb-1">{item.title}</div>
                    {item.description && (
                      <div className="text-xs text-gray-600 bg-white/50 p-2 rounded mt-1 border border-white/50">
                        {item.description}
                      </div>
                    )}
                    
                    {item.user_name && (
                      <div className="text-[10px] text-gray-400 mt-2 text-right">
                        紀錄者: {item.user_name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
