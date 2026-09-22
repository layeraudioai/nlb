import React, { useState } from 'react';
import { Shield, Lock, Unlock, Trash2, Check, History, Key, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { GoogleUser, KeyLogEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface VaultSectionProps {
  isLocked: boolean;
  activeKeyMasked?: string;
  keySource?: string;
  googleUser: GoogleUser | null;
  keyLogs: KeyLogEntry[];
  onSealManualKey: (apiKey: string, pass: string) => void;
  onPurgeVault: () => void;
  onManualGenerateKey: () => void;
}

export const VaultSection: React.FC<VaultSectionProps> = ({
  isLocked,
  activeKeyMasked,
  keySource,
  googleUser,
  keyLogs,
  onSealManualKey,
  onPurgeVault,
  onManualGenerateKey,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [masterPass, setMasterPass] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManualSeal = () => {
    if (!apiKey.trim() || !masterPass.trim()) {
      setError('Both API Key and Master Access Code are required.');
      return;
    }
    setError(null);
    onSealManualKey(apiKey.trim(), masterPass.trim());
    setApiKey('');
    setMasterPass('');
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Shield size={16} className="text-slate-700" />
          <span>1. Hardware-Simulated Vault</span>
        </div>
        {keyLogs.length > 0 && (
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
          >
            <History size={14} />
            <span>Key History ({keyLogs.length})</span>
          </button>
        )}
      </div>

      {!isLocked ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {googleUser ? (
              <span>
                Your Google Account is tethered. You can either{' '}
                <button
                  onClick={onManualGenerateKey}
                  className="text-blue-600 font-semibold underline underline-offset-2 hover:text-blue-800"
                >
                  auto-generate a new API key immediately
                </button>
                , or seal a custom key below:
              </span>
            ) : (
              'Store an encrypted Gemini API key into client-side hardware-simulated memory, or tether your Google Account above for automatic provisioning.'
            )}
          </p>

          <div className="space-y-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Gemini API Key (AIzaSy...)"
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <input
              type="password"
              value={masterPass}
              onChange={(e) => setMasterPass(e.target.value)}
              placeholder="Master Access Code (Cipher Key)"
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg flex items-center gap-2 border border-red-100">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleManualSeal}
              className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Lock size={15} />
              Seal API Key in Vault
            </button>
            {googleUser && (
              <button
                onClick={onManualGenerateKey}
                className="h-11 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-semibold text-sm transition-colors"
              >
                Auto-Generate Key
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl text-white">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 text-emerald-400 p-2.5 rounded-lg">
                <Check size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-100">API Key Active & Sealed</h4>
                  <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                    {keySource === 'google_tether' ? 'Google Tethered' : 'Custom Vault'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Fingerprint: <span className="text-blue-400">{activeKeyMasked || 'Encrypted in AES-256'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={onPurgeVault}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1.5 text-xs"
                title="Purge key from memory"
              >
                <Trash2 size={15} />
                <span>Purge Vault</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key History / Rotation Log Drawer */}
      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-slate-100 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700">Audit Log of Provisioned Keys & Rotations</div>
              <span className="text-[11px] text-slate-400">AES Encrypted Storage</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {keyLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Key size={14} className={log.status === 'active' ? 'text-emerald-500' : 'text-slate-400'} />
                    <span className="font-mono font-medium text-slate-800">{log.keyMasked}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        log.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'rotated_quota'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {log.status === 'active'
                        ? 'Active'
                        : log.status === 'rotated_quota'
                        ? 'Rotated (Quota 429)'
                        : 'Revoked'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
