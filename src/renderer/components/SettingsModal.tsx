import React, { useState, useEffect } from 'react';
import { X, Key, Shield, Eye, EyeOff, Save, Check, Cpu } from 'lucide-react';
import type { AppSettings } from '../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
  initialSettings: AppSettings;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings,
}) => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(settings);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-brand-400" />
            <h3 className="text-sm font-bold text-slate-100">AdaL Nexus Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-surface-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* LLM Provider */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">AI / LLM Provider</label>
            <select
              value={settings.llmProvider}
              onChange={(e) =>
                setSettings({ ...settings, llmProvider: e.target.value as AppSettings['llmProvider'] })
              }
              className="w-full bg-surface-950 border border-surface-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="mock">Deterministic Local Planner (Phase 1 / Zero API Keys Required)</option>
              <option value="gemini">Google Gemini (Recommended for Structured Planning)</option>
              <option value="openai">OpenAI (GPT-4o / Tool Calling)</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="custom">Custom Compatible Endpoint / Ollama</option>
            </select>
            {settings.llmProvider === 'mock' && (
              <p className="text-[11px] text-emerald-400 mt-1">
                ✓ Ready for immediate testing. Executes real browser automation and CSV verification without external paid accounts.
              </p>
            )}
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Model Name</label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              placeholder="e.g. gemini-1.5-pro-latest or gpt-4o"
              className="w-full bg-surface-950 border border-surface-700 rounded-lg p-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key size={13} className="text-brand-400" />
                API Key
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Stored locally in userData
              </span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder={settings.llmProvider === 'mock' ? 'Not required for local deterministic mode' : 'Enter API key...'}
                className="w-full bg-surface-950 border border-surface-700 rounded-lg p-2 pr-9 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Custom API Base URL */}
          {(settings.llmProvider === 'custom' || settings.llmProvider === 'openai') && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Custom API Base URL</label>
              <input
                type="text"
                value={settings.apiBaseUrl || ''}
                onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-surface-950 border border-surface-700 rounded-lg p-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          {/* Browser Automation Settings */}
          <div className="pt-2 border-t border-surface-800 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Browser Automation Controls
            </h4>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">Headless Browser Mode</span>
                <p className="text-[10px] text-slate-400">
                  When off, Chromium opens in a visible desktop window.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.headlessBrowser}
                onChange={(e) => setSettings({ ...settings, headlessBrowser: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-surface-700 bg-surface-950"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">Require Approval for Consequential Actions</span>
                <p className="text-[10px] text-slate-400">
                  Prompts before sensitive actions, sending external requests, or file deletion.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.requireApprovalForConsequential}
                onChange={(e) =>
                  setSettings({ ...settings, requireApprovalForConsequential: e.target.checked })
                }
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-surface-700 bg-surface-950"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">Independent Result Verification</span>
                <p className="text-[10px] text-slate-400">
                  Mandatory read-back verification of all output files.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoVerify}
                onChange={(e) => setSettings({ ...settings, autoVerify: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-surface-700 bg-surface-950"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-surface-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-surface-700 text-slate-300 hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {savedSuccess ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  Saved
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
