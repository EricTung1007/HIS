import { useState, useEffect, useCallback, useRef } from 'react';
import { Receipt, Plus, Trash2, Download, Search, Mic, Send, Loader2, CheckCircle, Bot, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/client';

interface BillingCode {
  id: number; code: string; name: string; description: string;
  price: number; remote_price: number | null; category: string;
}
interface BillingRecord {
  id: number; billing_code_id: number; code: string; code_name: string;
  service_date: string; service_time: string; quantity: number;
  unit_price: number; is_remote: number; notes: string;
  recorder_name: string; category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  AA: '加計服務', BA: '居家照顧', BB: '日間照顧', BC: '家庭托顧',
  BD: '社區服務', CA: '專業復能', CB: '專業照護', CC: '環境規劃',
  CD: '護理訪視', DA: '交通接送', EA: '沐浴輔具', EB: '步行輔具',
  EC: '輪椅輔具', ED: '移位輔具', EE: '溝通輔具', EF: '生活輔具',
  EG: '壓瘡輔具', EH: '照顧床輔具', FA: '居家無障礙', GA: '喘息服務',
};
const CATEGORY_COLORS: Record<string, string> = {
  AA: 'bg-orange-100 text-orange-700', BA: 'bg-blue-100 text-blue-700',
  BB: 'bg-green-100 text-green-700', BC: 'bg-teal-100 text-teal-700',
  BD: 'bg-cyan-100 text-cyan-700', CA: 'bg-purple-100 text-purple-700',
  CB: 'bg-violet-100 text-violet-700', CC: 'bg-pink-100 text-pink-700',
  CD: 'bg-rose-100 text-rose-700', GA: 'bg-yellow-100 text-yellow-700',
};

declare global { interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; } }

export default function BillingTab({ patientId, patientName }: { patientId: string; patientName?: string }) {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [codes, setCodes] = useState<BillingCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Add form
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<BillingCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<BillingCode | null>(null);
  const [qty, setQty] = useState(1);
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // AI panel
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const loadRecords = useCallback(() => {
    setLoading(true);
    api.get(`/patients/${patientId}/billing/records?month=${month}`)
      .then(r => { setRecords(r.data.records); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [patientId, month]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const searchCodes = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const r = await api.get(`/billing/codes?q=${encodeURIComponent(q)}`);
    setSearchResults(r.data.slice(0, 8));
    setShowDropdown(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchCodes(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ, searchCodes]);

  const addRecord = async () => {
    if (!selectedCode) return;
    setAdding(true);
    try {
      await api.post(`/patients/${patientId}/billing/records`, {
        code: selectedCode.code, service_date: serviceDate, quantity: qty, notes,
      });
      setShowAdd(false); setSelectedCode(null); setSearchQ(''); setQty(1); setNotes('');
      loadRecords();
    } finally { setAdding(false); }
  };

  const deleteRecord = async (id: number) => {
    if (!confirm('確認刪除此核銷記錄？')) return;
    await api.delete(`/patients/${patientId}/billing/records/${id}`);
    loadRecords();
  };

  const exportCSV = () => {
    window.open(`/api/patients/${patientId}/billing/export?month=${month}`, '_blank');
  };

  // AI voice/text
  const sendAI = async (text: string) => {
    if (!text.trim()) return;
    setAiLoading(true); setAiResult(null);
    try {
      const { data } = await api.post(`/patients/${patientId}/ai/chat`, { message: text });
      setAiResult(data);
      if (data.action === 'billing' && data.data?.code && !data.needs_confirm) {
        await api.post(`/patients/${patientId}/billing/records`, {
          code: data.data.code, service_date: new Date().toISOString().split('T')[0],
          quantity: data.data.quantity || 1, notes: data.data.notes || '',
        });
        loadRecords();
      }
    } catch (e: any) {
      setAiResult({ action: 'unknown', confirmation: e.response?.data?.error || 'AI 發生錯誤' });
    } finally { setAiLoading(false); }
  };

  const confirmAI = async () => {
    if (!aiResult?.data?.code) return;
    await api.post(`/patients/${patientId}/billing/records`, {
      code: aiResult.data.code, service_date: new Date().toISOString().split('T')[0],
      quantity: aiResult.data.quantity || 1, notes: aiResult.data.notes || '',
    });
    setAiResult(null); loadRecords();
  };

  const sttSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR(); rec.lang = 'zh-TW'; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e: any) => { setAiInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Receipt size={18} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">核銷碼記錄</h3>
            <p className="text-xs text-gray-500">長照給付及補助服務代碼</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-sm border border-gray-200 hover:border-emerald-300 text-gray-600 hover:text-emerald-700 rounded-lg px-3 py-1.5 transition-colors">
            <Download size={14} /> 匯出 CSV
          </button>
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 transition-colors font-medium">
            <Plus size={14} /> 新增記錄
          </button>
        </div>
      </div>

      {/* AI Quick Entry */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={15} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-700">AI 自動對碼</span>
          <span className="text-xs text-blue-500">描述服務內容，AI 自動識別核銷碼</span>
        </div>
        <div className="flex gap-2">
          {sttSupported && (
            <button onClick={listening ? () => { recRef.current?.stop(); setListening(false); } : startListening}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'}`}>
              <Mic size={16} />
            </button>
          )}
          <input value={aiInput} onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendAI(aiInput)}
            placeholder="例：幫住民洗澡洗頭、翻身拍背、協助進食、測量血壓..."
            className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
          <button onClick={() => sendAI(aiInput)} disabled={!aiInput.trim() || aiLoading}
            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 shrink-0">
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        {/* Quick examples */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['洗澡洗頭', '翻身拍背', '協助進食', '測量血壓', '肢體運動', '協助排泄'].map(ex => (
            <button key={ex} onClick={() => { setAiInput(ex); sendAI(ex); }}
              className="text-xs bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-full transition-colors">
              {ex}
            </button>
          ))}
        </div>
        {/* AI result */}
        {aiResult && (
          <div className={`mt-3 rounded-lg p-3 text-sm ${aiResult.action === 'billing' ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                {aiResult.action === 'billing' && aiResult.data?.code && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-emerald-700 text-base">{aiResult.data.code}</span>
                    <span className="text-emerald-600">{aiResult.data.name}</span>
                    <span className="font-semibold text-emerald-700">${aiResult.data.price} 元</span>
                  </div>
                )}
                <p className="text-gray-700">{aiResult.confirmation}</p>
              </div>
              <button onClick={() => setAiResult(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={14} /></button>
            </div>
            {aiResult.action === 'billing' && aiResult.needs_confirm && (
              <div className="flex gap-2 mt-2">
                <button onClick={confirmAI} className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700">
                  <CheckCircle size={11} /> 確認記錄
                </button>
                <button onClick={() => setAiResult(null)} className="text-xs bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-300">取消</button>
              </div>
            )}
            {aiResult.action === 'billing' && !aiResult.needs_confirm && (
              <div className="flex items-center gap-1 text-emerald-600 text-xs mt-2 font-medium">
                <CheckCircle size={12} /> 已自動記錄
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Add Form */}
      {showAdd && (
        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Plus size={14} className="text-emerald-600" /> 手動新增核銷記錄
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Code search */}
            <div className="relative sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">搜尋核銷碼 *</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={selectedCode ? `${selectedCode.code} ${selectedCode.name}` : searchQ}
                  onChange={e => { setSearchQ(e.target.value); setSelectedCode(null); }}
                  onFocus={() => searchQ && setShowDropdown(true)}
                  placeholder="輸入代碼或名稱，例：BA07 或 沐浴"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                {selectedCode && (
                  <button onClick={() => { setSelectedCode(null); setSearchQ(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              {showDropdown && searchResults.length > 0 && !selectedCode && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {searchResults.map(c => (
                    <button key={c.id} onClick={() => { setSelectedCode(c); setSearchQ(''); setShowDropdown(false); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-emerald-50 text-left transition-colors border-b border-gray-50 last:border-0">
                      <div>
                        <span className="font-mono font-bold text-emerald-700 text-xs">{c.code}</span>
                        <span className="ml-2 text-sm text-gray-800">{c.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 shrink-0">{c.price.toLocaleString()} 元</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCode && (
              <div className="sm:col-span-2 bg-emerald-50 rounded-lg px-3 py-2 text-sm border border-emerald-200">
                <span className="font-bold text-emerald-700">{selectedCode.code}</span>
                <span className="mx-2 text-emerald-600">{selectedCode.name}</span>
                <span className="font-semibold text-emerald-700">{selectedCode.price.toLocaleString()} 元 / 次</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">服務日期</label>
              <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">數量</label>
              <input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">備註</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="選填"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowAdd(false)} className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={addRecord} disabled={!selectedCode || adding}
              className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              新增
            </button>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-medium text-gray-700">{month} 核銷記錄</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{records.length} 筆</span>
            <span className="text-sm font-bold text-emerald-700">合計 {total.toLocaleString()} 元</span>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> 載入中...
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Receipt size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">本月尚無核銷記錄</p>
            <p className="text-xs mt-1">點選「新增記錄」或使用 AI 自動對碼</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium">服務日期</th>
                  <th className="text-left px-4 py-2.5 font-medium">核銷碼</th>
                  <th className="text-left px-4 py-2.5 font-medium">照顧組合</th>
                  <th className="text-right px-4 py-2.5 font-medium">單價</th>
                  <th className="text-right px-4 py-2.5 font-medium">數量</th>
                  <th className="text-right px-4 py-2.5 font-medium">小計</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.service_date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-700">{r.code}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[r.category] || 'bg-gray-100 text-gray-600'}`}>
                          {CATEGORY_LABELS[r.category] || r.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      <div>{r.code_name}</div>
                      {r.notes && <div className="text-xs text-gray-400 mt-0.5">{r.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.unit_price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{(r.unit_price * r.quantity).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteRecord(r.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1 rounded">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-emerald-50">
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">本月合計</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">{total.toLocaleString()} 元</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

