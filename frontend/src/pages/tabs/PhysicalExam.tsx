import { useEffect, useState } from 'react';
import { Plus, Eye, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/client';
import { PhysicalExam } from '../../types';

const CONSCIOUSNESS_OPTS = ['清醒(Alert)', '嗜睡(Drowsy)', '模糊(Confused)', '昏睡(Stupor)', '昏迷(Coma)'];

function calcMorse(pe: Partial<PhysicalExam>) {
  return (pe.morse_fall_history || 0) + (pe.morse_secondary_diagnosis || 0) +
    (pe.morse_ambulatory_aid || 0) + (pe.morse_iv || 0) +
    (pe.morse_gait || 0) + (pe.morse_mental_status || 0);
}

function calcBraden(pe: Partial<PhysicalExam>) {
  return (pe.braden_sensory || 4) + (pe.braden_moisture || 4) + (pe.braden_activity || 4) +
    (pe.braden_mobility || 4) + (pe.braden_nutrition || 4) + (pe.braden_friction || 3);
}

function morseFallRisk(score: number) {
  if (score < 25) return { label: '低風險', cls: 'badge-active' };
  if (score < 50) return { label: '中度風險', cls: 'badge-warning' };
  return { label: '高度風險', cls: 'badge-danger' };
}

function bradenRisk(score: number) {
  if (score >= 19) return { label: '無風險', cls: 'badge-active' };
  if (score >= 15) return { label: '輕度風險', cls: 'badge-warning' };
  if (score >= 13) return { label: '中度風險', cls: 'badge-warning' };
  return { label: '高度風險', cls: 'badge-danger' };
}

export default function PhysicalExamTab({ patientId }: { patientId: string }) {
  const [exams, setExams] = useState<PhysicalExam[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editExam, setEditExam] = useState<PhysicalExam | null>(null);
  const [viewExam, setViewExam] = useState<PhysicalExam | null>(null);

  const load = () => {
    api.get(`/patients/${patientId}/pe`).then(r => setExams(r.data));
  };
  useEffect(() => { load(); }, [patientId]);

  const del = async (id: number) => {
    if (!confirm('確定刪除此評估記錄？')) return;
    await api.delete(`/patients/${patientId}/pe/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">身體評估 (PE Sheet)</h3>
        <button onClick={() => { setEditExam(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-xs"><Plus size={14} />新增評估</button>
      </div>

      <div className="space-y-3">
        {exams.map(exam => {
          const morse = calcMorse(exam);
          const braden = calcBraden(exam);
          const mRisk = morseFallRisk(morse);
          const bRisk = bradenRisk(braden);
          return (
            <div key={exam.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-semibold text-gray-800">{exam.exam_date}</div>
                  <span className="text-xs text-gray-500">意識：{exam.consciousness || '-'}</span>
                  <div className="flex items-center gap-2">
                    <span className={mRisk.cls + ' text-xs'}>跌倒風險：{mRisk.label} ({morse})</span>
                    <span className={bRisk.cls + ' text-xs'}>壓傷風險：{bRisk.label} ({braden})</span>
                  </div>
                  <span className="text-xs text-gray-400">評估者：{exam.examiner_name || '-'}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewExam(exam)} className="btn-secondary text-xs py-1 flex items-center gap-1"><Eye size={12} />查看</button>
                  <button onClick={() => { setEditExam(exam); setShowForm(true); }} className="btn-secondary text-xs py-1 flex items-center gap-1"><Edit2 size={12} />編輯</button>
                  <button onClick={() => del(exam.id)} className="text-red-400 hover:text-red-600 px-2"><Trash2 size={13} /></button>
                </div>
              </div>
              {exam.additional_notes && (
                <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">{exam.additional_notes}</div>
              )}
            </div>
          );
        })}
        {exams.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">無身體評估記錄</div>}
      </div>

      {showForm && <PEFormModal patientId={patientId} exam={editExam} onClose={() => { setShowForm(false); setEditExam(null); }} onSaved={load} />}
      {viewExam && <PEViewModal exam={viewExam} onClose={() => setViewExam(null)} />}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 bg-blue-50 text-blue-800 font-medium text-sm hover:bg-blue-100 transition-colors">
        {title}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function PEFormModal({ patientId, exam, onClose, onSaved }: {
  patientId: string; exam?: PhysicalExam | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<PhysicalExam>>(exam || {
    exam_date: new Date().toISOString().split('T')[0],
    consciousness: 'Alert', morse_fall_history: 0, morse_secondary_diagnosis: 0,
    morse_ambulatory_aid: 0, morse_iv: 0, morse_gait: 0, morse_mental_status: 0,
    braden_sensory: 4, braden_moisture: 4, braden_activity: 4,
    braden_mobility: 4, braden_nutrition: 4, braden_friction: 3,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const setN = (k: string, v: string) => setForm(f => ({ ...f, [k]: v === '' ? null : parseInt(v) }));

  const save = async () => {
    setSaving(true);
    try {
      if (exam) await api.put(`/patients/${patientId}/pe/${exam.id}`, form);
      else await api.post(`/patients/${patientId}/pe`, form);
      onSaved(); onClose();
    } catch { } finally { setSaving(false); }
  };

  const morseTotal = calcMorse(form);
  const bradenTotal = calcBraden(form);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold">身體評估表 (PE Sheet)</h3>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={onClose}>取消</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {/* Basic */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div><label className="label">評估日期</label><input type="date" className="input-field" value={form.exam_date || ''} onChange={e => set('exam_date', e.target.value)} /></div>
            <div><label className="label">意識狀態</label>
              <select className="input-field" value={form.consciousness || ''} onChange={e => set('consciousness', e.target.value)}>
                {CONSCIOUSNESS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><label className="label">GCS 眼(1-4)</label><input type="number" min="1" max="4" className="input-field" value={form.gcs_eye || ''} onChange={e => setN('gcs_eye', e.target.value)} /></div>
            <div><label className="label">GCS 語言(1-5)</label><input type="number" min="1" max="5" className="input-field" value={form.gcs_verbal || ''} onChange={e => setN('gcs_verbal', e.target.value)} /></div>
            <div><label className="label">GCS 動作(1-6)</label><input type="number" min="1" max="6" className="input-field" value={form.gcs_motor || ''} onChange={e => setN('gcs_motor', e.target.value)} /></div>
            <div className="md:col-span-3"><label className="label">一般外觀</label><input className="input-field" value={form.general_appearance || ''} onChange={e => set('general_appearance', e.target.value)} placeholder="外觀良好/虛弱/..." /></div>
          </div>

          <Section title="HEENT (頭頸部)">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['head','頭部'],['eyes','眼睛'],['ears','耳朵'],['nose','鼻子'],['throat','咽喉'],['neck','頸部'],['lymph_nodes','淋巴結']].map(([k,l]) => (
                <div key={k}><label className="label text-xs">{l}</label><input className="input-field text-sm" value={(form as any)[k] || ''} onChange={e => set(k, e.target.value)} placeholder="正常" /></div>
              ))}
            </div>
          </Section>

          <Section title="胸部/心臟">
            <div className="grid grid-cols-2 gap-3">
              {[['chest_inspection','胸部視診'],['breath_sounds','呼吸音'],['respiratory_pattern','呼吸型態'],['heart_sounds','心音'],['peripheral_pulses','周邊脈搏'],['edema','水腫']].map(([k,l]) => (
                <div key={k}><label className="label text-xs">{l}</label><input className="input-field text-sm" value={(form as any)[k] || ''} onChange={e => set(k, e.target.value)} placeholder="正常" /></div>
              ))}
            </div>
          </Section>

          <Section title="腹部">
            <div className="grid grid-cols-2 gap-3">
              {[['abdomen_inspection','腹部視診'],['bowel_sounds','腸音'],['abdomen_palpation','腹部觸診']].map(([k,l]) => (
                <div key={k}><label className="label text-xs">{l}</label><input className="input-field text-sm" value={(form as any)[k] || ''} onChange={e => set(k, e.target.value)} placeholder="正常" /></div>
              ))}
            </div>
          </Section>

          <Section title="肌肉骨骼/皮膚">
            <div className="grid grid-cols-2 gap-3">
              {[['muscle_strength','肌肉力量'],['range_of_motion','關節活動度'],['mobility','行動能力'],['skin_color','皮膚顏色'],['skin_integrity','皮膚完整性'],['wounds','傷口'],['pressure_injuries','壓傷']].map(([k,l]) => (
                <div key={k}><label className="label text-xs">{l}</label><input className="input-field text-sm" value={(form as any)[k] || ''} onChange={e => set(k, e.target.value)} placeholder="正常" /></div>
              ))}
            </div>
          </Section>

          <Section title="神經/排泄">
            <div className="grid grid-cols-2 gap-3">
              {[['orientation','定向感(人/事/地)'],['memory','記憶力'],['speech','語言/言語'],['urinary','排尿情形'],['bowel_pattern','排便型態']].map(([k,l]) => (
                <div key={k}><label className="label text-xs">{l}</label><input className="input-field text-sm" value={(form as any)[k] || ''} onChange={e => set(k, e.target.value)} placeholder="正常" /></div>
              ))}
            </div>
          </Section>

          {/* Morse Fall Scale */}
          <Section title={`跌倒風險評估 — Morse Fall Scale (總分：${morseTotal} — ${morseFallRisk(morseTotal).label})`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">跌倒史 (0=無, 25=有)</label>
                <select className="input-field" value={form.morse_fall_history ?? 0} onChange={e => set('morse_fall_history', parseInt(e.target.value))}>
                  <option value={0}>0 — 無跌倒史</option><option value={25}>25 — 有跌倒史</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">次要診斷 (0=無, 15=有)</label>
                <select className="input-field" value={form.morse_secondary_diagnosis ?? 0} onChange={e => set('morse_secondary_diagnosis', parseInt(e.target.value))}>
                  <option value={0}>0 — 無</option><option value={15}>15 — 有</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">行走輔具</label>
                <select className="input-field" value={form.morse_ambulatory_aid ?? 0} onChange={e => set('morse_ambulatory_aid', parseInt(e.target.value))}>
                  <option value={0}>0 — 不需要/臥床/輪椅/護理師協助</option>
                  <option value={15}>15 — 拐杖/手杖/助行器</option>
                  <option value={30}>30 — 扶家具行走</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">靜脈注射 (0=無, 20=有)</label>
                <select className="input-field" value={form.morse_iv ?? 0} onChange={e => set('morse_iv', parseInt(e.target.value))}>
                  <option value={0}>0 — 無</option><option value={20}>20 — 有</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">步態</label>
                <select className="input-field" value={form.morse_gait ?? 0} onChange={e => set('morse_gait', parseInt(e.target.value))}>
                  <option value={0}>0 — 正常/臥床/不動</option>
                  <option value={10}>10 — 虛弱</option>
                  <option value={20}>20 — 功能損傷</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">精神狀態</label>
                <select className="input-field" value={form.morse_mental_status ?? 0} onChange={e => set('morse_mental_status', parseInt(e.target.value))}>
                  <option value={0}>0 — 了解自身限制</option>
                  <option value={15}>15 — 高估/忘記限制</option>
                </select>
              </div>
            </div>
            <div className={`mt-3 p-3 rounded-lg text-center font-semibold ${morseFallRisk(morseTotal).cls}`}>
              跌倒風險總分：{morseTotal} — {morseFallRisk(morseTotal).label}
              <span className="text-xs font-normal ml-2">(低危 &lt;25, 中危 25-49, 高危 ≥50)</span>
            </div>
          </Section>

          {/* Braden Scale */}
          <Section title={`壓傷風險評估 — Braden Scale (總分：${bradenTotal} — ${bradenRisk(bradenTotal).label})`}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label text-xs">感覺知覺 (1-4)</label>
                <select className="input-field" value={form.braden_sensory ?? 4} onChange={e => set('braden_sensory', parseInt(e.target.value))}>
                  <option value={1}>1 — 完全缺失</option><option value={2}>2 — 非常受限</option>
                  <option value={3}>3 — 輕度受限</option><option value={4}>4 — 無受損</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">潮濕度 (1-4)</label>
                <select className="input-field" value={form.braden_moisture ?? 4} onChange={e => set('braden_moisture', parseInt(e.target.value))}>
                  <option value={1}>1 — 持續潮濕</option><option value={2}>2 — 非常潮濕</option>
                  <option value={3}>3 — 偶爾潮濕</option><option value={4}>4 — 很少潮濕</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">活動力 (1-4)</label>
                <select className="input-field" value={form.braden_activity ?? 4} onChange={e => set('braden_activity', parseInt(e.target.value))}>
                  <option value={1}>1 — 臥床</option><option value={2}>2 — 限制椅子</option>
                  <option value={3}>3 — 偶爾行走</option><option value={4}>4 — 經常行走</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">移動力 (1-4)</label>
                <select className="input-field" value={form.braden_mobility ?? 4} onChange={e => set('braden_mobility', parseInt(e.target.value))}>
                  <option value={1}>1 — 完全無法移動</option><option value={2}>2 — 非常受限</option>
                  <option value={3}>3 — 輕微受限</option><option value={4}>4 — 無限制</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">營養 (1-4)</label>
                <select className="input-field" value={form.braden_nutrition ?? 4} onChange={e => set('braden_nutrition', parseInt(e.target.value))}>
                  <option value={1}>1 — 非常差</option><option value={2}>2 — 可能不足</option>
                  <option value={3}>3 — 足夠</option><option value={4}>4 — 非常好</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">摩擦力/剪力 (1-3)</label>
                <select className="input-field" value={form.braden_friction ?? 3} onChange={e => set('braden_friction', parseInt(e.target.value))}>
                  <option value={1}>1 — 有問題</option><option value={2}>2 — 潛在問題</option>
                  <option value={3}>3 — 無明顯問題</option>
                </select>
              </div>
            </div>
            <div className={`mt-3 p-3 rounded-lg text-center font-semibold ${bradenRisk(bradenTotal).cls}`}>
              壓傷風險總分：{bradenTotal} — {bradenRisk(bradenTotal).label}
              <span className="text-xs font-normal ml-2">(≥19無風險, 15-18輕度, 13-14中度, ≤12高度)</span>
            </div>
          </Section>

          <div><label className="label">其他說明</label><textarea className="input-field" rows={3} value={form.additional_notes || ''} onChange={e => set('additional_notes', e.target.value)} /></div>
        </div>
      </div>
    </div>
  );
}

function PEViewModal({ exam, onClose }: { exam: PhysicalExam; onClose: () => void }) {
  const morse = calcMorse(exam);
  const braden = calcBraden(exam);
  const fields: [string, string, any][] = [
    ['consciousness','意識狀態', exam.consciousness],
    ['gcs','GCS', exam.gcs_eye ? `眼${exam.gcs_eye}/語${exam.gcs_verbal}/動${exam.gcs_motor}` : '-'],
    ['general_appearance','一般外觀', exam.general_appearance],
    ['head','頭部', exam.head], ['eyes','眼睛', exam.eyes], ['ears','耳朵', exam.ears],
    ['throat','咽喉', exam.throat], ['neck','頸部', exam.neck],
    ['breath_sounds','呼吸音', exam.breath_sounds], ['heart_sounds','心音', exam.heart_sounds],
    ['edema','水腫', exam.edema], ['bowel_sounds','腸音', exam.bowel_sounds],
    ['muscle_strength','肌肉力量', exam.muscle_strength],
    ['mobility','行動能力', exam.mobility], ['skin_integrity','皮膚', exam.skin_integrity],
    ['pressure_injuries','壓傷', exam.pressure_injuries],
    ['orientation','定向感', exam.orientation], ['urinary','排尿', exam.urinary],
    ['bowel_pattern','排便', exam.bowel_pattern],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold">身體評估 — {exam.exam_date}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3">
          <div className="flex gap-3">
            <span className={morseFallRisk(morse).cls}>跌倒風險：{morseFallRisk(morse).label} ({morse}分)</span>
            <span className={bradenRisk(braden).cls}>壓傷風險：{bradenRisk(braden).label} ({braden}分)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {fields.map(([, label, value]) => value ? (
              <div key={label} className="flex gap-2">
                <span className="text-gray-500 shrink-0">{label}：</span>
                <span className="text-gray-900">{value}</span>
              </div>
            ) : null)}
          </div>
          {exam.additional_notes && <div className="text-sm"><span className="text-gray-500">其他說明：</span>{exam.additional_notes}</div>}
          <div className="text-xs text-gray-400">評估者：{exam.examiner_name || '-'}</div>
        </div>
      </div>
    </div>
  );
}
