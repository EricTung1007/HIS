import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock, Plus } from 'lucide-react';
import api from '../../api/client';
import { MedicationOrder, MedicationAdministration } from '../../types';

const STATUS_OPTS = [
  { value: 'given', label: '已給藥', cls: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'held', label: '暫停', cls: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  { value: 'refused', label: '拒絕', cls: 'bg-orange-100 text-orange-800', icon: XCircle },
  { value: 'not_available', label: '無藥', cls: 'bg-gray-100 text-gray-600', icon: XCircle },
];

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTS.find(s => s.value === status) || STATUS_OPTS[0];
  const Icon = opt.icon;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${opt.cls}`}><Icon size={10} />{opt.label}</span>;
}

export default function MARTab({ patientId }: { patientId: string }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [showRecord, setShowRecord] = useState<MedicationOrder | null>(null);

  const load = () => {
    api.get(`/patients/${patientId}/mar`, { params: { date } }).then(r => setOrders(r.data));
  };
  useEffect(() => { load(); }, [patientId, date]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800">用藥記錄 (MAR)</h3>
          <div className="flex items-center gap-2">
            {STATUS_OPTS.map(s => <span key={s.value} className={`text-xs px-2 py-0.5 rounded ${s.cls}`}>{s.label}</span>)}
          </div>
        </div>
        <input type="date" className="input-field w-auto text-sm" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">本日無有效用藥醫囑</div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-semibold text-blue-900 text-sm">{order.medication_name}</span>
                    {order.generic_name && <span className="text-xs text-gray-500 ml-2">({order.generic_name})</span>}
                  </div>
                  <span className="text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-0.5">
                    {order.dose} {order.unit} · {order.route} · {order.frequency}
                  </span>
                  {order.times_per_day && (
                    <span className="text-xs text-blue-600 flex items-center gap-1"><Clock size={11} />{order.times_per_day}</span>
                  )}
                </div>
                <button onClick={() => setShowRecord(order)} className="btn-primary text-xs py-1 flex items-center gap-1"><Plus size={12} />記錄給藥</button>
              </div>

              {order.administrations && order.administrations.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {order.administrations.map(a => (
                    <div key={a.id} className="px-4 py-2 flex items-center gap-4 text-sm">
                      <div className="w-32 text-xs text-gray-500">
                        {a.administered_at ? new Date(a.administered_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                      <StatusBadge status={a.status} />
                      <div className="text-gray-600 text-xs">劑量：{a.dose_given || order.dose + ' ' + order.unit}</div>
                      {a.notes && <div className="text-gray-400 text-xs">備註：{a.notes}</div>}
                      <div className="ml-auto text-xs text-gray-400">執行者：{a.administered_by_name || '-'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">本日尚無給藥記錄</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showRecord && (
        <RecordAdminModal
          patientId={patientId}
          order={showRecord}
          onClose={() => setShowRecord(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function RecordAdminModal({ patientId, order, onClose, onSaved }: {
  patientId: string; order: MedicationOrder; onClose: () => void; onSaved: () => void;
}) {
  const now = new Date();
  const [form, setForm] = useState({
    order_id: order.id,
    administered_at: `${now.toISOString().split('T')[0]}T${now.toTimeString().substring(0,5)}`,
    dose_given: `${order.dose} ${order.unit}`,
    status: 'given',
    notes: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    await api.post(`/patients/${patientId}/mar`, form);
    onSaved(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold mb-1">記錄給藥</h3>
        <div className="text-sm text-gray-500 mb-4">{order.medication_name} — {order.dose} {order.unit} {order.route} {order.frequency}</div>
        <div className="space-y-3">
          <div><label className="label">給藥狀態</label>
            <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div><label className="label">給藥時間</label>
            <input type="datetime-local" className="input-field" value={form.administered_at} onChange={e => set('administered_at', e.target.value)} />
          </div>
          <div><label className="label">實際給藥劑量</label>
            <input className="input-field" value={form.dose_given} onChange={e => set('dose_given', e.target.value)} />
          </div>
          <div><label className="label">備註</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="如：住民拒絕吞服、給藥有困難..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={save}>確認給藥</button>
        </div>
      </div>
    </div>
  );
}
