import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send, X, Bot, Loader2, CheckCircle, AlertCircle, Volume2, Settings } from 'lucide-react';
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
  onActionExecuted?: () => void;
}

// ---- Web Speech API types -------------------------------------------------
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ---- Execute action helpers -----------------------------------------------
async function executeAction(patientId: string, response: AIResponse, userId: number) {
  const { action, data } = response;
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const datetimeStr = `${today}T${timeStr}`;

  switch (action) {
    case 'vital_signs':
      await api.post(`/patients/${patientId}/vitals`, {
        measured_at: datetimeStr,
        ...data,
      });
      break;
    case 'intake':
      await api.post(`/patients/${patientId}/io`, {
        record_date: today,
        record_time: timeStr,
        type: 'intake',
        unit: 'mL',
        ...data,
      });
      break;
    case 'output':
      await api.post(`/patients/${patientId}/io`, {
        record_date: today,
        record_time: timeStr,
        type: 'output',
        unit: data?.unit || 'mL',
        ...data,
      });
      break;
    case 'mar':
      if (!data?.order_id) throw new Error('找不到對應的用藥醫囑，請至用藥記錄頁面手動記錄');
      await api.post(`/patients/${patientId}/mar`, {
        order_id: data.order_id,
        administered_at: datetimeStr,
        dose_given: data.dose_given,
        status: data.status || 'given',
        notes: data.notes,
      });
      break;
    case 'nursing_note':
      await api.post(`/patients/${patientId}/notes`, {
        note_datetime: datetimeStr,
        note_type: data?.note_type || 'narrative',
        subjective: data?.subjective,
        objective: data?.objective,
        assessment: data?.assessment,
        plan: data?.plan,
        content: data?.content,
      });
      break;
    case 'query':
    case 'unknown':
      // No API call needed
      break;
    default:
      throw new Error(`未知的動作類型: ${action}`);
  }
}

const ACTION_LABELS: Record<string, string> = {
  vital_signs: '生命徵象',
  intake: '攝入量',
  output: '排出量',
  mar: '給藥記錄',
  nursing_note: '護理記錄',
  query: '查詢',
  unknown: '無法辨識',
};

const ACTION_COLORS: Record<string, string> = {
  vital_signs: 'bg-red-50 border-red-200 text-red-700',
  intake: 'bg-blue-50 border-blue-200 text-blue-700',
  output: 'bg-orange-50 border-orange-200 text-orange-700',
  mar: 'bg-green-50 border-green-200 text-green-700',
  nursing_note: 'bg-purple-50 border-purple-200 text-purple-700',
  query: 'bg-gray-50 border-gray-200 text-gray-700',
  unknown: 'bg-gray-50 border-gray-200 text-gray-500',
};

// ---- Main Component -------------------------------------------------------
export default function AIAssistant({ patientId, patientName, onActionExecuted }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      text: `您好！我是 ${patientName} 的AI護理助理。\n您可以用自然語言說出照護動作，例如：\n• "血壓148/88，心跳78"\n• "喝了200cc的水"\n• "尿了350cc"\n• "已給Metformin"\n• "住民情緒穩定，無不適主訴"\n\n按麥克風開始語音輸入，或直接打字。`,
    },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('his_ai_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [sttSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [interimText, setInterimText] = useState('');

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText]);

  // Push API key to backend whenever it changes
  useEffect(() => {
    if (!apiKey) return;
    localStorage.setItem('his_ai_key', apiKey);
    api.post('/ai/config', { api_key: apiKey }).catch(() => {});
  }, [apiKey]);

  // ---- STT setup ----------------------------------------------------------
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = 'zh-TW';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setInterimText(interim);
      if (final) {
        setInput(prev => (prev + ' ' + final).trim());
        setInterimText('');
      }
    };
    rec.onerror = () => { setListening(false); setInterimText(''); };
    rec.onend = () => { setListening(false); setInterimText(''); };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  // ---- Send message -------------------------------------------------------
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || processing) return;
    setInput('');
    setInterimText('');

    const userMsg: Message = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setProcessing(true);

    try {
      const { data } = await api.post(
        `/patients/${patientId}/ai/chat`,
        { message: trimmed },
        apiKey ? { headers: { 'x-api-key': apiKey } } : {}
      );
      const aiResp = data as AIResponse;

      const assistantMsg: Message = {
        role: 'assistant',
        text: aiResp.confirmation,
        response: aiResp,
        status: 'pending',
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Auto-execute non-destructive, confident actions
      if (!aiResp.needs_confirm && aiResp.action !== 'unknown' && aiResp.action !== 'query') {
        try {
          await executeAction(patientId, aiResp, 0);
          setMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, status: 'done' } : m
          ));
          onActionExecuted?.();
        } catch (err: any) {
          setMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, status: 'error', text: err.message } : m
          ));
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || '發生錯誤，請稍後再試';
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${errMsg}`, status: 'error' }]);
    } finally {
      setProcessing(false);
    }
  }, [patientId, apiKey, processing, onActionExecuted]);

  const confirmAction = async (msg: Message, idx: number) => {
    if (!msg.response) return;
    try {
      await executeAction(patientId, msg.response, 0);
      setMessages(prev => prev.map((m, i) => i === idx ? { ...m, status: 'done' } : m));
      onActionExecuted?.();
    } catch (err: any) {
      setMessages(prev => prev.map((m, i) =>
        i === idx ? { ...m, status: 'error', text: err.message } : m
      ));
    }
  };

  const cancelAction = (idx: number) => {
    setMessages(prev => prev.map((m, i) =>
      i === idx ? { ...m, status: 'error', text: '已取消執行' } : m
    ));
  };

  // ---- Render -------------------------------------------------------------
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all
          ${open ? 'opacity-0 pointer-events-none' : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-110'}`}
        title="AI 護理助理"
      >
        <Bot size={24} />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
          style={{ height: '580px' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">AI 護理助理</div>
              <div className="text-blue-200 text-xs">{patientName}</div>
            </div>
            <button onClick={() => setShowKeyInput(!showKeyInput)} title="API Key 設定"
              className="text-white/70 hover:text-white transition-colors p-1">
              <Settings size={15} />
            </button>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          </div>

          {/* API Key input (collapsible) */}
          {showKeyInput && (
            <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-200 flex gap-2">
              <input
                type="password"
                placeholder="輸入 Anthropic API Key"
                className="flex-1 text-xs border border-yellow-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <button onClick={() => setShowKeyInput(false)}
                className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">
                確定
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx}>
                {msg.role === 'system' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700 whitespace-pre-wrap">
                    {msg.text}
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm max-w-[80%]">
                      {msg.text}
                    </div>
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="space-y-2">
                    {/* Understanding */}
                    {msg.response?.understanding && (
                      <div className="text-xs text-gray-400 pl-1">
                        理解：{msg.response.understanding}
                      </div>
                    )}

                    {/* Action badge */}
                    {msg.response && msg.response.action !== 'unknown' && (
                      <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${ACTION_COLORS[msg.response.action] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        {ACTION_LABELS[msg.response.action] || msg.response.action}
                      </div>
                    )}

                    {/* Confirmation text */}
                    <div className={`rounded-2xl rounded-tl-sm px-3 py-2 text-sm max-w-[85%] ${
                      msg.status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {msg.text}

                      {/* Status icon */}
                      {msg.status === 'done' && (
                        <div className="flex items-center gap-1 text-green-600 text-xs mt-1">
                          <CheckCircle size={12} /> 已記錄
                        </div>
                      )}
                      {msg.status === 'error' && msg.text !== '已取消執行' && (
                        <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                          <AlertCircle size={12} /> 執行失敗
                        </div>
                      )}
                    </div>

                    {/* Confirm / Cancel buttons (for needs_confirm actions) */}
                    {msg.response?.needs_confirm && msg.status === 'pending' && (
                      <div className="flex gap-2 pl-1">
                        <button onClick={() => confirmAction(msg, idx)}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 flex items-center gap-1">
                          <CheckCircle size={11} /> 確認執行
                        </button>
                        <button onClick={() => cancelAction(idx)}
                          className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-300">
                          取消
                        </button>
                      </div>
                    )}

                    {/* Data preview */}
                    {msg.response?.data && msg.status === 'pending' && Object.keys(msg.response.data).length > 0 && (
                      <details className="pl-1">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">查看資料內容</summary>
                        <pre className="text-xs bg-gray-50 border border-gray-100 rounded p-2 mt-1 overflow-x-auto text-gray-600">
                          {JSON.stringify(
                            Object.fromEntries(Object.entries(msg.response.data).filter(([k]) => k !== 'order_id')),
                            null, 2
                          )}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Processing indicator */}
            {processing && (
              <div className="flex items-center gap-2 text-sm text-gray-400 pl-1">
                <Loader2 size={14} className="animate-spin" /> AI 分析中...
              </div>
            )}

            {/* Interim STT text */}
            {interimText && (
              <div className="flex justify-end">
                <div className="bg-blue-100 text-blue-600 rounded-2xl rounded-tr-sm px-3 py-2 text-sm max-w-[80%] italic opacity-70">
                  {interimText}...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-100 p-3">
            {listening && (
              <div className="flex items-center gap-2 text-xs text-red-500 mb-2 animate-pulse">
                <Volume2 size={12} /> 正在聆聽...（說完後請稍待）
              </div>
            )}
            <div className="flex items-center gap-2">
              {/* STT button */}
              {sttSupported ? (
                <button
                  onClick={listening ? stopListening : startListening}
                  disabled={processing}
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${listening
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg shadow-red-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-40'}`}
                  title={listening ? '停止錄音' : '開始語音輸入'}
                >
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-300"
                  title="此瀏覽器不支援語音輸入">
                  <MicOff size={16} />
                </div>
              )}

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="輸入照護動作，或按麥克風說話..."
                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                disabled={processing}
              />

              {/* Send button */}
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || processing}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>

            {/* Quick examples */}
            <div className="flex flex-wrap gap-1 mt-2">
              {['血壓148/88', '喝水200cc', '尿了300cc', '已給藥'].map(ex => (
                <button key={ex} onClick={() => sendMessage(ex)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
