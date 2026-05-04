import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send, X, Bot, Loader2, CheckCircle, AlertCircle, Volume2, Settings, ChevronDown } from 'lucide-react';
import api from '../api/client';

// ---- Types ----------------------------------------------------------------
interface AIResponse {
  understanding: string;
  action: string;
  data: Record<string, any> | null;
  confirmation: string;
  needs_confirm: boolean;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  text: string;
  response?: AIResponse;
  status?: 'pending' | 'done' | 'error';
}

interface Props {
  patientId: string;
  patientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionExecuted?: () => void;
}

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
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
      if (!data?.order_id) throw new Error('找不到對應的用藥醫囑，請至用藥記錄頁面手動記錄');
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
      if (Object.keys(updateFields).length === 0) throw new Error('沒有要更新的欄位');
      await api.patch(`/patients/${patientId}`, updateFields);
      break;
    }
    case 'family_log': {
      await api.post(`/patients/${patientId}/family-logs`, {
        log_date: today,
        extra_notes: data?.extra_notes,
        staff_notes: data?.staff_notes,
      });
      break;
    }
    case 'add_allergy': {
      await api.post(`/patients/${patientId}/allergies`, data);
      break;
    }
    case 'add_diagnosis': {
      await api.post(`/patients/${patientId}/diagnoses`, { diagnosis_date: today, ...data });
      break;
    }
    case 'physical_exam': {
      await api.post(`/patients/${patientId}/pe`, { exam_date: today, ...data });
      break;
    }
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
  billing: '💰 核銷碼', add_allergy: '⚠️ 新增過敏', add_diagnosis: '🩺 新增診斷',
  physical_exam: '🏥 身體評估', query: '🔍 查詢', unknown: '❓ 無法辨識',
};
const ACTION_COLORS: Record<string, string> = {
  vital_signs: 'bg-red-50 border-red-200 text-red-700',
  intake: 'bg-blue-50 border-blue-200 text-blue-700',
  output: 'bg-orange-50 border-orange-200 text-orange-700',
  mar: 'bg-green-50 border-green-200 text-green-700',
  medication_order: 'bg-teal-50 border-teal-200 text-teal-700',
  nursing_note: 'bg-purple-50 border-purple-200 text-purple-700',
  update_patient: 'bg-amber-50 border-amber-200 text-amber-700',
  family_log: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  billing: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  add_allergy: 'bg-rose-50 border-rose-200 text-rose-700',
  add_diagnosis: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  physical_exam: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
  query: 'bg-gray-50 border-gray-200 text-gray-700',
  unknown: 'bg-gray-50 border-gray-200 text-gray-400',
};

const EXAMPLES = [
  { label: '血壓148/88', text: '血壓148/88' },
  { label: '心跳78', text: '心跳78次' },
  { label: '體溫37.2', text: '體溫37.2度' },
  { label: '喝水200cc', text: '喝了200cc的水' },
  { label: '尿了300cc', text: '尿了300cc' },
  { label: '已給藥', text: '已給早上的藥' },
  { label: '護理記錄', text: '住民情緒穩定，無不適主訴' },
  { label: '⚠️過敏', text: '新增過敏：青黴素，會起紅疹' },
  { label: '💰洗澡洗頭', text: '幫住民洗澡洗頭' },
  { label: '💰翻身拍背', text: '翻身拍背' },
  { label: '💰協助進食', text: '協助進食' },
];

// ---- Main Component -------------------------------------------------------
export default function AIAssistant({ patientId, patientName, open, onOpenChange, onActionExecuted }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      text: `歡迎使用 AI 護理助理！\n\n您可以用「語音」或「文字」輸入照護動作，AI 會自動解析並寫入系統。\n\n支援的記錄類型：\n📊 生命徵象（血壓、心跳、體溫、血氧...）\n💧 攝入量（喝水、管灌、點滴...）\n🚽 排出量（尿液、糞便...）\n💊 給藥記錄（MAR）\n📝 護理記錄\n💰 核銷碼（描述服務內容即可自動對碼）`,
    },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [apiKey] = useState(() => localStorage.getItem('his_ai_key') || '');
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [sttSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [interimText, setInterimText] = useState('');

  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const interimRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Accumulated conversation turns sent to backend for context
  const conversationHistory = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText]);

  // Check API key on open; stop STT on close
  useEffect(() => {
    if (open) {
      api.get('/ai/status').then(r => {
        if (!r.data.configured) setShowKeyWarning(true);
        else setShowKeyWarning(false);
      }).catch(() => {});
    } else {
      listeningRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      setInterimText('');
      interimRef.current = '';
      conversationHistory.current = [];
    }
  }, [open]);

  // ---- STT ----------------------------------------------------------------
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'zh-TW';
    rec.continuous = true;
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
        setInput(prev => (prev + ' ' + final).trim()); 
        setInterimText(''); 
        interimRef.current = '';
      }
    };
    rec.onerror = (event: any) => {
      // 'no-speech' is harmless — just means silence, keep going
      if (event.error === 'no-speech') return;
      setListening(false);
      setInterimText('');
      interimRef.current = '';
    };
    rec.onend = () => {
      // Auto-restart if still supposed to be listening (browser stops after ~60s)
      if (recognitionRef.current === rec && listeningRef.current) {
        try { rec.start(); } catch (_) { setListening(false); setInterimText(''); interimRef.current = ''; }
      } else {
        setListening(false);
        setInterimText('');
        interimRef.current = '';
      }
    };
    recognitionRef.current = rec;
    listeningRef.current = true;
    rec.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    
    // If there's interim text, append it to input before stopping
    if (interimRef.current.trim()) {
      setInput(prev => (prev + ' ' + interimRef.current).trim());
    }

    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.error('Stop error:', e);
    }
    recognitionRef.current = null;
    setListening(false);
    setInterimText('');
    interimRef.current = '';
  }, []);

  // ---- Send ---------------------------------------------------------------
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || processing) return;
    setInput('');
    setInterimText('');
    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setProcessing(true);

    // Append user turn to history before sending
    conversationHistory.current = [
      ...conversationHistory.current,
      { role: 'user', content: trimmed },
    ];

    try {
      const { data } = await api.post(
        `/patients/${patientId}/ai/chat`,
        {
          message: trimmed,
          // Send last 10 turns for context (skip the turn we just added)
          history: conversationHistory.current.slice(0, -1),
        },
        apiKey ? { headers: { 'x-api-key': apiKey } } : {}
      );
      const aiResp = data as AIResponse;

      // Always require confirmation — never auto-execute
      const assistantMsg: Message = {
        role: 'assistant',
        text: aiResp.confirmation,
        response: aiResp,
        status: aiResp.action === 'unknown' || aiResp.action === 'query' ? 'done' : 'pending',
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Append assistant turn to history so next message has context
      conversationHistory.current = [
        ...conversationHistory.current,
        { role: 'assistant', content: `${aiResp.understanding} → ${aiResp.confirmation}` },
      ];

      // Keep history bounded to last 20 turns
      if (conversationHistory.current.length > 20) {
        conversationHistory.current = conversationHistory.current.slice(-20);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || '發生錯誤，請稍後再試';
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${errMsg}`, status: 'error' }]);
    } finally {
      setProcessing(false);
    }
  }, [patientId, apiKey, processing]);

  const confirmAction = async (msg: Message, idx: number) => {
    if (!msg.response) return;
    try {
      await executeAction(patientId, msg.response);
      setMessages(prev => prev.map((m, i) => i === idx ? { ...m, status: 'done' } : m));
      onActionExecuted?.();
    } catch (err: any) {
      setMessages(prev => prev.map((m, i) => i === idx ? { ...m, status: 'error', text: err.message } : m));
    }
  };

  if (!open) return null;

  // ---- Render -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-end sm:justify-end p-0 sm:p-4">
      {/* Backdrop (mobile full-screen) */}
      <div className="absolute inset-0 bg-black/40 sm:hidden" onClick={() => onOpenChange(false)} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
        style={{ height: '85vh', maxHeight: '680px' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl shrink-0">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm">AI 語音護理助理</div>
            <div className="text-blue-200 text-xs truncate">住民：{patientName}</div>
          </div>
          <button onClick={() => onOpenChange(false)} className="text-white/70 hover:text-white p-1 rounded">
            <X size={20} />
          </button>
        </div>

        {/* API Key warning */}
        {showKeyWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 shrink-0">
            <AlertCircle size={14} className="text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700 flex-1">尚未設定 OpenAI API Key</span>
            <a href="/settings" className="text-xs text-blue-600 underline whitespace-nowrap" onClick={() => onOpenChange(false)}>
              前往設定 →
            </a>
          </div>
        )}

        {/* STT not supported warning */}
        {!sttSupported && (
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2 shrink-0">
            <MicOff size={13} className="text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500">此瀏覽器不支援語音輸入，請改用 Safari（iOS）或 Chrome</span>
          </div>
        )}

        {/* How to use — collapsible */}
        <HowToUseBar />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.role === 'system' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700 whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm max-w-[82%] leading-relaxed">
                    {msg.text}
                  </div>
                </div>
              )}
              {msg.role === 'assistant' && (
                <div className="space-y-1.5 max-w-[88%]">
                  {msg.response?.understanding && (
                    <div className="text-xs text-gray-400 pl-1 italic">"{msg.response.understanding}"</div>
                  )}
                  {msg.response && msg.response.action !== 'unknown' && (
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${ACTION_COLORS[msg.response.action] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      {ACTION_LABELS[msg.response.action] || msg.response.action}
                    </span>
                  )}
                  <div className={`rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm leading-relaxed ${
                    msg.status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {msg.text}
                    {msg.status === 'done' && (
                      <div className="flex items-center gap-1 text-green-600 text-xs mt-1.5 font-medium">
                        <CheckCircle size={12} /> 已成功寫入系統記錄
                      </div>
                    )}
                  </div>
                  {msg.status === 'pending' && msg.response && msg.response.action !== 'query' && msg.response.action !== 'unknown' && (
                    <div className="flex gap-2 pl-1 pt-1">
                      <button onClick={() => confirmAction(msg, idx)}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-full hover:bg-green-700 flex items-center gap-1 font-medium">
                        <CheckCircle size={11} /> 確認執行
                      </button>
                      <button onClick={() => setMessages(prev => prev.map((m, i) => i === idx ? { ...m, status: 'error', text: '已取消' } : m))}
                        className="text-xs bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-300">
                        取消
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {processing && (
            <div className="flex items-center gap-2 text-sm text-gray-400 pl-1">
              <Loader2 size={14} className="animate-spin" />
              <span>AI 分析中...</span>
            </div>
          )}
          {interimText && (
            <div className="flex justify-end">
              <div className="bg-blue-100 text-blue-500 rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm max-w-[82%] italic opacity-80">
                {interimText}...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick examples */}
        <div className="px-3 pt-2 flex gap-1.5 flex-wrap shrink-0">
          {EXAMPLES.map(ex => (
            <button key={ex.label} onClick={() => sendMessage(ex.text)} disabled={processing}
              className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 border border-gray-200 hover:border-blue-200 px-2 py-1 rounded-full transition-colors disabled:opacity-40">
              {ex.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 shrink-0">
          {listening && (
            <div className="flex items-center gap-2 text-xs text-red-500 mb-2 animate-pulse font-medium">
              <Volume2 size={13} /> 正在聆聽，請說話...
            </div>
          )}
          <div className="flex items-center gap-2">
            {sttSupported ? (
              <button onClick={listening ? stopListening : startListening} disabled={processing}
                className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all font-medium
                  ${listening ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-110' : 'bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 disabled:opacity-40'}`}
                title={listening ? '停止' : '語音輸入'}>
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            ) : (
              <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-gray-100 text-gray-300">
                <MicOff size={18} />
              </div>
            )}
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
              placeholder={sttSupported ? "說話或輸入照護動作..." : "輸入照護動作..."}
              className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 disabled:opacity-50"
              disabled={processing}
            />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || processing}
              className="flex-shrink-0 w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {processing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- How to use collapsible -----------------------------------------------
function HowToUseBar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
        <span className="font-medium flex items-center gap-1.5">
          <Settings size={12} /> 使用說明 &amp; 指令範例
        </span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50">
          {[
            ['📊 生命徵象', '"血壓148/88，心跳78"'],
            ['💧 攝入量', '"喝了200cc的水"'],
            ['🚽 排出量', '"尿了300cc"'],
            ['💊 給藥 (MAR)', '"已給Metformin"'],
            ['📝 護理記錄', '"住民情緒穩定"'],
            ['🌡️ 體溫', '"體溫37.2度"'],
          ].map(([cat, ex]) => (
            <div key={cat}>
              <span className="font-medium">{cat}</span>
              <div className="text-gray-400 mt-0.5">{ex}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
