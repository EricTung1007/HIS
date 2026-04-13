import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { MedicalHistory, Diagnosis, Allergy } from '../../types';

const severityLabel: Record<string, string> = { mild: '輕度', moderate: '中度', severe: '重度' };
const severityClass: Record<string, string> = {
  mild: 'badge-warning', moderate: 'badge-danger', severe: 'bg-red-200 text-red-900 px-2 py-0.5 rounded text-xs font-medium'
};

export default function MedicalHistoryTab({ patientId }: { patientId: string }) {
  const [history, setHistory] = useState<MedicalHistory | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [editingHistory, setEditingHistory] = useState(false);
  const [historyForm, setHistoryForm] = useState<Partial<MedicalHistory>>({});
  const [showAddDiag, setShowAddDiag] = useState(false);
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/patients/${patientId}/history`).then(r => {
      setHistory(r.data.history);
      setHistoryForm(r.data.history || {});
      setDiagnoses(r.data.diagnoses);
      setAllergies(r.data.allergies);
    });
  };
  useEffect(() => { load(); }, [patientId]);

  const saveHistory = async () => {
    setSaving(true);
    try { await api.put(`/patients/${patientId}/history`, historyForm); load(); setEditingHistory(false); }
    catch { /* ignore */ } finally { setSaving(false); }
  };

  const deleteDiag = async (id: number) => {
    if (!confirm('確定刪除此診斷？')) return;
    await api.delete(`/patients/${patientId}/history/diagnoses/${id}`);
    load();
  };

  const deleteAllergy = async (id: number) => {
    if (!confirm('確定刪除此過敏記錄？')) return;
    await api.delete(`/patients/${patientId}/history/allergies/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      {/* Allergies Alert */}
      {allergies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-red-700 mb-1">過敏警示</div>
            <div className="flex flex-wrap gap-2">
              {allergies.map(a => (
                <span key={a.id} className={severityClass[a.severity] || 'badge-warning'}>
                  {a.allergen} — {a.reaction} ({severityLabel[a.severity]})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Medical History */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title mb-0">病史記錄</div>
          {!editingHistory
            ? <button onClick={() => setEditingHistory(true)} className="btn-secondary flex items-center gap-1 text-xs py-1.5"><Edit2 size={13} />編輯</button>
            : <div className="flex gap-2">
                <button onClick={() => setEditingHistory(false)} className="btn-secondary flex items-center gap-1 text-xs py-1.5"><X size={13} />取消</button>
                <button onClick={saveHistory} disabled={saving} className="btn-primary flex items-center gap-1 text-xs py-1.5"><Save size={13} />{saving ? '儲存中...' : '儲存'}</button>
              </div>
          }
        </div>
        {editingHistory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'chief_complaint', label: '主訴' },
              { key: 'present_illness', label: '現病史', rows: 3 },
              { key: 'past_history', label: '過去病史', rows: 3 },
              { key: 'family_history', label: '家族史' },
              { key: 'surgical_history', label: '手術史' },
              { key: 'social_history', label: '社會史' },
              { key: 'smoking', label: '吸菸史' },
              { key: 'alcohol', label: '飲酒習慣' },
            ].map(({ key, label, rows }) => (
              <div key={key} className={rows && rows > 1 ? 'col-span-2' : ''}>
                <label className="label">{label}</label>
                {rows ? (
                  <textarea className="input-field" rows={rows}
                    value={(historyForm as any)[key] || ''}
                    onChange={e => setHistoryForm(f => ({ ...f, [key]: e.target.value }))} />
                ) : (
                  <input className="input-field"
                    value={(historyForm as any)[key] || ''}
                    onChange={e => setHistoryForm(f => ({ ...f, [key]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
        ) : history ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {[
              { key: 'chief_complaint', label: '主訴' },
              { key: 'present_illness', label: '現病史' },
              { key: 'past_history', label: '過去病史' },
              { key: 'family_history', label: '家族史' },
              { key: 'surgical_history', label: '手術史' },
              { key: 'social_history', label: '社會史' },
              { key: 'smoking', label: '吸菸史' },
              { key: 'alcohol', label: '飲酒習慣' },
            ].map(({ key, label }) => (
              <div key={key} className={key.includes('illness') || key.includes('history') ? '' : ''}>
                <span className="font-medium text-gray-600">{label}：</span>
                <span className="text-gray-800">{(history as any)[key] || <span className="text-gray-400">未記錄</span>}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">
            尚未記錄病史，請點擊編輯按鈕新增
          </div>
        )}
      </div>

      {/* Diagnoses */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title mb-0">診斷列表</div>
          <button onClick={() => setShowAddDiag(true)} className="btn-primary flex items-center gap-1 text-xs py-1.5"><Plus size={13} />新增診斷</button>
        </div>
        <table className="w-full">
          <thead><tr>
            <th className="table-header">ICD代碼</th>
            <th className="table-header">診斷描述</th>
            <th className="table-header">診斷日期</th>
            <th className="table-header">狀態</th>
            <th className="table-header">備註</th>
            <th className="table-header"></th>
          </tr></thead>
          <tbody>
            {diagnoses.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-xs text-gray-500">{d.icd_code || '-'}</td>
                <td className="table-cell font-medium">{d.description}</td>
                <td className="table-cell text-gray-600 text-xs">{d.diagnosis_date || '-'}</td>
                <td className="table-cell"><span className={d.status === 'active' ? 'badge-active' : 'badge-inactive'}>{d.status === 'active' ? '現存' : '已解決'}</span></td>
                <td className="table-cell text-gray-500 text-xs">{d.notes || '-'}</td>
                <td className="table-cell"><button onClick={() => deleteDiag(d.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {diagnoses.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-gray-400 text-sm">無診斷記錄</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Allergies */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title mb-0">過敏記錄</div>
          <button onClick={() => setShowAddAllergy(true)} className="btn-primary flex items-center gap-1 text-xs py-1.5"><Plus size={13} />新增過敏</button>
        </div>
        <table className="w-full">
          <thead><tr>
            <th className="table-header">過敏原</th>
            <th className="table-header">過敏反應</th>
            <th className="table-header">嚴重程度</th>
            <th className="table-header"></th>
          </tr></thead>
          <tbody>
            {allergies.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium text-red-700">{a.allergen}</td>
                <td className="table-cell text-gray-600">{a.reaction || '-'}</td>
                <td className="table-cell"><span className={severityClass[a.severity] || 'badge-warning'}>{severityLabel[a.severity]}</span></td>
                <td className="table-cell"><button onClick={() => deleteAllergy(a.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {allergies.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-gray-400 text-sm">無過敏記錄</td></tr>}
          </tbody>
        </table>
      </div>

      {showAddDiag && <AddDiagnosisModal patientId={patientId} onClose={() => setShowAddDiag(false)} onSaved={load} />}
      {showAddAllergy && <AddAllergyModal patientId={patientId} onClose={() => setShowAddAllergy(false)} onSaved={load} />}
    </div>
  );
}

function AddDiagnosisModal({ patientId, onClose, onSaved }: { patientId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ icd_code: '', description: '', diagnosis_date: new Date().toISOString().split('T')[0], status: 'active', notes: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.description) return;
    await api.post(`/patients/${patientId}/history/diagnoses`, form);
    onSaved(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold mb-4">新增診斷</h3>
        <div className="space-y-3">
          <div><label className="label">ICD代碼</label><input className="input-field" value={form.icd_code} onChange={e => set('icd_code', e.target.value)} placeholder="例：E11.9" /></div>
          <div><label className="label">診斷描述 *</label><input className="input-field" value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div><label className="label">診斷日期</label><input type="date" className="input-field" value={form.diagnosis_date} onChange={e => set('diagnosis_date', e.target.value)} /></div>
          <div><label className="label">狀態</label>
            <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">現存</option><option value="resolved">已解決</option>
            </select>
          </div>
          <div><label className="label">備註</label><input className="input-field" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-4"><button className="btn-secondary" onClick={onClose}>取消</button><button className="btn-primary" onClick={save}>儲存</button></div>
      </div>
    </div>
  );
}

function AddAllergyModal({ patientId, onClose, onSaved }: { patientId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ allergen: '', reaction: '', severity: 'mild' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.allergen) return;
    await api.post(`/patients/${patientId}/history/allergies`, form);
    onSaved(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold mb-4">新增過敏記錄</h3>
        <div className="space-y-3">
          <div><label className="label">過敏原 *</label><input className="input-field" value={form.allergen} onChange={e => set('allergen', e.target.value)} placeholder="例：Penicillin" /></div>
          <div><label className="label">過敏反應</label><input className="input-field" value={form.reaction} onChange={e => set('reaction', e.target.value)} /></div>
          <div><label className="label">嚴重程度</label>
            <select className="input-field" value={form.severity} onChange={e => set('severity', e.target.value)}>
              <option value="mild">輕度</option><option value="moderate">中度</option><option value="severe">重度</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4"><button className="btn-secondary" onClick={onClose}>取消</button><button className="btn-primary" onClick={save}>儲存</button></div>
      </div>
    </div>
  );
}
