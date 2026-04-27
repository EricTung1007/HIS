import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, CheckCircle, AlertCircle, Loader2, Bot, LogOut, RotateCcw, LayoutDashboard } from 'lucide-react';
import api from '../api/client';
import { Patient } from '../types';
import { useAuth } from '../contexts/AuthContext';

// ---- Types ----------------------------------------------------------------
interface AIResponse {
  understanding: string;
  action: string;
  data: Record<string, any> | null;
  confirmation: string;
  needs_confirm: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  vital_signs: '📊 生命徵象', intake: '💧 攝入量', output: '🚿 排出量',
  mar: '💊 給藥記錄', medication_order: '💊+ 新增藥物醫囑', nursing_note: '📝 護理記錄',
  update_patient: '✏️ 更新住民資料', family_log: '📖 聯絡簿補充',
  billing: '💰 核銷碼', query: '🔍 查詢', unknown: '❓ 無法辨識',
};

// ---- Main Component -------------------------------------------------------
export default function CaretakerTerminal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'listening' | 'analyzing' | 'confirming' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);

  // Load all patients for the dropdown
  useEffect(() => {
    api.get('/patients').then(r => {
      setPatients(r.data);
      if (r.data.length > 0) {
        setSelectedPatientId(r.data[0].id.toString());
      }
    });
  }, []);

  // Action Executor
  const executeAction = async (patientId: string, response: AIResponse) => {
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
        await api.post(`/patients/${patientId}/medications`, {
          medication_name: data?.medication_name, dose: String(data?.dose || ''), unit: data?.unit || 'mg',
          route: data?.route || 'PO', frequency: data?.frequency || 'QD', times_per_day: data?.times_per_day || '08:00',
          start_date: today, status: 'active',
        });
        break;
      case 'mar':
        if (!data?.order_id) throw new Error('找不到對應的用藥醫囑');
        await api.post(`/patients/${patientId}/mar`, { order_id: data.order_id, administered_at: datetimeStr, dose_given: data.dose_given, status: data.status || 'given' });
        break;
      case 'nursing_note':
        await api.post(`/patients/${patientId}/notes`, { note_datetime: datetimeStr, note_type: data?.note_type || 'narrative', ...data });
        break;
      case 'billing':
        if (!data?.code) throw new Error('無法辨識對應的核銷碼');
        await api.post(`/patients/${patientId}/billing/records`, { code: data.code, service_date: today, quantity: data.quantity || 1 });
        break;
      case 'update_patient': {
        await api.patch(`/patients/${patientId}`, { notes: data?.notes, care_level: data?.care_level });
        break;
      }
      case 'family_log':
        await api.post(`/patients/${patientId}/family-logs`, { log_date: today, extra_notes: data?.extra_notes });
        break;
      case 'query':
      case 'unknown':
        break;
      default:
        throw new Error(`未知的動作類型: ${action}`);
    }
  };

  // ---- STT Logic ----------------------------------------------------------
  const startListening = useCallback(() => {
    if (!selectedPatientId) {
      setErrorMsg('請先選擇房號/住民');
      setStatus('error');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('此瀏覽器不支援語音輸入');
      setStatus('error');
      return;
    }
    
    setErrorMsg('');
    setAiResponse(null);
    setStatus('listening');

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
      setInterimText(interim);
      if (final) {
        setInterimText('');
        processVoice(final);
      }
    };

    rec.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setStatus('idle');
        return;
      }
      setErrorMsg(`語音錯誤: ${event.error}`);
      setStatus('error');
    };

    rec.onend = () => {
      setListening(false);
      listeningRef.current = false;
      if (status === 'listening' && !interimText) {
         setStatus('idle');
      }
    };

    recognitionRef.current = rec;
    listeningRef.current = true;
    rec.start();
    setListening(true);
  }, [status, interimText, selectedPatientId]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const processVoice = async (text: string) => {
    if (!text.trim() || !selectedPatientId) return;
    setStatus('analyzing');
    setProcessing(true);
    try {
      const { data } = await api.post(`/patients/${selectedPatientId}/ai/chat`, { message: text });
      setAiResponse(data as AIResponse);
      setStatus('confirming');

      // Play audio confirmation
      if (data && (data as AIResponse).confirmation) {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance((data as AIResponse).confirmation);
        utterance.lang = 'zh-TW';
        utterance.rate = 1.1; // slightly faster for efficiency
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
    if (!aiResponse || !selectedPatientId) return;
    setStatus('analyzing');
    try {
      await executeAction(selectedPatientId, aiResponse);
      setStatus('done');
      setTimeout(() => reset(), 2500); // Auto reset after success
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
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // UI Render
  return (
    <div className="h-[100dvh] w-screen bg-gray-950 text-white flex flex-col overflow-hidden font-sans">
      
      {/* Top Bar: Minimal dropdown */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-md border-b border-gray-800 shrink-0">
        <select 
          className="bg-gray-800 text-white text-lg font-medium border-none rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-blue-500 appearance-none flex-1 max-w-[250px]"
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          disabled={status !== 'idle' && status !== 'error'}
        >
          {patients.length === 0 && <option value="">無住民資料</option>}
          {patients.map(p => (
            <option key={p.id} value={p.id}>
              {p.room_no ? `${p.room_no} - ` : ''}{p.name}
            </option>
          ))}
        </select>
        
        {user?.role !== 'caretaker' ? (
          <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-500 hover:text-blue-400" title="回到儀表板">
            <LayoutDashboard size={24} />
          </button>
        ) : (
          <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-400" title="登出">
            <LogOut size={24} />
          </button>
        )}
      </div>

      {/* Main Content (Center) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* Dynamic Center UI depending on status */}
        {status === 'confirming' && aiResponse ? (
          <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 mb-6">
              <Bot size={40} />
            </div>
            <div className="inline-block px-3 py-1 bg-amber-500/20 rounded-full text-xs font-bold text-amber-400 mb-4">
              {ACTION_LABELS[aiResponse.action] || aiResponse.action}
            </div>
            <p className="text-3xl font-bold text-white text-center leading-tight mb-4">
              {aiResponse.confirmation}
            </p>
            <p className="text-gray-400 italic text-center mb-12">"{aiResponse.understanding}"</p>
            
            <div className="w-full space-y-4">
              <button
                onClick={confirmAction}
                className="w-full py-5 bg-green-600 hover:bg-green-500 text-white rounded-2xl text-xl font-bold shadow-lg shadow-green-900/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <CheckCircle size={28} /> 確認記錄
              </button>
              <button
                onClick={reset}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl text-lg font-medium flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <RotateCcw size={24} /> 取消
              </button>
            </div>
          </div>
        ) : status === 'done' ? (
           <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mb-6">
                <CheckCircle size={64} />
              </div>
              <p className="text-3xl font-bold text-green-400">記錄成功！</p>
           </div>
        ) : status === 'error' ? (
           <div className="flex flex-col items-center w-full max-w-sm">
              <div className="w-32 h-32 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-6">
                <AlertCircle size={64} />
              </div>
              <p className="text-2xl font-bold text-red-400 text-center mb-2">發生錯誤</p>
              <p className="text-gray-400 text-center mb-12">{errorMsg}</p>
              
              <button
                onClick={reset}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl text-lg font-medium flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                重新開始
              </button>
           </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative mb-8">
              {status === 'listening' && (
                <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping scale-150"></div>
              )}
              <button
                onClick={status === 'listening' ? stopListening : startListening}
                className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95
                  ${status === 'listening' ? 'bg-red-600 shadow-red-900/50' : 
                    status === 'analyzing' ? 'bg-blue-600 shadow-blue-900/50' : 
                    'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'
                  }`}
              >
                {status === 'listening' ? (
                  <MicOff size={80} className="text-white animate-pulse" />
                ) : status === 'analyzing' ? (
                  <Loader2 size={80} className="text-white animate-spin" />
                ) : (
                  <Mic size={80} className="text-white" />
                )}
              </button>
            </div>

            <div className="h-16 flex items-center justify-center text-center px-4">
              {status === 'idle' && (
                <p className="text-xl text-gray-500 font-medium tracking-wide">點擊按鈕說話</p>
              )}
              {status === 'listening' && (
                <p className="text-xl text-white font-medium italic">"{interimText || '正在聆聽...'}"</p>
              )}
              {status === 'analyzing' && (
                <p className="text-xl text-blue-400 font-medium">分析中...</p>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
