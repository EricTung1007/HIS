import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Send, X, Bot, Loader2, CheckCircle, AlertCircle, Volume2, ArrowLeft, RotateCcw } from 'lucide-react';
import api from '../api/client';
import { Patient } from '../types';

// ---- Types ----------------------------------------------------------------
interface AIResponse {
  understanding: string;
  action: string;
  data: Record<string, any> | null;
  confirmation: string;
  needs_confirm: boolean;
}

// ---- Execute action -------------------------------------------------------
async function executeAction(patientId: string, response: AIResponse) {
  const { action, data } = response;
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const datetimeStr = `${today}T${timeStr}`;

  switch (action) {
    case 'vital_signs':
      await api.post(`/patients/${patientId}/vitals`, { measured_at: datetimeStr, ...data });
      break;
    case 'intake':
      await api.post(`/patients/${patientId}/io`, { record_date: today, record_time: timeStr, type: 'intake', unit: 'mL', ...data });
      break;
    case 'output':
      await api.post(`/patients/${patientId}/io`, { record_date: today, record_time: timeStr, type: 'output', unit: data?.unit || 'mL', ...data });
      break;
    case 'medication_order':
      if (!data?.medication_name) throw new Error('無法辨識藥物名稱');
      await api.post(`/patients/${patientId}/medications`, {
        medication_name: data.medication_name,
        dose: String(data.dose || ''),
        unit: data.unit || 'mg',
        route: data.route || 'PO',
        frequency: data.frequency || 'QD',
        times_per_day: data.times_per_day || '08:00',
        start_date: today,
        indication: data.indication || '',
        status: 'active',
      });
      break;
    case 'mar':
      if (!data?.order_id) throw new Error('找不到對應的用藥醫囑');
      await api.post(`/patients/${patientId}/mar`, { order_id: data.order_id, administered_at: datetimeStr, dose_given: data.dose_given, status: data.status || 'given', notes: data.notes });
      break;
    case 'nursing_note':
      await api.post(`/patients/${patientId}/notes`, { note_datetime: datetimeStr, note_type: data?.note_type || 'narrative', ...data });
      break;
    case 'billing':
      if (!data?.code) throw new Error('無法辨識對應的核銷碼');
      await api.post(`/patients/${patientId}/billing/records`, {
        code: data.code, service_date: today, quantity: data.quantity || 1, notes: data.notes || '',
      });
      break;
    case 'update_patient': {
      const updateFields: Record<string, string> = {};
      if (data?.notes !== undefined) updateFields.notes = data.notes;
      if (data?.care_level !== undefined) updateFields.care_level = data.care_level;
      if (data?.room_no !== undefined) updateFields.room_no = data.room_no;
      if (data?.bed_no !== undefined) updateFields.bed_no = data.bed_no;
      await api.patch(`/patients/${patientId}`, updateFields);
      break;
    }
    case 'family_log':
      await api.post(`/patients/${patientId}/family-logs`, {
        log_date: today,
        extra_notes: data?.extra_notes,
        staff_notes: data?.staff_notes,
      });
      break;
    case 'query':
    case 'unknown':
      break;
    default:
      throw new Error(`未知的動作類型: ${action}`);
  }
}

const ACTION_LABELS: Record<string, string> = {
  vital_signs: '📊 生命徵象', intake: '💧 攝入量', output: '🚿 排出量',
  mar: '💊 給藥記錄', medication_order: '💊+ 新增藥物醫囑', nursing_note: '📝 護理記錄',
  update_patient: '✏️ 更新住民資料', family_log: '📖 聯絡簿補充',
  billing: '💰 核銷碼', query: '🔍 查詢', unknown: '❓ 無法辨識',
};

// ---- Main Component -------------------------------------------------------
export default function MobileSpeak() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'listening' | 'analyzing' | 'confirming' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const interimRef = useRef('');

  useEffect(() => {
    if (!id) return;
    api.get(`/patients/${id}`).then(r => setPatient(r.data)).finally(() => setLoading(false));
  }, [id]);

  // ---- STT Logic ----------------------------------------------------------
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('此瀏覽器不支援語音輸入');
      return;
    }
    setErrorMsg('');
    setAiResponse(null);
    setStatus('listening');
    setInterimText('');
    interimRef.current = '';

    const rec = new SpeechRecognition();
    rec.lang = 'zh-TW';
    rec.continuous = false; 
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      
      const currentInterim = interim || final;
      setInterimText(currentInterim);
      interimRef.current = currentInterim;

      if (final) {
        setInterimText('');
        interimRef.current = '';
        processVoice(final);
      }
    };

    rec.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Only reset to idle if we didn't have any interim text
        if (!interimRef.current) {
          setStatus('idle');
        }
        return;
      }
      setErrorMsg(`語音錯誤: ${event.error}`);
      setStatus('error');
    };

    rec.onend = () => {
      setListening(false);
      listeningRef.current = false;
      
      // If the browser ends the session while we are still 'listening'
      // it means it reached silence or timeout.
      if (status === 'listening') {
        if (interimRef.current.trim()) {
          const textToProcess = interimRef.current;
          setInterimText('');
          interimRef.current = '';
          processVoice(textToProcess);
        } else {
          setStatus('idle');
        }
      }
    };

    recognitionRef.current = rec;
    listeningRef.current = true;
    rec.start();
    setListening(true);
  }, [id, status, patient]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    
    // Process what we have so far if it hasn't been finalized
    if (interimRef.current.trim()) {
      const textToProcess = interimRef.current;
      setInterimText('');
      interimRef.current = '';
      processVoice(textToProcess);
    } else if (status === 'listening') {
      setStatus('idle');
    }

    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.error('Stop error:', e);
    }
    recognitionRef.current = null;
    setListening(false);
  }, [status]);

  const processVoice = async (text: string) => {
    if (!text.trim() || !id) return;
    setStatus('analyzing');
    setProcessing(true);
    try {
      const { data } = await api.post(`/patients/${id}/ai/chat`, { message: text });
      setAiResponse(data as AIResponse);
      setStatus('confirming');

      // Play audio confirmation
      if (data && (data as AIResponse).confirmation) {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance((data as AIResponse).confirmation);
        utterance.lang = 'zh-TW';
        utterance.rate = 1.1; 
        synth.speak(utterance);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'AI 分析失敗');
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  const confirmAction = async () => {
    if (!aiResponse || !id) return;
    setStatus('analyzing');
    try {
      await executeAction(id, aiResponse);
      setStatus('done');
      setTimeout(() => navigate(`/patients/${id}`), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || '執行失敗');
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setAiResponse(null);
    setErrorMsg('');
    setInterimText('');
    interimRef.current = '';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">載入中...</div>;
  if (!patient) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">找不到住民資料</div>;

  return (
    <div className="h-[100dvh] w-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate(`/patients/${id}`)} className="p-2 -ml-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{patient.name}</h1>
          <p className="text-xs text-gray-500">{patient.room_no} 房 {patient.bed_no} 床</p>
        </div>
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
          <Bot size={20} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-y-auto">
        
        {/* Status Icon / Feedback */}
        <div className="relative mb-6">
          {status === 'idle' && (
             <div className="w-28 h-28 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
               <Mic size={40} />
             </div>
          )}
          {status === 'listening' && (
            <>
              <div className="w-28 h-28 bg-red-100 rounded-full flex items-center justify-center text-red-600 animate-pulse">
                <Mic size={40} />
              </div>
              <div className="absolute inset-0 w-28 h-28 border-4 border-red-400 rounded-full animate-ping opacity-25"></div>
            </>
          )}
          {status === 'analyzing' && (
            <div className="w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Loader2 size={40} className="animate-spin" />
            </div>
          )}
          {status === 'confirming' && (
            <div className="w-28 h-28 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
              <Bot size={40} />
            </div>
          )}
          {status === 'done' && (
            <div className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle size={40} />
            </div>
          )}
          {status === 'error' && (
            <div className="w-28 h-28 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <AlertCircle size={40} />
            </div>
          )}
        </div>

        {/* Message Area */}
        <div className="w-full max-w-sm text-center flex flex-col justify-center min-h-[100px]">
          {status === 'idle' && (
            <p className="text-lg font-medium text-gray-500">點擊下方按鈕開始說話</p>
          )}
          {status === 'listening' && (
            <div className="space-y-1">
              <p className="text-lg font-medium text-red-600">正在聆聽...</p>
              <p className="text-gray-400 italic text-base">"{interimText || '請說話'}"</p>
            </div>
          )}
          {status === 'analyzing' && (
            <p className="text-lg font-medium text-blue-600">AI 正在分析您的指令...</p>
          )}
          {status === 'confirming' && aiResponse && (
            <div className="space-y-3">
              <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-700">
                {ACTION_LABELS[aiResponse.action] || aiResponse.action}
              </div>
              <p className="text-xl font-bold text-gray-900 leading-tight">
                {aiResponse.confirmation}
              </p>
              <p className="text-sm text-gray-500 italic">"{aiResponse.understanding}"</p>
            </div>
          )}
          {status === 'done' && (
            <div className="space-y-1">
              <p className="text-xl font-bold text-green-600">記錄成功！</p>
              <p className="text-sm text-gray-500">正在回到住民頁面...</p>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-1">
              <p className="text-lg font-bold text-red-600">發生錯誤</p>
              <p className="text-sm text-gray-500">{errorMsg}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="px-6 py-6 pb-safe bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl shrink-0">
        {status === 'confirming' ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={confirmAction}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-lg font-bold shadow-lg shadow-green-100 flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} /> 確認記錄
            </button>
            <button
              onClick={reset}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl text-base font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} /> 重說一次 / 取消
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {status === 'idle' || status === 'error' || status === 'done' ? (
              <button
                onClick={startListening}
                className="w-20 h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-200 flex items-center justify-center transition-transform active:scale-95"
              >
                <Mic size={36} />
              </button>
            ) : status === 'listening' ? (
              <button
                onClick={stopListening}
                className="w-20 h-20 bg-red-500 text-white rounded-full shadow-2xl shadow-red-100 flex items-center justify-center animate-pulse"
              >
                <MicOff size={36} />
              </button>
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                <Loader2 size={36} className="animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Examples for Idle State (Bottom Bar) */}
      {status === 'idle' && (
        <div className="px-4 py-3 bg-white border-t border-gray-50 flex gap-2 overflow-x-auto no-scrollbar shrink-0 pb-safe">
          {[
            '血壓120/80',
            '喝水200cc',
            '尿了300cc',
            '已給藥',
          ].map(ex => (
            <button
              key={ex}
              onClick={() => processVoice(ex)}
              className="shrink-0 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-600 shadow-sm whitespace-nowrap"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
