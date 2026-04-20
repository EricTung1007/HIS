import { useState, useEffect } from 'react';
import { Receipt, Download, TrendingUp, Users, BarChart2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';

interface PatientTotal { id: number; patient_no: string; name: string; care_level: string; record_count: number; total_amount: number | null; }
interface CodeTotal { code: string; name: string; category: string; total_quantity: number; total_amount: number; }

const CATEGORY_COLORS: Record<string, string> = {
  AA: 'bg-orange-100 text-orange-700', BA: 'bg-blue-100 text-blue-700',
  BB: 'bg-green-100 text-green-700', BC: 'bg-teal-100 text-teal-700',
  GA: 'bg-yellow-100 text-yellow-700',
};

export default function BillingOverview() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [patientTotals, setPatientTotals] = useState<PatientTotal[]>([]);
  const [codeTotals, setCodeTotals] = useState<CodeTotal[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/billing/summary?month=${month}`)
      .then(r => { setPatientTotals(r.data.patientTotals); setCodeTotals(r.data.codeTotals); setGrandTotal(r.data.grandTotal); })
      .finally(() => setLoading(false));
  }, [month]);

  const exportAll = () => window.open(`/api/billing/export-all?month=${month}`, '_blank');

  const activePatients = patientTotals.filter(p => (p.total_amount || 0) > 0).length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Receipt size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">核銷碼管理</h1>
            <p className="text-sm text-gray-500">長照給付及補助服務申報總覽</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          <button onClick={exportAll}
            className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-1.5 font-medium transition-colors">
            <Download size={14} /> 匯出全部 CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-100">本月申報總額</span>
            <TrendingUp size={18} className="text-emerald-200" />
          </div>
          <div className="text-3xl font-bold">{loading ? '—' : grandTotal.toLocaleString()}</div>
          <div className="text-emerald-200 text-xs mt-1">元</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">有申報住民</span>
            <Users size={18} className="text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{loading ? '—' : activePatients}</div>
          <div className="text-gray-400 text-xs mt-1">/ {patientTotals.length} 位在住住民</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">申報組合數</span>
            <BarChart2 size={18} className="text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{loading ? '—' : codeTotals.length}</div>
          <div className="text-gray-400 text-xs mt-1">種不同核銷碼</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Per-patient breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">住民申報明細</span>
            <span className="text-xs text-gray-400">{month}</span>
          </div>
          {loading ? (
            <div className="py-10 text-center text-gray-400 text-sm">載入中...</div>
          ) : patientTotals.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">本月尚無申報記錄</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {patientTotals.map(p => (
                <Link key={p.id} to={`/patients/${p.id}/billing`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${(p.total_amount || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      {p.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.patient_no} · {p.care_level} · {p.record_count} 筆</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${(p.total_amount || 0) > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>
                      {(p.total_amount || 0).toLocaleString()} 元
                    </span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
          {/* Grand total */}
          {!loading && patientTotals.length > 0 && (
            <div className="px-4 py-3 bg-emerald-50 border-t-2 border-emerald-100 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">合計</span>
              <span className="text-base font-bold text-emerald-700">{grandTotal.toLocaleString()} 元</span>
            </div>
          )}
        </div>

        {/* Per-code breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">熱門核銷碼</span>
            <span className="text-xs text-gray-400">按金額排序</span>
          </div>
          {loading ? (
            <div className="py-10 text-center text-gray-400 text-sm">載入中...</div>
          ) : codeTotals.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">本月尚無申報記錄</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {codeTotals.map(c => {
                const pct = grandTotal > 0 ? Math.round((c.total_amount / grandTotal) * 100) : 0;
                return (
                  <div key={c.code} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-700 text-sm">{c.code}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[c.category] || 'bg-gray-100 text-gray-600'}`}>
                          {c.category}
                        </span>
                        <span className="text-sm text-gray-700 truncate max-w-[160px]">{c.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-gray-900">{c.total_amount.toLocaleString()} 元</div>
                        <div className="text-xs text-gray-400">{c.total_quantity} 次 · {pct}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
