import { useEffect, useState } from 'react';
import { Plus, Trash2, Droplets, ArrowDown, ArrowUp } from 'lucide-react';
import api from '../../api/client';
import { IntakeOutput } from '../../types';

const INTAKE_CATS = ['口服', '靜脈輸液', '管灌', '其他'];
const OUTPUT_CATS = ['尿液', '糞便', '嘔吐', '引流', '傷口引流', '其他'];

export default function IntakeOutputTab({ patientId }: { patientId: string }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<IntakeOutput[]>([]);
  const [totals, setTotals] = useState<Record<string, { intake: number; output: number }>>({});
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    api.get(`/patients/${patientId}/io`, { params: { date } }).then(r => {
      setRecords(r.data.records);
      setTotals(r.data.totals);
    });
  };
  useEffect(() => { load(); }, [patientId, date]);

  const del = async (id: number) => {
    if (!confirm('確定刪除此記錄？')) return;
    await api.delete(`/patients/${patientId}/io/${id}`);
    load();
  };

  const dayTotal = totals[date] || { intake: 0, output: 0 };
  const balance = dayTotal.intake - dayTotal.output;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800">出入量記錄</h3>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" className="input-field w-auto text-sm" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-xs"><Plus size={14} />新增記錄</button>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-blue-100 rounded-full p-2"><ArrowDown size={18} className="text-blue-600" /></div>
          <div>
            <div className="text-2xl font-bold text-blue-800">{dayTotal.intake} mL</div>
            <div className="text-xs text-blue-600">總攝入量</div>
          </div>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-orange-100 rounded-full p-2"><ArrowUp size={18} className="text-orange-600" /></div>
          <div>
            <div className="text-2xl font-bold text-orange-800">{dayTotal.output} mL</div>
            <div className="text-xs text-orange-600">總排出量</div>
          </div>
        </div>
        <div className={`${balance >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-xl p-4 flex items-center gap-3`}>
          <div className={`${balance >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full p-2`}>
            <Droplets size={18} className={balance >= 0 ? 'text-green-600' : 'text-red-600'} />
          </div>
          <div>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-800' : 'text-red-800'}`}>{balance >= 0 ? '+' : ''}{balance} mL</div>
            <div className={`text-xs ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>體液平衡</div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="card">
        <div className="grid grid-cols-2 gap-4">
          {/* Intake */}
          <div>
            <div className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1"><ArrowDown size={14} />攝入記錄</div>
            <table className="w-full">
              <thead><tr>
                <th className="table-header">時間</th>
                <th className="table-header">類別</th>
                <th className="table-header">量(mL)</th>
                <th className="table-header">備註</th>
                <th className="table-header"></th>
              </tr></thead>
              <tbody>
                {records.filter(r => r.type === 'intake').map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-cell text-xs">{r.record_time}</td>
                    <td className="table-cell text-xs text-blue-700">{r.category}</td>
                    <td className="table-cell font-semibold text-blue-800">{r.amount}</td>
                    <td className="table-cell text-xs text-gray-400">{r.notes || ''}</td>
                    <td className="table-cell"><button onClick={() => del(r.id)} className="text-red-300 hover:text-red-500"><Trash2 size={12} /></button></td>
                  </tr>
                ))}
                {records.filter(r => r.type === 'intake').length === 0 && (
                  <tr><td colSpan={5} className="text-center py-4 text-gray-400 text-xs">無攝入記錄</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Output */}
          <div>
            <div className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1"><ArrowUp size={14} />排出記錄</div>
            <table className="w-full">
              <thead><tr>
                <th className="table-header">時間</th>
                <th className="table-header">類別</th>
                <th className="table-header">量(mL)</th>
                <th className="table-header">備註</th>
                <th className="table-header"></th>
              </tr></thead>
              <tbody>
                {records.filter(r => r.type === 'output').map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-cell text-xs">{r.record_time}</td>
                    <td className="table-cell text-xs text-orange-700">{r.category}</td>
                    <td className="table-cell font-semibold text-orange-800">{r.amount}</td>
                    <td className="table-cell text-xs text-gray-400">{r.notes || ''}</td>
                    <td className="table-cell"><button onClick={() => del(r.id)} className="text-red-300 hover:text-red-500"><Trash2 size={12} /></button></td>
                  </tr>
                ))}
                {records.filter(r => r.type === 'output').length === 0 && (
                  <tr><td colSpan={5} className="text-center py-4 text-gray-400 text-xs">無排出記錄</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAdd && <AddIOModal patientId={patientId} date={date} onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

function AddIOModal({ patientId, date, onClose, onSaved }: { patientId: string; date: string; onClose: () => void; onSaved: () => void }) {
  const now = new Date();
  const [form, setForm] = useState({
    record_date: date,
    record_time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
    type: 'intake',
    category: 'oral (口服)',
    amount: '',
    unit: 'mL',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const cats = form.type === 'intake' ? INTAKE_CATS : OUTPUT_CATS;

  const save = async () => {
    if (!form.amount) return;
    setSaving(true);
    try {
      await api.post(`/patients/${patientId}/io`, { ...form, amount: parseFloat(form.amount) });
      onSaved(); onClose();
    } catch { } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold mb-4">新增出入量記錄</h3>
        <div className="space-y-3">
          <div><label className="label">類型</label>
            <div className="flex gap-3">
              {['intake', 'output'].map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value={t} checked={form.type === t}
                    onChange={() => { setForm(f => ({ ...f, type: t, category: t === 'intake' ? INTAKE_CATS[0] : OUTPUT_CATS[0] })); }} />
                  <span className={`text-sm font-medium ${t === 'intake' ? 'text-blue-700' : 'text-orange-700'}`}>{t === 'intake' ? '攝入' : '排出'}</span>
                </label>
              ))}
            </div>
          </div>
          <div><label className="label">類別</label>
            <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">日期</label><input type="date" className="input-field" value={form.record_date} onChange={e => set('record_date', e.target.value)} /></div>
            <div><label className="label">時間</label><input type="time" className="input-field" value={form.record_time} onChange={e => set('record_time', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">數量 *</label><input type="number" className="input-field" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" /></div>
            <div><label className="label">單位</label>
              <select className="input-field" value={form.unit} onChange={e => set('unit', e.target.value)}>
                <option value="mL">mL</option><option value="次">次</option><option value="條">條</option>
              </select>
            </div>
          </div>
          <div><label className="label">備註</label><input className="input-field" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>
        </div>
      </div>
    </div>
  );
}
