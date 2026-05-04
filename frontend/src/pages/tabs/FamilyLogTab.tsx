import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Sparkles, Save, Trash2, History, Loader2, CheckCircle, Clock, MessageCircle, FileText } from 'lucide-react';
import api from '../../api/client';

interface FamilyLog {
  id: number;
  log_date: string;
  ai_summary: string;
  extra_notes: string | null;
  staff_notes: string | null;
  creator_name: string;
  created_at: string;
}

export default function FamilyLogTab({ patientId }: { patientId: string }) {
  const [logs, setLogs] = useState<FamilyLog[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentLog, setCurrentLog] = useState<Partial<FamilyLog>>({
    log_date: new Date().toISOString().split('T')[0],
    ai_summary: '',
    extra_notes: '',
    staff_notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/patients/${patientId}/family-logs`);
      setLogs(data);
      
      // Find today's log if it exists
      const today = data.find((l: FamilyLog) => l.log_date === currentDate);
      if (today) {
        setCurrentLog(today);
      } else {
        setCurrentLog({
          log_date: currentDate,
          ai_summary: '',
          extra_notes: '',
          staff_notes: ''
        });
      }
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, currentDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post(`/patients/${patientId}/family-logs`, {
        log_date: currentDate,
        generate: true
      });
      setCurrentLog(data);
      loadLogs();
    } catch (err: any) {
      alert(err.response?.data?.error || 'AI 生成失敗');
    } finally {
      setGenerating(false);
    }
  };

  const saveLog = async () => {
    setSaving(true);
    try {
      await api.post(`/patients/${patientId}/family-logs`, {
        log_date: currentDate,
        ai_summary: currentLog.ai_summary,
        extra_notes: currentLog.extra_notes,
        staff_notes: currentLog.staff_notes
      });
      loadLogs();
      alert('已儲存聯絡簿內容');
    } catch (err: any) {
      alert(err.response?.data?.error || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (id: number) => {
    if (!confirm('確定要刪除這筆紀錄嗎？')) return;
    try {
      await api.delete(`/patients/${patientId}/family-logs/${id}`);
      loadLogs();
    } catch (err) {
      alert('刪除失敗');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Date Picker */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <BookOpen size={22} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">家屬聯絡簿</h3>
            <p className="text-xs text-gray-500">自動彙整今日照護狀況，方便家屬了解</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">選擇日期：</label>
          <input 
            type="date" 
            value={currentDate} 
            onChange={(e) => setCurrentDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-500" />
                <span className="font-bold text-gray-800 text-sm">今日照護摘要 (AI 自動生成)</span>
              </div>
              <button 
                onClick={generateSummary}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full transition-all font-medium disabled:opacity-50"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {currentLog.ai_summary ? '重新生成' : '立即生成摘要'}
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <textarea 
                  value={currentLog.ai_summary || ''}
                  onChange={(e) => setCurrentLog({...currentLog, ai_summary: e.target.value})}
                  placeholder="點擊上方按鈕，AI 將自動根據今日生命徵象、用藥及護理紀錄生成摘要..."
                  className="w-full h-64 border-none focus:ring-0 text-gray-700 leading-relaxed resize-none text-sm placeholder:text-gray-300"
                />
              </div>
              
              <div className="pt-4 border-t border-gray-50">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                  <MessageCircle size={14} /> 補充說明 (家屬可見)
                </label>
                <textarea 
                  value={currentLog.extra_notes || ''}
                  onChange={(e) => setCurrentLog({...currentLog, extra_notes: e.target.value})}
                  placeholder="例如：今日心情很好、想吃水果、提醒家屬帶生活用品等..."
                  className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 min-h-[80px]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                  <FileText size={14} /> 內部記事 (僅工作人員可見)
                </label>
                <textarea 
                  value={currentLog.staff_notes || ''}
                  onChange={(e) => setCurrentLog({...currentLog, staff_notes: e.target.value})}
                  placeholder="備註給交班人員的資訊..."
                  className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 min-h-[80px] bg-gray-50/30"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={saveLog}
                  disabled={saving || !currentLog.ai_summary}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl transition-all font-bold shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:shadow-none"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  儲存並發送
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar History */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <History size={16} className="text-gray-400" />
              <span className="font-bold text-gray-700 text-sm">歷史紀錄</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-10 text-center text-gray-400">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 opacity-20" />
                  <span className="text-xs">載入中...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-xs">
                  尚無歷史紀錄
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${currentDate === log.log_date ? 'bg-indigo-50/50 border-l-4 border-indigo-500' : ''}`}
                    onClick={() => setCurrentDate(log.log_date)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">{log.log_date}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {log.ai_summary || log.extra_notes || log.staff_notes || <span className="text-gray-300 italic">尚未填寫內容...</span>}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 font-medium">記錄者：{log.creator_name}</span>
                      <CheckCircle size={12} className="text-emerald-500" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-xl shadow-indigo-100">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
              <Sparkles size={16} /> AI 智慧助手
            </h4>
            <p className="text-xs text-indigo-100 leading-relaxed opacity-90">
              AI 會自動分析今日所有的護理記錄、生命徵象與用藥情況，轉化為家屬易於理解的文字，節省護理人員撰寫聯絡簿的時間。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
