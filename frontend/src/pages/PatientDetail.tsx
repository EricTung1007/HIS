import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Phone, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { Patient } from '../types';
import MedicalHistoryTab from './tabs/MedicalHistory';
import MedicationsTab from './tabs/Medications';
import MARTab from './tabs/MAR';
import IntakeOutputTab from './tabs/IntakeOutput';
import VitalSignsTab from './tabs/VitalSigns';
import PhysicalExamTab from './tabs/PhysicalExam';
import NursingNotesTab from './tabs/NursingNotes';

const TABS = [
  { id: 'history', label: '病史記錄' },
  { id: 'medications', label: '用藥醫囑' },
  { id: 'mar', label: '用藥記錄(MAR)' },
  { id: 'io', label: '出入量' },
  { id: 'vitals', label: '生命徵象' },
  { id: 'pe', label: '身體評估' },
  { id: 'notes', label: '護理記錄' },
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
  const activeTab = tab || 'history';

  useEffect(() => {
    if (!id) return;
    api.get(`/patients/${id}`).then(r => setPatient(r.data)).finally(() => setLoading(false));
  }, [id]);

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${patient.gender === 'F' ? 'bg-pink-400' : 'bg-blue-500'}`}>
            {patient.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
              <span className="text-sm text-gray-500">({patient.patient_no})</span>
              <span className="badge-active">{patient.care_level}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${patient.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                {patient.gender === 'F' ? '女' : '男'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
              <span className="flex items-center gap-1"><Calendar size={13} className="text-gray-400" />{patient.birth_date} ({calcAge(patient.birth_date)}歲)</span>
              <span className="flex items-center gap-1"><User size={13} className="text-gray-400" />血型：{patient.blood_type || '不詳'}</span>
              {patient.room_no && <span>房號：{patient.room_no} / 床號：{patient.bed_no}</span>}
              {patient.nhi_no && <span>健保號：{patient.nhi_no}</span>}
              <span>入住：{patient.admission_date}</span>
            </div>
            {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
              <div className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                <Phone size={13} className="text-gray-400" />
                緊急聯絡：{patient.emergency_contact_name}（{patient.emergency_contact_relation}）{patient.emergency_contact_phone}
              </div>
            )}
            {patient.notes && (
              <div className="mt-2 flex items-start gap-1 text-sm text-orange-600 bg-orange-50 rounded-md px-3 py-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {patient.notes}
              </div>
            )}
          </div>
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
        </div>
      </div>
    </div>
  );
}
