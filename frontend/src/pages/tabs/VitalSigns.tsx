import { useEffect, useState } from 'react';
import { Plus, Trash2, Heart, Thermometer, Wind, Activity } from 'lucide-react';
import api from '../../api/client';
import { VitalSigns } from '../../types';

function ValueCell({ value, unit, warn, danger }: { value?: number | null; unit: string; warn?: [number, number]; danger?: [number, number] }) {
  if (value === null || value === undefined) return <span className="text-gray-300">-</span>;
  let cls = 'text-gray-900';
  if (danger && (value < danger[0] || value > danger[1])) cls = 'text-red-600 font-bold';
  else if (warn && (value < warn[0] || value > warn[1])) cls = 'text-orange-500 font-semibold';
  return <span className={cls}>{value}<span className="text-xs text-gray-400 ml-0.5">{unit}</span></span>;
}

export default function VitalSignsTab({ patientId }: { patientId: string }) {
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    api.get(`/patients/${patientId}/vitals`, { params: { limit: 30 } }).then(r => setVitals(r.data));
  };
  useEffect(() => { load(); }, [patientId]);

  const del = async (id: number) => {
    if (!confirm('確定刪除此記錄？')) return;
    await api.delete(`/patients/${patientId}/vitals/${id}`);
    load();
  };

  const latest = vitals[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">生命徵象記錄</h3>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-xs"><Plus size={14} />新增量測</button>
      </div>

      {/* Latest Values */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <VitalCard icon={<Heart size={18} className="text-red-500" />} label="血壓" value={latest.systolic_bp && latest.diastolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : '-'} unit="mmHg" color="bg-red-50" />
          <VitalCard icon={<Activity size={18} className="text-pink-500" />} label="心率" value={latest.heart_rate?.toString() || '-'} unit="次/分" color="bg-pink-50" />
          <VitalCard icon={<Wind size={18} className="text-blue-500" />} label="呼吸" value={latest.respiratory_rate?.toString() || '-'} unit="次/分" color="bg-blue-50" />
          <VitalCard icon={<Thermometer size={18} className="text-orange-500" />} label="體溫" value={latest.temperature?.toString() || '-'} unit="°C" color="bg-orange-50" />
          <VitalCard icon={<div className="text-teal-500 font-bold text-sm">O₂</div>} label="血氧" value={latest.spo2?.toString() || '-'} unit="%" color="bg-teal-50" />
        </div>
      )}

      {/* History Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-header">量測時間</th>
              <th className="table-header">血壓(mmHg)</th>
              <th className="table-header">心率(/分)</th>
              <th className="table-header">呼吸(/分)</th>
              <th className="table-header">體溫(°C)</th>
              <th className="table-header">血氧(%)</th>
              <th className="table-header">體重(kg)</th>
              <th className="table-header">疼痛(0-10)</th>
              <th className="table-header">血糖(mg/dL)</th>
              <th className="table-header">備註</th>
              <th className="table-header">記錄者</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {vitals.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="table-cell text-xs text-gray-500">{new Date(v.measured_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="table-cell">
                  <ValueCell value={v.systolic_bp && v.diastolic_bp ? undefined : undefined} unit="" />
                  {v.systolic_bp && v.diastolic_bp ? (
                    <span className={`${(v.systolic_bp > 160 || v.systolic_bp < 90) ? 'text-red-600 font-bold' : v.systolic_bp > 140 ? 'text-orange-500 font-semibold' : 'text-gray-900'}`}>
                      {v.systolic_bp}/{v.diastolic_bp}
                    </span>
                  ) : <span className="text-gray-300">-</span>}
                </td>
                <td className="table-cell"><ValueCell value={v.heart_rate} unit="" warn={[60,100]} danger={[40,120]} /></td>
                <td className="table-cell"><ValueCell value={v.respiratory_rate} unit="" warn={[12,20]} danger={[8,24]} /></td>
                <td className="table-cell"><ValueCell value={v.temperature} unit="" warn={[36,37.5]} danger={[35,38.5]} /></td>
                <td className="table-cell"><ValueCell value={v.spo2} unit="" warn={[95,100]} danger={[90,100]} /></td>
                <td className="table-cell text-gray-600">{v.weight ?? '-'}</td>
                <td className="table-cell">
                  {v.pain_score !== null && v.pain_score !== undefined
                    ? <span className={`font-medium ${v.pain_score >= 7 ? 'text-red-600' : v.pain_score >= 4 ? 'text-orange-500' : 'text-green-600'}`}>{v.pain_score}</span>
                    : <span className="text-gray-300">-</span>}
                </td>
                <td className="table-cell">
                  {v.blood_glucose !== null && v.blood_glucose !== undefined
                    ? <span className={`font-medium ${v.blood_glucose > 180 || v.blood_glucose < 70 ? 'text-red-600' : 'text-gray-900'}`}>{v.blood_glucose}</span>
                    : <span className="text-gray-300">-</span>}
                </td>
                <td className="table-cell text-xs text-gray-400">{v.notes || ''}</td>
                <td className="table-cell text-xs text-gray-400">{v.recorded_by_name || '-'}</td>
                <td className="table-cell"><button onClick={() => del(v.id)} className="text-red-300 hover:text-red-500"><Trash2 size={13} /></button></td>
              </tr>
            ))}
            {vitals.length === 0 && <tr><td colSpan={12} className="text-center py-8 text-gray-400 text-sm">無生命徵象記錄</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && <AddVitalModal patientId={patientId} onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

function VitalCard({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: string; unit: string; color: string }) {
  return (
    <div className={`${color} rounded-xl p-3 flex items-center gap-3`}>
      {icon}
      <div>
        <div className="text-lg font-bold text-gray-900">{value} <span className="text-xs font-normal text-gray-500">{unit}</span></div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function AddVitalModal({ patientId, onClose, onSaved }: { patientId: string; onClose: () => void; onSaved: () => void }) {
  const now = new Date();
  const [form, setForm] = useState({
    measured_at: `${now.toISOString().split('T')[0]}T${now.toTimeString().substring(0,5)}`,
    systolic_bp: '', diastolic_bp: '', heart_rate: '', respiratory_rate: '',
    temperature: '', spo2: '', weight: '', height: '', pain_score: '', blood_glucose: '', notes: ''
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const toNum = (v: string) => v === '' ? null : parseFloat(v);
  const save = async () => {
    await api.post(`/patients/${patientId}/vitals`, {
      ...form,
      systolic_bp: toNum(form.systolic_bp), diastolic_bp: toNum(form.diastolic_bp),
      heart_rate: toNum(form.heart_rate), respiratory_rate: toNum(form.respiratory_rate),
      temperature: toNum(form.temperature), spo2: toNum(form.spo2),
      weight: toNum(form.weight), height: toNum(form.height),
      pain_score: toNum(form.pain_score), blood_glucose: toNum(form.blood_glucose),
    });
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold mb-4">新增生命徵象</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-3"><label className="label">量測時間</label><input type="datetime-local" className="input-field" value={form.measured_at} onChange={e => set('measured_at', e.target.value)} /></div>
          <div><label className="label">收縮壓 (mmHg)</label><input type="number" className="input-field" value={form.systolic_bp} onChange={e => set('systolic_bp', e.target.value)} placeholder="120" /></div>
          <div><label className="label">舒張壓 (mmHg)</label><input type="number" className="input-field" value={form.diastolic_bp} onChange={e => set('diastolic_bp', e.target.value)} placeholder="80" /></div>
          <div><label className="label">心率 (次/分)</label><input type="number" className="input-field" value={form.heart_rate} onChange={e => set('heart_rate', e.target.value)} placeholder="72" /></div>
          <div><label className="label">呼吸次數 (次/分)</label><input type="number" className="input-field" value={form.respiratory_rate} onChange={e => set('respiratory_rate', e.target.value)} placeholder="16" /></div>
          <div><label className="label">體溫 (°C)</label><input type="number" step="0.1" className="input-field" value={form.temperature} onChange={e => set('temperature', e.target.value)} placeholder="36.5" /></div>
          <div><label className="label">血氧飽和度 (%)</label><input type="number" step="0.1" className="input-field" value={form.spo2} onChange={e => set('spo2', e.target.value)} placeholder="98" /></div>
          <div><label className="label">體重 (kg)</label><input type="number" step="0.1" className="input-field" value={form.weight} onChange={e => set('weight', e.target.value)} /></div>
          <div><label className="label">身高 (cm)</label><input type="number" step="0.1" className="input-field" value={form.height} onChange={e => set('height', e.target.value)} /></div>
          <div><label className="label">疼痛指數 (0-10)</label><input type="number" min="0" max="10" className="input-field" value={form.pain_score} onChange={e => set('pain_score', e.target.value)} /></div>
          <div><label className="label">血糖 (mg/dL)</label><input type="number" className="input-field" value={form.blood_glucose} onChange={e => set('blood_glucose', e.target.value)} /></div>
          <div className="col-span-2 md:col-span-3"><label className="label">備註</label><input className="input-field" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-4"><button className="btn-secondary" onClick={onClose}>取消</button><button className="btn-primary" onClick={save}>儲存</button></div>
      </div>
    </div>
  );
}
