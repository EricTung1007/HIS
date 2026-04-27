import { useEffect, useState } from 'react';
import { Key, CheckCircle, AlertCircle, ExternalLink, Mic, Bot } from 'lucide-react';
import api from '../api/client';

export default function Settings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('his_ai_key') || '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [serverStatus, setServerStatus] = useState<{ configured: boolean; source: string } | null>(null);
  const [sttSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));

  useEffect(() => {
    api.get('/ai/status').then(r => setServerStatus(r.data)).catch(() => {});
  }, []);

  const save = async () => {
    if (!apiKey.trim()) return;
    setStatus('saving');
    try {
      localStorage.setItem('his_ai_key', apiKey);
      await api.post('/ai/config', { api_key: apiKey });
      const r = await api.get('/ai/status');
      setServerStatus(r.data);
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  };

  const clear = () => {
    setApiKey('');
    localStorage.removeItem('his_ai_key');
    setStatus('idle');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">系統設定</h1>

      {/* AI Settings */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-blue-600" />
          <h2 className="text-base font-semibold text-gray-800">AI 護理助理設定</h2>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 space-y-1">
          <div className="font-medium">功能說明</div>
          <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-700">
            <li>照護人員可用自然語言（語音或文字）記錄照護動作</li>
            <li>AI 自動解析並寫入對應的記錄（生命徵象、出入量、給藥、護理記錄）</li>
            <li>使用 OpenAI GPT-4o 模型進行自然語言解析</li>
            <li>語音輸入使用瀏覽器內建 Web Speech API（zh-TW）</li>
          </ul>
        </div>

        {serverStatus && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            serverStatus.configured ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
          }`}>
            {serverStatus.configured
              ? <><CheckCircle size={14} /> OpenAI API Key 已設定（來源：{serverStatus.source === 'env' ? '環境變數' : '手動設定'}）</>
              : <><AlertCircle size={14} /> 尚未設定 OpenAI API Key</>}
          </div>
        )}

        <div>
          <label className="label flex items-center gap-1">
            <Key size={13} /> OpenAI API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              className="input-field flex-1 font-mono text-xs"
              placeholder="sk-..."
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setStatus('idle'); }}
            />
            <button onClick={save} disabled={!apiKey.trim() || status === 'saving'} className="btn-primary whitespace-nowrap">
              {status === 'saving' ? '儲存中...' : '套用'}
            </button>
            {apiKey && <button onClick={clear} className="btn-secondary">清除</button>}
          </div>
          {status === 'ok' && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle size={11} />API Key 設定成功</p>}
          {status === 'error' && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11} />設定失敗，請確認 Key 格式正確</p>}
          <p className="text-xs text-gray-400 mt-1">
            前往{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer"
              className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
              platform.openai.com/api-keys <ExternalLink size={10} />
            </a>{' '}
            取得 API Key。Key 僅儲存於本機瀏覽器，不會上傳至任何第三方。
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
          <div className="font-medium text-gray-700">或使用環境變數（推薦正式部署）</div>
          <div className="font-mono bg-gray-100 rounded px-2 py-1 text-gray-800">
            OPENAI_API_KEY=sk-... node src/server.js
          </div>
          <div>環境變數優先順序高於手動設定的 Key。</div>
        </div>
      </div>

      {/* STT Status */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Mic size={18} className="text-blue-600" />
          <h2 className="text-base font-semibold text-gray-800">語音輸入（STT）</h2>
        </div>
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
          sttSupported ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {sttSupported
            ? <><CheckCircle size={14} /> 您的瀏覽器支援語音輸入（Web Speech API）</>
            : <><AlertCircle size={14} /> 不支援語音輸入，請使用 Safari（iOS）或 Chrome</>}
        </div>
        <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5">
          <li>iOS Safari 14.5+ 支援語音輸入，語言設定 zh-TW</li>
          <li>Android Chrome 也支援語音輸入</li>
          <li>語音資料由 Google/Apple 伺服器處理，不經過本系統</li>
          <li>在安靜環境使用效果最佳</li>
        </ul>
      </div>

      {/* Example commands */}
      <div className="card">
        <h2 className="section-title">自然語言指令範例</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { cat: '生命徵象', color: 'bg-red-50 border-red-200', examples: ['血壓148/88，心跳78', '體溫37.2度，血氧98', '體重55.5公斤', '疼痛指數3分'] },
            { cat: '攝入量', color: 'bg-blue-50 border-blue-200', examples: ['喝了200cc的水', '管灌250cc', '午餐喝了湯約150cc', '靜脈點滴500cc'] },
            { cat: '排出量', color: 'bg-orange-50 border-orange-200', examples: ['尿了300cc', '排尿350毫升', '大便一次', '嘔吐約100cc'] },
            { cat: '給藥記錄', color: 'bg-green-50 border-green-200', examples: ['已給Metformin', '脈優已服用', '住民拒絕吃藥', '已給早上所有藥物'] },
            { cat: '護理記錄', color: 'bg-purple-50 border-purple-200', examples: ['住民情緒穩定，無不適主訴', '主訴頭痛，給予冰敷', '下肢水腫程度未改善', '協助翻身，皮膚完整'] },
          ].map(({ cat, color, examples }) => (
            <div key={cat} className={`border rounded-lg p-3 ${color}`}>
              <div className="text-xs font-semibold text-gray-700 mb-2">{cat}</div>
              <ul className="space-y-0.5">
                {examples.map(ex => (
                  <li key={ex} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-gray-400 mt-0.5">•</span> {ex}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
