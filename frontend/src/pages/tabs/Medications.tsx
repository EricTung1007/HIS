import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, CheckCircle } from 'lucide-react';
import api from '../../api/client';
import { MedicationOrder } from '../../types';

const ROUTES = ['PO (口服)', 'IV (靜脈)', 'IM (肌肉)', 'SC (皮下)', 'SL (舌下)', 'Topical (外用)', 'Inhale (吸入)', 'Rectal (肛門)', 'Patch (貼片)'];
const FREQS = ['QD (每日一次)', 'BID (每日兩次)', 'TID (每日三次)', 'QID (每日四次)', 'Q4H (每4小時)', 'Q6H (每6小時)', 'Q8H (每8小時)', 'Q12H (每12小時)', 'PRN (需要時)', 'QW (每週)', 'HS (睡前)', 'AC (飯前)', 'PC (飯後)'];

export default function MedicationsTab({ patientId }: { patientId: string }) {
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editOrder, setEditOrder] = useState<MedicationOrder | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = () => {
    const params = showAll ? {} : { status: 'active' };
    api.get(`/patients/${patientId}/medications`, { params }).then(r => setOrders(r.data));
  };
  useEffect(() => { load(); }, [patientId, showAll]);

  const discontinue = async (id: number) => {
    if (!confirm('確定停止此用藥醫囑？')) return;
    await api.delete(`/patients/${patientId}/medications/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800">用藥醫囑</h3>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded" />
            顯示所有（含停藥）
          </label>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-xs"><Plus size={14} />新增醫囑</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">藥品名稱</th>
              <th className="table-header">學名</th>
              <th className="table-header">劑量</th>
              <th className="table-header">途徑</th>
              <th className="table-header">頻率</th>
              <th className="table-header">給藥時間</th>
              <th className="table-header">開始日期</th>
              <th className="table-header">結束日期</th>
              <th className="table-header">適應症</th>
              <th className="table-header">狀態</th>
              <th className="table-header">開立者</th>
              <th className="table-header">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className={`hover:bg-gray-50 ${o.status !== 'active' ? 'opacity-60' : ''}`}>
                <td className="table-cell font-medium text-blue-800">{o.medication_name}</td>
                <td className="table-cell text-gray-500 text-xs">{o.generic_name || '-'}</td>
                <td className="table-cell">{o.dose} {o.unit}</td>
                <td className="table-cell text-xs">{o.route}</td>
                <td className="table-cell text-xs">{o.frequency}</td>
                <td className="table-cell text-xs text-blue-600">{o.times_per_day || '-'}</td>
                <td className="table-cell text-xs">{o.start_date}</td>
                <td className="table-cell text-xs">{o.end_date || '繼續'}</td>
                <td className="table-cell text-xs text-gray-500">{o.indication || '-'}</td>
                <td className="table-cell">
                  <span className={o.status === 'active' ? 'badge-active' : 'badge-inactive'}>
                    {o.status === 'active' ? '使用中' : o.status === 'discontinued' ? '已停藥' : '已完成'}
                  </span>
                </td>
                <td className="table-cell text-xs text-gray-500">{o.ordered_by_name || '-'}</td>
                <td className="table-cell">
                  {o.status === 'active' && (
                    <div className="flex gap-2">
                      <button onClick={() => setEditOrder(o)} className="text-blue-400 hover:text-blue-600"><Edit2 size={14} /></button>
                      <button onClick={() => discontinue(o.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={12} className="text-center py-6 text-gray-400 text-sm">無用藥醫囑</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && <MedOrderModal patientId={patientId} onClose={() => setShowAdd(false)} onSaved={load} />}
      {editOrder && <MedOrderModal patientId={patientId} order={editOrder} onClose={() => setEditOrder(null)} onSaved={load} />}
    </div>
  );
}

function MedOrderModal({ patientId, order, onClose, onSaved }: {
  patientId: string; order?: MedicationOrder; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    medication_name: order?.medication_name || '',
    generic_name: order?.generic_name || '',
    dose: order?.dose || '',
    unit: order?.unit || 'mg',
    route: order?.route || 'PO (口服)',
    frequency: order?.frequency || 'QD (每日一次)',
    times_per_day: order?.times_per_day || '08:00',
    start_date: order?.start_date || new Date().toISOString().split('T')[0],
    end_date: order?.end_date || '',
    indication: order?.indication || '',
    instructions: order?.instructions || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.medication_name || !form.dose || !form.route || !form.frequency) return;
    setSaving(true);
    try {
      if (order) await api.put(`/patients/${patientId}/medications/${order.id}`, form);
      else await api.post(`/patients/${patientId}/medications`, form);
      onSaved(); onClose();
    } catch { } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold mb-4">{order ? '編輯醫囑' : '新增用藥醫囑'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">藥品名稱 *</label><input className="input-field" value={form.medication_name} onChange={e => set('medication_name', e.target.value)} placeholder="例：Amlodipine (脈優)" /></div>
          <div><label className="label">學名</label><input className="input-field" value={form.generic_name} onChange={e => set('generic_name', e.target.value)} /></div>
          <div><label className="label">劑量 *</label><input className="input-field" value={form.dose} onChange={e => set('dose', e.target.value)} placeholder="5" /></div>
          <div><label className="label">單位</label>
            <select className="input-field" value={form.unit} onChange={e => set('unit', e.target.value)}>
              {['mg','mcg','g','mL','unit','tab','cap','drop','patch'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div><label className="label">給藥途徑 *</label>
            <select className="input-field" value={form.route} onChange={e => set('route', e.target.value)}>
              {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div><label className="label">頻率 *</label>
            <select className="input-field" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div><label className="label">給藥時間</label><input className="input-field" value={form.times_per_day} onChange={e => set('times_per_day', e.target.value)} placeholder="08:00,20:00" /></div>
          <div><label className="label">開始日期</label><input type="date" className="input-field" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
          <div><label className="label">結束日期</label><input type="date" className="input-field" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
          <div className="col-span-2"><label className="label">適應症（用藥原因）</label><input className="input-field" value={form.indication} onChange={e => set('indication', e.target.value)} /></div>
          <div className="col-span-2"><label className="label">特殊指示</label><textarea className="input-field" rows={2} value={form.instructions} onChange={e => set('instructions', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>
        </div>
      </div>
    </div>
  );
}
