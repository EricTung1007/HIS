import { useEffect, useState } from 'react';
import { Key, CheckCircle, AlertCircle, ExternalLink, Mic, Bot, Server } from 'lucide-react';
import api from '../api/client';

const PRESETS = [
  { label: 'OpenAI (預設)', baseURL: '', model: 'gpt-4o' },
  { label: 'OpenAI GPT-4o-mini（省錢）', baseURL: '', model: 'gpt-4o-mini' },
  { label: 'Ollama 本地', baseURL: 'http://localhost:11434/v1', model: 'llama3' },
  { label: 'LM Studio 本地', baseURL: 'http://localhost:1234/v1', model: 'local-model' },
];

export default function Settings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('his_ai_key') || '');
  const [baseURL, setBaseURL] = useState(() => localStorage.getItem('his_ai_baseurl') || '');
  const [model, setModel] = useState(() => localStorage.getItem('his_ai_model') || 'gpt-4o');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [serverStatus, setServerStatus] = useState<{ configured: boolean; source: string; base_url: string; model: string } | null>(null);
  const [sttSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));

  useEffect(() => {
    api.get('/ai/status').then(r => setServerStatus(r.data)).catch(() => {});
  }, []);

  const applyPreset = (p: typeof PRESETS[0]) => {
    setBaseURL(p.baseURL);
    setModel(p.model);
    setStatus('idle');
  };

  const save = async () => {
    // If no API key is provided but we have a custom base URL (e.g. local model), use a dummy key
    const finalKey = apiKey.trim() ? apiKey : (baseURL.trim() ? 'local-dummy-key' : '');
    
    if (!finalKey) {
      setStatus('error');
      return;
    }
    
    setStatus('saving');
    try {
      localStorage.setItem('his_ai_key', finalKey);
      localStorage.setItem('his_ai_baseurl', baseURL);
      localStorage.setItem('his_ai_model', model);
      await api.post('/ai/config', { api_key: finalKey, base_url: baseURL, model });
      const r = await api.get('/ai/status');
      setServerStatus(r.data);
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  };

  const clear = () => {
    setApiKey('');
    setBaseURL('');
    setModel('gpt-4o');
    localStorage.removeItem('his_ai_key');
    localStorage.removeItem('his_ai_baseurl');
    localStorage.removeItem('his_ai_model');
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
            <li>支援 OpenAI 及任何 OpenAI 相容 API（Ollama、LM Studio 等）</li>
            <li>語音輸入使用瀏覽器內建 Web Speech API（zh-TW）</li>
          </ul>
        </div>

        {serverStatus && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            serverStatus.configured ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
          }`}>
            {serverStatus.configured
              ? <><CheckCircle size={14} /> API Key 已設定（來源：{serverStatus.source === 'env' ? '環境變數' : '手動設定'}）｜模型：{serverStatus.model}{serverStatus.base_url ? `｜端點：${serverStatus.base_url}` : ''}</>
              : <><AlertCircle size={14} /> 尚未設定 API Key</>}
          </div>
        )}

        {/* Presets */}
        <div>
          <label className="label flex items-center gap-1"><Server size={13} /> 快速套用預設</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className="text-xs border border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-gray-600 px-2.5 py-1.5 rounded-lg transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="label flex items-center gap-1"><Key size={13} /> API Key</label>
          <input
            type="password"
            className="input-field font-mono text-xs"
            placeholder="sk-...（本地 Ollama 可填任意字串，如 ollama）"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setStatus('idle'); }}
          />
          <p className="text-xs text-gray-400 mt-1">
            OpenAI Key 請至{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer"
              className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
              platform.openai.com <ExternalLink size={10} />
            </a> 取得。Key 僅儲存於本機，不上傳至第三方。
          </p>
        </div>

        {/* Base URL */}
        <div>
          <label className="label flex items-center gap-1"><Server size={13} /> API 端點 URL（選填，留空使用 OpenAI 預設）</label>
          <input
            type="text"
            className="input-field font-mono text-xs"
            placeholder="http://localhost:11434/v1"
            value={baseURL}
            onChange={e => { setBaseURL(e.target.value); setStatus('idle'); }}
          />
        </div>

        {/* Model */}
        <div>
          <label className="label">模型名稱</label>
          <input
            type="text"
            className="input-field font-mono text-xs"
            placeholder="gpt-4o"
            value={model}
            onChange={e => { setModel(e.target.value); setStatus('idle'); }}
          />
          <p className="text-xs text-gray-400 mt-1">OpenAI: gpt-4o / gpt-4o-mini｜Ollama: llama3 / qwen2.5 等</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={save} 
            disabled={(status === 'saving') || (!apiKey.trim() && !baseURL.trim())} 
            className="btn-primary"
          >
            {status === 'saving' ? '儲存中...' : '套用設定'}
          </button>
          {(apiKey || baseURL) && <button onClick={clear} className="btn-secondary">清除</button>}
        </div>
        {status === 'ok' && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={11} />設定成功</p>}
        {status === 'error' && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={11} />設定失敗，請確認 Key 格式或端點正確</p>}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
          <div className="font-medium text-gray-700">環境變數（推薦正式部署）</div>
          <div className="font-mono bg-gray-100 rounded px-2 py-1 text-gray-800">
            OPENAI_API_KEY=sk-... OPENAI_BASE_URL=http://... OPENAI_MODEL=gpt-4o node src/server.js
          </div>
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
