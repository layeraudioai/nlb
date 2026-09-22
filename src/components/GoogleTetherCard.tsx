import React, { useState } from 'react';
import { GoogleUser } from '../types';
import { ShieldCheck, LogOut, RefreshCw, Key, Sparkles, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

interface GoogleTetherCardProps {
  user: GoogleUser | null;
  onTether: (userData: GoogleUser) => void;
  onUntether: () => void;
  onManualGenerateKey: () => void;
  isGeneratingKey?: boolean;
}

export const GoogleTetherCard: React.FC<GoogleTetherCardProps> = ({
  user,
  onTether,
  onUntether,
  onManualGenerateKey,
  isGeneratingKey = false,
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [customEmail, setCustomEmail] = useState('murderlandsgame@gmail.com');
  const [customName, setCustomName] = useState('Murderlands Game');

  const handleQuickLogin = (email: string, name: string) => {
    const newUser: GoogleUser = {
      id: `google_${Date.now()}`,
      name,
      email,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0284c7`,
      tetheredAt: Date.now(),
    };
    onTether(newUser);
    setShowLoginModal(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      {/* Background subtle watermark */}
      <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
        <svg width="180" height="180" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <ShieldCheck size={16} className="text-blue-600" />
          <span>Google Account Tethering</span>
        </div>
        {user && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Tethered & Verified
          </span>
        )}
      </div>

      {!user ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Connect your Google Account to enable <strong>automatic Gemini API key provisioning</strong>. When no key is
            detected or request limits (HTTP 429 quota exhaustion) are hit, a fresh API key is auto-generated seamlessly.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => handleQuickLogin('murderlandsgame@gmail.com', 'Murderlands Game')}
              className="flex-1 h-12 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl px-4 font-semibold text-sm text-slate-700 flex items-center justify-center gap-3 transition-colors shadow-xs"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            <button
              onClick={() => setShowLoginModal(!showLoginModal)}
              className="h-12 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Custom Account</span>
              <ChevronDown size={16} />
            </button>
          </div>

          {showLoginModal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mt-3"
            >
              <div className="text-xs font-semibold text-slate-600">Specify Google Account Details</div>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="Google Email (e.g. you@gmail.com)"
                className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Display Name"
                className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={() => handleQuickLogin(customEmail, customName)}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
              >
                Confirm & Tether Google Account
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-12 h-12 rounded-full border-2 border-white shadow-xs"
              />
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  {user.name}
                  <CheckCircle2 size={14} className="text-blue-500" />
                </div>
                <div className="text-xs text-slate-500 font-mono">{user.email}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tethered on {new Date(user.tetheredAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onManualGenerateKey}
                disabled={isGeneratingKey}
                className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
                title="Provision a fresh Gemini API Key immediately"
              >
                <RefreshCw size={14} className={isGeneratingKey ? 'animate-spin' : ''} />
                <span>{isGeneratingKey ? 'Provisioning...' : 'Auto-Generate New Key'}</span>
              </button>

              <button
                onClick={onUntether}
                className="h-9 px-3 bg-white hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                title="Disconnect Google Account"
              >
                <LogOut size={14} />
                <span>Disconnect</span>
              </button>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
            <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Auto-Key Rotation Active:</span> If a request encounters a rate limit
              (HTTP 429 quota exhaustion) or if no key is sealed in the vault, the application will automatically generate
              and switch to a new Gemini API key linked to your Google Account.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
