import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Phone, AlertTriangle, Edit2, Mic, Bot } from 'lucide-react';
import api from '../api/client';
import { Patient } from '../types';
import AIAssistant from '../components/AIAssistant';
import MedicalHistoryTab from './tabs/MedicalHistory';
import MedicationsTab from './tabs/Medications';
import MARTab from './tabs/MAR';
import IntakeOutputTab from './tabs/IntakeOutput';
import VitalSignsTab from './tabs/VitalSigns';
import PhysicalExamTab from './tabs/PhysicalExam';
import NursingNotesTab from './tabs/NursingNotes';
import BillingTab from './tabs/BillingTab';
import FamilyLogTab from './tabs/FamilyLogTab';

const TABS = [
  { id: 'history', label: '病史記錄' },
  { id: 'medications', label: '用藥醫囑' },
  { id: 'mar', label: '用藥記錄(MAR)' },
  { id: 'io', label: '出入量' },
  { id: 'vitals', label: '生命徵象' },
  { id: 'pe', label: '身體評估' },
  { id: 'notes', label: '護理記錄' },
  { id: 'billing', label: '💰 核銷碼' },
  { id: 'family', label: '📖 家屬聯絡簿' },
];

function calcAge(birth: string) {
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--;
  return age;
}

export default function PatientDetail() {
  const { id, tab } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const activeTab = tab || 'history';

  const loadPatient = () => {
    if (!id) return;
    api.get(`/patients/${id}`).then(r => setPatient(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadPatient(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">載入中...</div>;
  if (!patient) return <div className="text-center py-12 text-gray-500">找不到住民資料</div>;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/patients" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <ArrowLeft size={14} /> 住民管理
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{patient.name}</span>
      </div>

      {/* Patient Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
        {/* Top row: avatar + name/badges + action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-sm ${patient.gender === 'F' ? 'bg-rose-400' : 'bg-indigo-400'}`}>
              {patient.name[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
                <span className="text-sm text-gray-500">({patient.patient_no})</span>
                <span className="badge-active">{patient.care_level}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${patient.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                  {patient.gender === 'F' ? '女' : '男'}
                </span>
              </div>
            </div>
          </div>
          {/* Action buttons — shrink-0 so they never collapse */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl px-4 py-3 sm:py-2.5 transition-colors whitespace-nowrap flex-1 sm:flex-none border border-slate-200"
            >
              <Edit2 size={16} /><span>編輯</span>
            </button>
            <button
              onClick={() => setAiOpen(true)}
              className="flex items-center justify-center gap-2 text-base sm:text-sm font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-xl px-5 py-3 sm:py-2.5 shadow-sm transition-all duration-300 whitespace-nowrap border border-emerald-200 flex-1 sm:flex-none sm:w-auto w-full"
            >
              <Bot size={18} className="text-emerald-600" />
              <span>對話式助理</span>
            </button>
          </div>
        </div>
        {/* Detail info row */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 mb-2">
          <span className="flex items-center gap-1"><Calendar size={13} className="text-gray-400" />{patient.birth_date} ({calcAge(patient.birth_date)}歲)</span>
          <span className="flex items-center gap-1"><User size={13} className="text-gray-400" />血型：{patient.blood_type || '不詳'}</span>
          {patient.room_no && <span>房號：{patient.room_no} / 床號：{patient.bed_no}</span>}
          {patient.nhi_no && <span>健保號：{patient.nhi_no}</span>}
          <span>入住：{patient.admission_date}</span>
        </div>
        {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
          <div className="mb-2 text-sm text-gray-500 flex items-center gap-1">
            <Phone size={13} className="text-gray-400" />
            緊急聯絡：{patient.emergency_contact_name}（{patient.emergency_contact_relation}）{patient.emergency_contact_phone}
          </div>
        )}
        {/* Warning / Notes */}
        <div className="flex items-start gap-2">
          {patient.notes ? (
            <div className="flex-1 flex items-start gap-1 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-md px-3 py-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>{patient.notes}</span>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-1 text-xs text-gray-300 bg-gray-50 border border-dashed border-gray-200 rounded-md px-3 py-1.5">
              <AlertTriangle size={12} className="shrink-0" />
              <span>無注意事項警告</span>
            </div>
          )}
          <button
            onClick={() => setShowEdit(true)}
            title="編輯警告"
            className="shrink-0 flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 border border-orange-200 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 rounded-md px-2 py-1.5 transition-colors"
          >
            <Edit2 size={12} /> 編輯警告
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex min-w-max">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => navigate(`/patients/${id}/${t.id}`)}
                className={`px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                  activeTab === t.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {activeTab === 'history' && <MedicalHistoryTab patientId={id!} />}
          {activeTab === 'medications' && <MedicationsTab patientId={id!} />}
          {activeTab === 'mar' && <MARTab patientId={id!} />}
          {activeTab === 'io' && <IntakeOutputTab patientId={id!} />}
          {activeTab === 'vitals' && <VitalSignsTab patientId={id!} />}
          {activeTab === 'pe' && <PhysicalExamTab patientId={id!} />}
          {activeTab === 'notes' && <NursingNotesTab patientId={id!} />}
          {activeTab === 'billing' && <BillingTab patientId={id!} patientName={patient.name} />}
          {activeTab === 'family' && <FamilyLogTab patientId={id!} />}
        </div>
      </div>

      {/* AI Assistant panel (controlled by aiOpen state) */}
      <AIAssistant
        patientId={id!}
        patientName={patient.name}
        open={aiOpen}
        onOpenChange={setAiOpen}
        onActionExecuted={loadPatient}
      />

      {showEdit && patient && (
        <EditPatientModal
          patient={patient}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); loadPatient(); }}
        />
      )}
    </div>
  );
}

function EditPatientModal({ patient, onClose, onSaved }: {
  patient: Patient; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: patient.name,
    id_number: patient.id_number || '',
    birth_date: patient.birth_date,
    gender: patient.gender,
    blood_type: patient.blood_type || '',
    admission_date: patient.admission_date,
    discharge_date: patient.discharge_date || '',
    room_no: patient.room_no || '',
    bed_no: patient.bed_no || '',
    care_level: patient.care_level || '',
    nhi_no: patient.nhi_no || '',
    emergency_contact_name: patient.emergency_contact_name || '',
    emergency_contact_phone: patient.emergency_contact_phone || '',
    emergency_contact_relation: patient.emergency_contact_relation || '',
    status: patient.status,
    notes: patient.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.birth_date) { setError('姓名與出生日期為必填'); return; }
    setSaving(true);
    setError('');
    try {
      await api.put(`/patients/${patient.id}`, form);
      onSaved();
    } catch (e: any) {
      setError(e.response?.data?.error || '儲存失敗');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">編輯住民資料</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
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
            <div><label className="label">狀態</label>
              <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">在住</option>
                <option value="discharged">已退住</option>
                <option value="deceased">已往生</option>
              </select>
            </div>
            <div><label className="label">房號</label><input className="input-field" value={form.room_no} onChange={e => set('room_no', e.target.value)} /></div>
            <div><label className="label">床號</label><input className="input-field" value={form.bed_no} onChange={e => set('bed_no', e.target.value)} /></div>
            <div><label className="label">入住日期</label><input type="date" className="input-field" value={form.admission_date} onChange={e => set('admission_date', e.target.value)} /></div>
            <div><label className="label">退住日期</label><input type="date" className="input-field" value={form.discharge_date} onChange={e => set('discharge_date', e.target.value)} /></div>
            <div><label className="label">緊急聯絡人</label><input className="input-field" value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} /></div>
            <div><label className="label">關係</label><input className="input-field" value={form.emergency_contact_relation} onChange={e => set('emergency_contact_relation', e.target.value)} /></div>
            <div className="col-span-2"><label className="label">緊急聯絡電話</label><input className="input-field" value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} /></div>

            {/* Warning field highlighted */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-orange-700 mb-1 flex items-center gap-1">
                <AlertTriangle size={14} /> 注意事項 / 警告（顯示於住民資料頂部）
              </label>
              <textarea
                className="w-full border-2 border-orange-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50"
                rows={3}
                placeholder="例：有跌倒病史，需特別注意 / 對盤尼西林過敏 / 有攻擊性行為..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
              <p className="text-xs text-orange-500 mt-1">此欄位內容將以警示橙色顯示在住民資料頁頂部</p>
            </div>
          </div>
          {error && <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>
        </div>
      </div>
    </div>
  );
}
