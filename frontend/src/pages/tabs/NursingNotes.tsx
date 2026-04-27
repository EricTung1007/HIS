import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, FileText, Clock } from 'lucide-react';
import api from '../../api/client';
import { NursingNote } from '../../types';

export default function NursingNotesTab({ patientId }: { patientId: string }) {
  const [notes, setNotes] = useState<NursingNote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState<NursingNote | null>(null);
  const [dateFilter, setDateFilter] = useState('');

  const load = () => {
    const params: any = { limit: 50 };
    if (dateFilter) params.date = dateFilter;
    api.get(`/patients/${patientId}/notes`, { params }).then(r => setNotes(r.data));
  };
  useEffect(() => { load(); }, [patientId, dateFilter]);

  const del = async (id: number) => {
    if (!confirm('確定刪除此護理記錄？')) return;
    await api.delete(`/patients/${patientId}/notes/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">護理記錄</h3>
        <div className="flex items-center gap-3">
          <input type="date" className="input-field w-auto text-sm" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            placeholder="篩選日期" />
          {dateFilter && <button onClick={() => setDateFilter('')} className="text-xs text-gray-400 hover:text-gray-600">清除</button>}
          <button onClick={() => { setEditNote(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-xs">
            <Plus size={14} />新增記錄
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {notes.map(note => (
          <div key={note.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
            <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={14} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-800">
                  {new Date(note.note_datetime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="badge-active text-xs">
                  {note.note_type === 'SOAP' ? 'SOAP 格式' : note.note_type === 'DAR' ? 'DAR 格式' : '敘述型記錄'}
                </span>
                <span className="text-xs text-gray-400">撰寫：{note.created_by_name || '-'}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditNote(note); setShowForm(true); }} className="text-blue-400 hover:text-blue-600"><Edit2 size={13} /></button>
                <button onClick={() => del(note.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
              </div>
            </div>

            {note.note_type === 'SOAP' ? (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {note.subjective && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-blue-700 mb-1">S — 主觀資料 (Subjective)</div>
                    <div className="text-gray-800 whitespace-pre-wrap">{note.subjective}</div>
                  </div>
                )}
                {note.objective && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-green-700 mb-1">O — 客觀資料 (Objective)</div>
                    <div className="text-gray-800 whitespace-pre-wrap">{note.objective}</div>
                  </div>
                )}
                {note.assessment && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-yellow-700 mb-1">A — 護理評估 (Assessment)</div>
                    <div className="text-gray-800 whitespace-pre-wrap">{note.assessment}</div>
                  </div>
                )}
                {note.plan && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-purple-700 mb-1">P — 護理計畫 (Plan)</div>
                    <div className="text-gray-800 whitespace-pre-wrap">{note.plan}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-800 whitespace-pre-wrap">{note.content}</div>
            )}
          </div>
        ))}
        {notes.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FileText size={40} className="mx-auto mb-2 text-gray-200" />
            <div className="text-sm">無護理記錄</div>
          </div>
        )}
      </div>

      {showForm && (
        <NoteFormModal
          patientId={patientId}
          note={editNote}
          onClose={() => { setShowForm(false); setEditNote(null); }}
          onSaved={load}
        />
      )}
    </div>
  );
}

function NoteFormModal({ patientId, note, onClose, onSaved }: {
  patientId: string; note?: NursingNote | null; onClose: () => void; onSaved: () => void;
}) {
  const now = new Date();
  const [form, setForm] = useState({
    note_datetime: note?.note_datetime?.substring(0, 16) || `${now.toISOString().split('T')[0]}T${now.toTimeString().substring(0,5)}`,
    note_type: note?.note_type || 'SOAP',
    subjective: note?.subjective || '',
    objective: note?.objective || '',
    assessment: note?.assessment || '',
    plan: note?.plan || '',
    content: note?.content || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      if (note) await api.put(`/patients/${patientId}/notes/${note.id}`, form);
      else await api.post(`/patients/${patientId}/notes`, form);
      onSaved(); onClose();
    } catch { } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold">{note ? '編輯護理記錄' : '新增護理記錄'}</h3>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={onClose}>取消</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">記錄時間</label><input type="datetime-local" className="input-field" value={form.note_datetime} onChange={e => set('note_datetime', e.target.value)} /></div>
            <div><label className="label">記錄類型</label>
              <select className="input-field" value={form.note_type} onChange={e => set('note_type', e.target.value)}>
                <option value="SOAP">SOAP格式</option>
                <option value="DAR">DAR格式</option>
                <option value="narrative">敘述型</option>
              </select>
            </div>
          </div>

          {form.note_type === 'SOAP' ? (
            <div className="space-y-3">
              <div>
                <label className="label text-blue-700">S — 主觀資料 (Subjective)</label>
                <textarea className="input-field border-blue-200" rows={3} value={form.subjective}
                  onChange={e => set('subjective', e.target.value)}
                  placeholder="住民主訴、主觀感受..." />
              </div>
              <div>
                <label className="label text-green-700">O — 客觀資料 (Objective)</label>
                <textarea className="input-field border-green-200" rows={3} value={form.objective}
                  onChange={e => set('objective', e.target.value)}
                  placeholder="生命徵象、身體評估、觀察事項..." />
              </div>
              <div>
                <label className="label text-yellow-700">A — 護理評估 (Assessment)</label>
                <textarea className="input-field border-yellow-200" rows={3} value={form.assessment}
                  onChange={e => set('assessment', e.target.value)}
                  placeholder="護理診斷、問題評估..." />
              </div>
              <div>
                <label className="label text-purple-700">P — 護理計畫 (Plan)</label>
                <textarea className="input-field border-purple-200" rows={3} value={form.plan}
                  onChange={e => set('plan', e.target.value)}
                  placeholder="護理措施、計畫..." />
              </div>
            </div>
          ) : (
            <div>
              <label className="label">{form.note_type === 'DAR' ? 'Data/Action/Response' : '護理記錄'}</label>
              <textarea className="input-field" rows={8} value={form.content}
                onChange={e => set('content', e.target.value)}
                placeholder={form.note_type === 'DAR'
                  ? 'D (Data)：\nA (Action)：\nR (Response)：'
                  : '護理記錄內容...'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
