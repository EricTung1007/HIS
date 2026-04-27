import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, User, AlertCircle } from 'lucide-react';
import api from '../api/client';
import { Patient } from '../types';
import Modal from '../components/Modal';

export default function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/patients', { params: { search: search || undefined } })
      .then(r => setPatients(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">住民管理</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> 新增住民
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋住民姓名、編號、房號..."
              className="input-field pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-sm text-gray-500">共 {patients.length} 位住民</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">住民編號</th>
                <th className="table-header">姓名</th>
                <th className="table-header">性別</th>
                <th className="table-header">出生日期</th>
                <th className="table-header">房號/床號</th>
                <th className="table-header">照護等級</th>
                <th className="table-header">血型</th>
                <th className="table-header">緊急聯絡人</th>
                <th className="table-header">入住日期</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-mono text-xs text-gray-500">{p.patient_no}</td>
                  <td className="table-cell">
                    <Link to={`/patients/${p.id}`} className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${p.gender === 'F' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                        {p.gender === 'F' ? '女' : '男'}
                      </div>
                      {p.name}
                    </Link>
                    {p.notes && <div className="text-xs text-orange-500 flex items-center gap-1 mt-0.5"><AlertCircle size={10} />{p.notes.substring(0, 25)}...</div>}
                  </td>
                  <td className="table-cell text-gray-600">{p.gender === 'F' ? '女' : '男'}</td>
                  <td className="table-cell text-gray-600 text-xs">{p.birth_date}</td>
                  <td className="table-cell text-gray-600">{p.room_no || '-'} / {p.bed_no || '-'}</td>
                  <td className="table-cell"><span className="badge-active text-xs">{p.care_level || '-'}</span></td>
                  <td className="table-cell text-gray-600">{p.blood_type || '-'}</td>
                  <td className="table-cell text-xs text-gray-600">
                    {p.emergency_contact_name && <div>{p.emergency_contact_name} ({p.emergency_contact_relation})</div>}
                    {p.emergency_contact_phone && <div className="text-gray-400">{p.emergency_contact_phone}</div>}
                  </td>
                  <td className="table-cell text-gray-600 text-xs">{p.admission_date}</td>
                  <td className="table-cell">
                    <Link to={`/patients/${p.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">查看</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && patients.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <User size={40} className="mx-auto mb-2 text-gray-300" />
              <div>無符合條件的住民資料</div>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

function AddPatientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    patient_no: '', name: '', id_number: '', birth_date: '', gender: 'F',
    blood_type: '', admission_date: new Date().toISOString().split('T')[0],
    room_no: '', bed_no: '', care_level: '長照2級', nhi_no: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '兒子', notes: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.patient_no || !form.name || !form.birth_date) {
      setError('請填寫住民編號、姓名及出生日期'); return;
    }
    setSaving(true);
    try {
      await api.post('/patients', form);
      onSaved(); onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || '儲存失敗');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="新增住民" onClose={onClose} size="xl">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">住民編號 *</label><input className="input-field" value={form.patient_no} onChange={e => set('patient_no', e.target.value)} placeholder="L001" /></div>
        <div><label className="label">姓名 *</label><input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label className="label">身分證號</label><input className="input-field" value={form.id_number} onChange={e => set('id_number', e.target.value)} /></div>
        <div><label className="label">健保號</label><input className="input-field" value={form.nhi_no} onChange={e => set('nhi_no', e.target.value)} /></div>
        <div><label className="label">出生日期 *</label><input type="date" className="input-field" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} /></div>
        <div><label className="label">性別</label>
          <select className="input-field" value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="F">女</option><option value="M">男</option>
          </select>
        </div>
        <div><label className="label">血型</label>
          <select className="input-field" value={form.blood_type} onChange={e => set('blood_type', e.target.value)}>
            <option value="">不詳</option><option value="A">A</option><option value="B">B</option>
            <option value="O">O</option><option value="AB">AB</option>
          </select>
        </div>
        <div><label className="label">照護等級</label>
          <select className="input-field" value={form.care_level} onChange={e => set('care_level', e.target.value)}>
            {['長照1級','長照2級','長照3級','長照4級','長照5級','長照6級','長照7級','長照8級'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div><label className="label">房號</label><input className="input-field" value={form.room_no} onChange={e => set('room_no', e.target.value)} /></div>
        <div><label className="label">床號</label><input className="input-field" value={form.bed_no} onChange={e => set('bed_no', e.target.value)} /></div>
        <div><label className="label">入住日期</label><input type="date" className="input-field" value={form.admission_date} onChange={e => set('admission_date', e.target.value)} /></div>
        <div><label className="label">緊急聯絡人</label><input className="input-field" value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} /></div>
        <div><label className="label">關係</label><input className="input-field" value={form.emergency_contact_relation} onChange={e => set('emergency_contact_relation', e.target.value)} /></div>
        <div><label className="label">緊急聯絡電話</label><input className="input-field" value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} /></div>
        <div className="col-span-2"><label className="label">備註/注意事項</label><textarea className="input-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      {error && <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-3 mt-4">
        <button className="btn-secondary" onClick={onClose}>取消</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>
      </div>
    </Modal>
  );
}
