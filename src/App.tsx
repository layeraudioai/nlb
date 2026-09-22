/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Sparkles, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { GoogleUser, KeyLogEntry, BasicDialect } from './types';
import {
  getStoredGoogleUser,
  saveStoredGoogleUser,
  isVaultConfigured,
  sealApiKeyInVault,
  decryptApiKeyFromVault,
  purgeVault,
  purgeKeyLogs,
  autoGenerateApiKey,
  ensureKeyProvisioned,
  getKeyLogs,
  maskApiKey,
  getDerivedMasterPass,
} from './services/keyVault';
import { generateBasicCode } from './services/geminiService';
import { GoogleTetherCard } from './components/GoogleTetherCard';
import { VaultSection } from './components/VaultSection';
import { BasicGenerator } from './components/BasicGenerator';
import { BasicRunnerModal } from './components/BasicRunnerModal';

export default function App() {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [activeKeyMasked, setActiveKeyMasked] = useState<string>('');
  const [keySource, setKeySource] = useState<string>('google_tether');
  const [keyLogs, setKeyLogs] = useState<KeyLogEntry[]>([]);

  // Generator State
  const [promptText, setPromptText] = useState('Interactive bouncing particle canvas with speed and angle physics');
  const [dialect, setDialect] = useState<BasicDialect>('htmlaio');
  const [unlockPass, setUnlockPass] = useState('');
  const [outputCode, setOutputCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [rotationNotification, setRotationNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunnerOpen, setIsRunnerOpen] = useState(false);

  // The PHP OAuth session is authoritative. Local storage is only used for the
  // encrypted vault and display cache after the server confirms the account.
  useEffect(() => {
    const initialize = async () => {
      const sessionResponse = await fetch('/api/google/session.php', { credentials: 'same-origin' });
      const session = await sessionResponse.json();
      const storedUser = getStoredGoogleUser();
      const hasVault = isVaultConfigured();
      const logs = getKeyLogs();
      setKeyLogs(logs);

      if (session.authenticated && session.user) {
        const user = { ...session.user, tetheredAt: storedUser?.tetheredAt || Date.now() };
        saveStoredGoogleUser(user);
        setGoogleUser(user);
      } else {
        saveStoredGoogleUser(null);
        setGoogleUser(null);
      }

      setIsVaultLocked(hasVault);
      if (hasVault && logs.length > 0) {
        setActiveKeyMasked(logs[0].keyMasked);
      }
    };

    void initialize().catch(() => {
      saveStoredGoogleUser(null);
      setGoogleUser(null);
      setIsVaultLocked(isVaultConfigured());
      setKeyLogs(getKeyLogs());
    });
  }, []);

  // Handle Disconnect
  const handleUntether = () => {
    void fetch('/api/google/logout.php', { method: 'POST' }).catch(() => undefined);
    saveStoredGoogleUser(null);
    setGoogleUser(null);
    setRotationNotification(null);
  };

  const handleManualGenerateKey = () => {
    if (!googleUser) {
      setError('Please tether a Google Account first to auto-generate an API key.');
      return;
    }
    setIsGeneratingKey(true);
    setError(null);
    try {
      const { entry } = autoGenerateApiKey(googleUser, 'manual_generate');
      setIsVaultLocked(true);
      setActiveKeyMasked(entry.keyMasked);
      setKeySource('google_tether');
      setKeyLogs(getKeyLogs());
      setRotationNotification(`Generated fresh Gemini API key: ${entry.keyMasked}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-generate key');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  // Handle Manual Custom Key Sealing
  const handleSealManualKey = (rawKey: string, pass: string) => {
    sealApiKeyInVault(rawKey, pass, 'manual_input');
    setIsVaultLocked(true);
    setActiveKeyMasked(maskApiKey(rawKey));
    setKeySource('manual_input');
    setError(null);
    setRotationNotification('Custom API key successfully sealed in hardware-simulated vault.');
  };

  // Handle Vault Purge
  const handlePurgeVault = () => {
    purgeVault();
    purgeKeyLogs();
    setIsVaultLocked(false);
    setActiveKeyMasked('');
    setOutputCode('');
    setError(null);
    setRotationNotification('Vault purged. API key removed from storage.');
    setKeyLogs([]);
  };

  // Handle Code Generation
  const handleGenerate = async () => {
    setError(null);
    setRotationNotification(null);

    if (!promptText.trim()) {
      setError('Please enter a description for the BASIC routine.');
      return;
    }

    let activeKey = '';

    if (!isVaultConfigured()) {
      if (googleUser) {
        const { apiKey, entry } = autoGenerateApiKey(googleUser, 'initial_auto_gen');
        activeKey = apiKey;
        setIsVaultLocked(true);
        setActiveKeyMasked(entry.keyMasked);
        setKeyLogs(getKeyLogs());
        setRotationNotification(`No API key was present. Auto-generated fresh key (${entry.keyMasked}) from Google Account.`);
      } else {
        setRotationNotification('Using the secure guest Gemini service.');
      }
    } else {
      // Vault is configured; get the decrypted key
      if (googleUser) {
        const derived = getDerivedMasterPass(googleUser);
        const data = decryptApiKeyFromVault(derived);
        if (data?.apiKey) {
          activeKey = data.apiKey;
        }
      }

      if (!activeKey) {
        // Try user provided unlock passphrase
        if (unlockPass) {
          const data = decryptApiKeyFromVault(unlockPass);
          if (data?.apiKey) {
            activeKey = data.apiKey;
          } else {
            setError('Incorrect Master Access Code for decrypting vault.');
            return;
          }
        } else if (!googleUser) {
          setError('Please provide the Master Access Code to decrypt your vault.');
          return;
        } else {
          const { apiKey, entry } = autoGenerateApiKey(googleUser, 'initial_auto_gen');
          activeKey = apiKey;
          setIsVaultLocked(true);
          setActiveKeyMasked(entry.keyMasked);
          setKeyLogs(getKeyLogs());
        }
      }
    }

    setIsProcessing(true);

    try {
      const result = await generateBasicCode(
        promptText,
        dialect,
        activeKey,
        googleUser,
        (msg) => setRotationNotification(msg)
      );

      setOutputCode(result.code);

      if (result.rotated && result.newKeyMasked) {
        setActiveKeyMasked(result.newKeyMasked);
        setKeyLogs(getKeyLogs());
        setRotationNotification(
          `Usage limit reached on prior key. Automatically generated and rotated to fresh Gemini API key (${result.newKeyMasked}) via Google Account.`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans selection:bg-blue-100 p-4 sm:p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-700 to-blue-500 p-3 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <Terminal size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  nl.basic <span className="text-blue-600">Builder</span>
                </h1>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  v2.0 Mod
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Natural Language Code Generator • Web (<a href="https://nljs.web1337.net" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">nl.js</a>), C/C++, C#/.NET, Python & BASIC • Google Auto-Key
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            {googleUser ? (
              <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Tethered: {googleUser.email}</span>
              </div>
            ) : (
              <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl font-medium">
                Untethered Mode
              </div>
            )}
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-3 shadow-xs">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-red-900">Notice</div>
              <div className="mt-0.5">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section 0: Google Tethering */}
        <GoogleTetherCard
          user={googleUser}
          onUntether={handleUntether}
          onManualGenerateKey={handleManualGenerateKey}
          isGeneratingKey={isGeneratingKey}
        />

        {/* Section 1: Hardware-Simulated Vault */}
        <VaultSection
          isLocked={isVaultLocked}
          activeKeyMasked={activeKeyMasked}
          keySource={keySource}
          googleUser={googleUser}
          keyLogs={keyLogs}
          onSealManualKey={handleSealManualKey}
          onPurgeVault={handlePurgeVault}
          onManualGenerateKey={handleManualGenerateKey}
        />

        {/* Section 2: NLP to BASIC Generator */}
        <BasicGenerator
          promptText={promptText}
          setPromptText={setPromptText}
          dialect={dialect}
          setDialect={setDialect}
          unlockPass={unlockPass}
          setUnlockPass={setUnlockPass}
          isVaultLocked={isVaultLocked}
          googleUser={googleUser}
          outputCode={outputCode}
          isProcessing={isProcessing}
          onGenerate={handleGenerate}
          onRunEmulator={(code) => setIsRunnerOpen(true)}
          rotationNotification={rotationNotification}
        />

        {/* Footer */}
        <footer className="pt-4 pb-8 text-center text-xs text-slate-400 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Copyright © 2026 Brendan Carell • Multi-Language Code Generation Engine •{' '}
            <a
              href="https://nljs.web1337.net"
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 hover:text-blue-700 underline decoration-dotted"
            >
              nl.js live (web1337.net)
            </a>
          </span>
          <span className="font-mono text-[11px] text-slate-400">Model: Gemini 2.5 Flash • AES-256 Vault</span>
        </footer>
      </div>

      {/* Multi-Language Virtual Sandbox / Emulator Modal */}
      <BasicRunnerModal
        isOpen={isRunnerOpen}
        onClose={() => setIsRunnerOpen(false)}
        code={outputCode}
        dialect={dialect}
      />
    </div>
  );
}
