import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send, X, Bot, Loader2, CheckCircle, AlertCircle, Volume2, Settings, ChevronDown, Sparkles } from 'lucide-react';
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
    <div className="fixed inset-0 z-[60] flex items-end justify-end sm:items-end sm:justify-end p-0 sm:p-6 font-sans pointer-events-none">
      {/* Backdrop (mobile full-screen) */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm sm:hidden transition-opacity pointer-events-auto" onClick={() => onOpenChange(false)} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:w-[380px] bg-white rounded-t-3xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/60 flex flex-col overflow-hidden pointer-events-auto"
        style={{ height: '75vh', maxHeight: '600px' }}>

        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 bg-slate-900 shrink-0 border-b border-slate-800">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
            <Bot size={22} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm tracking-wide">對話式助理</div>
            <div className="text-slate-400 text-xs truncate mt-0.5 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 住民：{patientName}
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* API Key warning */}
        {showKeyWarning && (
          <div className="bg-rose-50/80 border-b border-rose-100 px-5 py-2.5 flex items-center gap-2.5 shrink-0">
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
            <span className="text-xs font-medium text-rose-800 flex-1">尚未設定 OpenAI API Key</span>
            <a href="/settings" className="text-xs font-bold text-rose-600 hover:text-rose-700 whitespace-nowrap" onClick={() => onOpenChange(false)}>
              前往設定 →
            </a>
          </div>
        )}

        {/* STT not supported warning */}
        {!sttSupported && (
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex items-center gap-2.5 shrink-0">
            <MicOff size={14} className="text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-500">此瀏覽器不支援語音輸入，請改用 Safari 或 Chrome</span>
          </div>
        )}

        {/* How to use — collapsible */}
        <HowToUseBar />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {msg.role === 'system' && (
                <div className="bg-indigo-50/80 border border-indigo-100/60 rounded-2xl p-4 text-xs text-indigo-900 whitespace-pre-wrap leading-relaxed shadow-sm">
                  <div className="font-bold text-indigo-700 mb-2 flex items-center gap-1.5"><Sparkles size={14}/> 系統提示</div>
                  {msg.text}
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[85%] leading-relaxed shadow-sm">
                    {msg.text}
                  </div>
                </div>
              )}
              {msg.role === 'assistant' && (
                <div className="space-y-2 max-w-[90%]">
                  {msg.response?.understanding && (
                    <div className="text-[11px] text-slate-400 pl-1.5 italic font-medium flex items-center gap-1.5">
                      <Bot size={12}/> 解析："{msg.response.understanding}"
                    </div>
                  )}
                  {msg.response && msg.response.action !== 'unknown' && (
                    <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full border font-bold shadow-sm ${ACTION_COLORS[msg.response.action] || 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                      {ACTION_LABELS[msg.response.action] || msg.response.action}
                    </span>
                  )}
                  <div className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed shadow-sm border ${
                    msg.status === 'error' ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-white text-slate-800 border-slate-200/60'
                  }`}>
                    {msg.text}
                    {msg.status === 'done' && msg.response?.action !== 'query' && msg.response?.action !== 'unknown' && (
                      <div className="flex items-center gap-1.5 text-emerald-600 text-xs mt-2 font-bold bg-emerald-50 w-fit px-2 py-1 rounded-md">
                        <CheckCircle size={14} /> 已成功寫入系統
                      </div>
                    )}
                  </div>
                  {msg.status === 'pending' && msg.response && msg.response.action !== 'query' && msg.response.action !== 'unknown' && (
                    <div className="flex gap-2 pl-1 pt-1.5">
                      <button onClick={() => confirmAction(msg, idx)}
                        className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 flex items-center gap-1.5 font-bold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                        <CheckCircle size={14} /> 確認執行
                      </button>
                      <button onClick={() => setMessages(prev => prev.map((m, i) => i === idx ? { ...m, status: 'error', text: '已取消' } : m))}
                        className="text-xs bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 hover:text-slate-900 font-semibold shadow-sm transition-colors">
                        取消
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {processing && (
            <div className="flex items-center gap-2.5 text-sm text-indigo-500 font-medium pl-1.5 animate-pulse">
              <Loader2 size={16} className="animate-spin" />
              <span>AI 分析中...</span>
            </div>
          )}
          {interimText && (
            <div className="flex justify-end">
              <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[85%] italic opacity-70 border border-slate-200 border-dashed">
                {interimText}...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick examples */}
        <div className="px-4 pt-3 pb-1 flex gap-2 flex-wrap shrink-0 bg-white">
          {EXAMPLES.map(ex => (
            <button key={ex.label} onClick={() => sendMessage(ex.text)} disabled={processing}
              className="text-xs font-medium bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-full transition-all duration-200 disabled:opacity-40">
              {ex.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 shrink-0 bg-white rounded-b-3xl">
          {listening && (
            <div className="flex items-center gap-2 text-xs text-rose-500 mb-2.5 animate-pulse font-bold bg-rose-50 w-fit px-2 py-1 rounded-md">
              <Volume2 size={14} /> 正在聆聽，請說話...
            </div>
          )}
          <div className="flex items-center gap-2.5 relative">
            {sttSupported ? (
              <button onClick={listening ? stopListening : startListening} disabled={processing}
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 font-medium z-10 relative
                  ${listening ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-105' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40'}`}
                title={listening ? '停止' : '語音輸入'}>
                {listening ? (
                  <>
                    <div className="absolute inset-0 rounded-full animate-ping bg-rose-400 opacity-40"></div>
                    <MicOff size={20} className="relative z-10" />
                  </>
                ) : <Mic size={20} />}
              </button>
            ) : (
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 text-slate-300">
                <MicOff size={20} />
              </div>
            )}
            
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
              placeholder={sttSupported ? "說話或輸入照護動作..." : "輸入照護動作..."}
              className="flex-1 border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white disabled:opacity-50 transition-all font-medium placeholder:text-slate-400 shadow-inner shadow-slate-100/50"
              disabled={processing}
            />
            
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || processing}
              className="absolute right-1.5 flex-shrink-0 w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white hover:bg-slate-800 disabled:opacity-0 transition-all duration-300 shadow-sm z-10">
              {processing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
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
    <div className="border-b border-slate-100 shrink-0 bg-white">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
        <span className="font-bold flex items-center gap-2 uppercase tracking-wider">
          <Settings size={14} /> 使用說明 &amp; 指令範例
        </span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50/80 border-t border-slate-100/50 pt-3 shadow-inner shadow-slate-100/50">
          {[
            ['📊 生命徵象', '"血壓148/88，心跳78"'],
            ['💧 攝入量', '"喝了200cc的水"'],
            ['🚽 排出量', '"尿了300cc"'],
            ['💊 給藥 (MAR)', '"已給Metformin"'],
            ['📝 護理記錄', '"住民情緒穩定"'],
            ['🌡️ 體溫', '"體溫37.2度"'],
          ].map(([cat, ex]) => (
            <div key={cat} className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
              <span className="font-bold text-slate-800">{cat}</span>
              <div className="text-slate-400 mt-1 font-medium">{ex}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
