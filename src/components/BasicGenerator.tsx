import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Terminal,
  Copy,
  Check,
  Download,
  Play,
  RefreshCw,
  Gamepad2,
  Monitor,
  Globe,
  Binary,
  Layers,
  FileCode,
  Image as ImageIcon,
  Video,
  Volume2,
  Square,
  Eye,
  Shuffle,
  RotateCcw,
  Maximize2,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import { GoogleUser, BasicDialect } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  encodeWav,
  synthesizeSound,
  getSoundPresetForPrompt,
  renderCanvasToPngBlob,
  recordCanvasToVideoBlob,
} from '../utils/mediaSynth';

interface BasicGeneratorProps {
  promptText: string;
  setPromptText: (val: string) => void;
  dialect: BasicDialect;
  setDialect: (val: BasicDialect) => void;
  unlockPass: string;
  setUnlockPass: (val: string) => void;
  isVaultLocked: boolean;
  googleUser: GoogleUser | null;
  outputCode: string;
  isProcessing: boolean;
  onGenerate: () => void;
  onRunEmulator: (code: string) => void;
  rotationNotification: string | null;
}

type DialectCategory = 'web' | 'c_cpp' | 'scripts' | 'media' | 'csharp' | 'python' | 'smilebasic' | 'retro';

interface DialectInfo {
  id: BasicDialect;
  label: string;
  platform: string;
  category: DialectCategory;
  extension: string;
  features: string;
}

const DIALECT_LIST: DialectInfo[] = [
  // --- Web (nl.js • https://nljs.web1337.net) ---
  {
    id: 'htmlaio',
    label: 'HTML-AIO',
    platform: 'Web Single-File',
    category: 'web',
    extension: '.html',
    features: 'nl.js All-In-One: Complete self-contained HTML + CSS + JS in 1 file',
  },
  {
    id: 'bookmarklet',
    label: 'Bookmarklet',
    platform: 'nl.js Bookmarklet',
    category: 'web',
    extension: '.js',
    features: 'nl.js Bookmarklet: Drag-to-bookmark bar single-line IIFE JavaScript tool',
  },
  {
    id: 'jsaio',
    label: 'JS-AIO',
    platform: 'Web Bundle',
    category: 'web',
    extension: '.js',
    features: 'JavaScript All-In-One: Injectable component with DOM & styles',
  },
  {
    id: 'html',
    label: 'HTML5',
    platform: 'Web Markup',
    category: 'web',
    extension: '.html',
    features: 'Semantic HTML5 structure, accessibility & responsive layout',
  },
  {
    id: 'css',
    label: 'CSS3',
    platform: 'Web Stylesheet',
    category: 'web',
    extension: '.css',
    features: 'Modern CSS3 variables, flexbox, grid, and animations',
  },
  {
    id: 'js',
    label: 'JavaScript',
    platform: 'Web Scripting',
    category: 'web',
    extension: '.js',
    features: 'Modern Vanilla JavaScript (ES6+), DOM events & logic',
  },

  // --- Media Assets (PNG, MP4, WAV) ---
  {
    id: 'png',
    label: 'PNG Image (.png)',
    platform: 'Raster 32-Bit RGBA',
    category: 'media',
    extension: '.png',
    features: 'Procedural 2D graphics, vector badges, sprites, textures & instant PNG export',
  },
  {
    id: 'mp4',
    label: 'MP4 Video (.mp4)',
    platform: 'H.264 / WebM 60FPS',
    category: 'media',
    extension: '.mp4',
    features: 'Canvas timeline animation loop, dynamic particle fx & frame video recording',
  },
  {
    id: 'wav',
    label: 'WAV Audio (.wav)',
    platform: '44.1kHz 16-Bit PCM',
    category: 'media',
    extension: '.wav',
    features: 'Authentic RIFF PCM sound synthesizer: 8-bit jump, lasers, coin chimes & explosions',
  },

  // --- C / C++ ---
  {
    id: 'caio',
    label: 'C-AIO',
    platform: 'Native C Binary',
    category: 'c_cpp',
    extension: '.c',
    features: 'C All-In-One: Self-contained single .c file with main & build docs',
  },
  {
    id: 'cppaio',
    label: 'C++-AIO',
    platform: 'Modern C++17/20',
    category: 'c_cpp',
    extension: '.cpp',
    features: 'C++ All-In-One: Complete STL, classes, templates & executable main',
  },
  {
    id: 'c',
    label: 'C Source',
    platform: 'Standard C (C11)',
    category: 'c_cpp',
    extension: '.c',
    features: 'Pure C source with memory safety, headers & routines',
  },
  {
    id: 'cpp',
    label: 'C++ Source',
    platform: 'C++17/20',
    category: 'c_cpp',
    extension: '.cpp',
    features: 'Modern C++ with STL vectors, RAII & namespaces',
  },
  {
    id: 'h',
    label: 'Header (.h)',
    platform: 'C/C++ Interface',
    category: 'c_cpp',
    extension: '.h',
    features: 'Include guards/pragma once, structs, classes & prototypes',
  },
  {
    id: 'hpp',
    label: 'C++ Header (.hpp)',
    platform: 'C++ Header Only',
    category: 'c_cpp',
    extension: '.hpp',
    features: '#pragma once, template classes, inline methods, namespaces & STL',
  },
  {
    id: 'makefile',
    label: 'Makefile',
    platform: 'GNU Build System',
    category: 'c_cpp',
    extension: 'Makefile',
    features: 'Standard GNU Makefile with CC, CFLAGS, all, clean, run rules',
  },

  // --- Shell & Batch Scripts ---
  {
    id: 'sh',
    label: 'Bash Script (.sh)',
    platform: 'Linux / macOS / POSIX',
    category: 'scripts',
    extension: '.sh',
    features: '#!/usr/bin/env bash, set -euo pipefail, functions, colors & traps',
  },
  {
    id: 'bat',
    label: 'Batch Script (.bat)',
    platform: 'Windows Command Prompt',
    category: 'scripts',
    extension: '.bat',
    features: '@echo off, delayed expansion, %ERRORLEVEL% checks & CMD routines',
  },

  // --- C# / .NET / Game Engines ---
  {
    id: 'csharp-aio',
    label: 'C#-AIO',
    platform: '.NET 8 Standalone',
    category: 'csharp',
    extension: '.cs',
    features: 'C# All-In-One: Complete single-file executable with Program class',
  },
  {
    id: 'monogame',
    label: 'MonoGame',
    platform: 'MonoGame / XNA',
    category: 'csharp',
    extension: '.cs',
    features: 'MonoGame Game1 class: Initialize, LoadContent, Update, Draw, SpriteBatch',
  },
  {
    id: 'unity',
    label: 'Unity',
    platform: 'Unity Engine',
    category: 'csharp',
    extension: '.cs',
    features: 'Unity MonoBehaviour script: Awake, Start, Update, [SerializeField]',
  },
  {
    id: 'dotnet',
    label: '.NET Core',
    platform: '.NET 8 Console',
    category: 'csharp',
    extension: '.cs',
    features: 'Modern .NET Console application with async/await and records',
  },
  {
    id: 'csharp',
    label: 'C# Source',
    platform: 'C# 12',
    category: 'csharp',
    extension: '.cs',
    features: 'Strongly typed C# classes, LINQ, and clean architectural methods',
  },

  // --- Python ---
  {
    id: 'python',
    label: 'Python 3',
    platform: 'Python 3.12',
    category: 'python',
    extension: '.py',
    features: 'Clean PEP8 Python script with type hints, docstrings & main entry',
  },

  // --- SmileBASIC & Petit Computer ---
  {
    id: 'smilebasic-switch',
    label: 'Switch (SB4)',
    platform: 'Nintendo Switch',
    category: 'smilebasic',
    extension: '.prg',
    features: '1280x720 HD, Joy-Con Stick, Touch, VIBPLAY, GFILL, Layer Sprites',
  },
  {
    id: 'smilebasic-3ds',
    label: '3DS (SB3)',
    platform: 'Nintendo 3DS',
    category: 'smilebasic',
    extension: '.prg',
    features: '400x240/320x240 Dual, TALK Speech Synth, SPANIM, BEEP, 3D',
  },
  {
    id: 'smilebasic-wiiu',
    label: 'Wii U',
    platform: 'Nintendo Wii U',
    category: 'smilebasic',
    extension: '.prg',
    features: 'Dual Screen TV (1280x720) & GamePad (854x480), Touch, STICK 0',
  },
  {
    id: 'smilebasic-dsi',
    label: 'DSi (PTC)',
    platform: 'Nintendo DSi',
    category: 'smilebasic',
    extension: '.prg',
    features: 'PTC v2 256x192 Dual Screen, DSi Buttons, SPSET, SPOFS, BEEP',
  },

  // --- Classic Retro BASIC ---
  {
    id: 'gw-basic',
    label: 'GW-BASIC',
    platform: 'IBM PC DOS',
    category: 'retro',
    extension: '.bas',
    features: 'Numbered Lines (10, 20...), Standard BASIC, GOTO, FOR/NEXT',
  },
  {
    id: 'c64',
    label: 'Commodore 64',
    platform: 'C64 V2',
    category: 'retro',
    extension: '.bas',
    features: 'PEEK/POKE, Uppercase Keywords, 40-Col PETSCII, 16 Colors',
  },
  {
    id: 'qbasic',
    label: 'QBasic',
    platform: 'MS-DOS',
    category: 'retro',
    extension: '.bas',
    features: 'DO WHILE, SELECT CASE, Subroutines, SCREEN 13 graphics',
  },
  {
    id: 'apple2',
    label: 'Apple II',
    platform: 'Applesoft',
    category: 'retro',
    extension: '.bas',
    features: 'HOME, GR, HGR, COLOR, PLOT, TEXT, VTAB/HTAB graphics',
  },
];

const CATEGORY_TABS: { id: DialectCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'web', label: 'Web (nl.js)', icon: <Globe size={13} /> },
  { id: 'media', label: 'Media (PNG/MP4/WAV)', icon: <ImageIcon size={13} /> },
  { id: 'c_cpp', label: 'C / C++', icon: <Binary size={13} /> },
  { id: 'scripts', label: 'Shell & Batch', icon: <Terminal size={13} /> },
  { id: 'csharp', label: 'C# / .NET', icon: <Layers size={13} /> },
  { id: 'python', label: 'Python', icon: <FileCode size={13} /> },
  { id: 'smilebasic', label: 'SmileBASIC', icon: <Gamepad2 size={13} /> },
  { id: 'retro', label: 'Retro BASIC', icon: <Monitor size={13} /> },
];

const SAMPLES_BY_CATEGORY: Record<DialectCategory, string[]> = {
  web: [
    'Extract all emails from this page and log them to console',
    'Highlight all broken or dead links on the current page with red border',
    'Dark mode toggle: invert colors of all body elements and background',
    'Scrape and download all image URLs on the active webpage as a text list',
    'Reading time and word counter floating badge popup',
    'Interactive bouncing particle canvas with speed and angle physics',
    'Modern dark-mode card dashboard with metrics and responsive layout',
    'Floating sticky quick notepad widget with local storage persistence',
    'Generate floating table of contents for all headings on this page',
    'Audio visualizer frequency spectrum canvas with smooth glowing bars',
  ],
  media: [
    'Glowing neon cyber emblem badge with gradient star and shadow blur',
    'Laser blaster sound effect with rapid pitch sweep and reverb decay',
    'Orbiting particle vortex video animation with pulsing energy core',
    'Retro arcade jump sound effect with rising square wave',
    'Coin collect chime with harmonic dual bells and crystal sparkle',
    'Deep cinematic bass boom explosion with filtered noise rumble',
    'Pixel art health potion flask with bubble sparkle highlights',
    'Hypnotic tunnel warp animation loop with alternating color rings',
  ],
  c_cpp: [
    'Template thread-safe event dispatcher and listener class in hpp',
    'Bouncing ball simulation in terminal using ANSI escape codes',
    'Thread-safe circular ring buffer with mutex lock and enqueue/dequeue',
    'Fast matrix multiplication benchmark with cache timing',
    'GNU Makefile with auto dependency header generation and clean/run targets',
    'High performance custom memory pool allocator with chunk recycling',
    'Concurrent worker thread pool with task queue and std::future',
  ],
  scripts: [
    'Automated project backup and tar.gz / zip archiving script with timestamp',
    'Health check monitor with HTTP endpoint ping and auto-restart trap',
    'Windows batch script to clean build artifacts and recreate directories',
    'Interactive CLI tool with argument flags, color status, and help flag',
    'Docker container deployment and cleanup maintenance script',
    'Log rotation script with gzip compression and retention policy',
  ],
  csharp: [
    'MonoGame bouncing sprite animation with boundary bounce and audio',
    'Unity 2D character controller with double-jump, ground check and velocity',
    'Modern .NET console pipeline processing records asynchronously with LINQ',
    'High performance LRU in-memory cache with expiry timestamps',
    'State machine pattern for game entity AI with patrol and chase states',
    'Unity camera follow script with smooth damping and viewport bounds',
  ],
  python: [
    'A* pathfinding algorithm on 2D grid with step-by-step console visualization',
    'Multi-threaded async web fetcher with rate limiter and retries',
    'Text-based retro dungeon crawler with inventory and battle loop',
    'Statistical data analyzer calculating percentiles and standard deviation',
    'Fast Fourier Transform audio spectrum analyzer script with numpy',
    'Markov chain natural language text generator with frequency weights',
  ],
  smilebasic: [
    'Touch screen sprite drag with SPOFS and TOUCH OUT',
    'Bouncing ball animation with VSYNC, GCIRCLE, and BEEP',
    'Analog stick controlled player character moving on screen',
    'Retro 2D space shooter with button shooting and enemy loop',
    'Tilemap level scroller using BGSCREEN and BGOFS',
    'Chiptune synthesizer playing MML string with BGMPLAY',
  ],
  retro: [
    'Bouncing ball simulation with 80x25 bounds and line numbers',
    'Prime number sieve from 1 to 100 with formatted output',
    'Retro text-based space exploration game with random encounters',
    'ASCII art animated starfield with FOR/NEXT delays',
    'Conway Game of Life cellular automaton in 40-column text mode',
    'Lunar lander physics game with fuel management and thrust',
  ],
};

function getCategoryForDialect(d: BasicDialect): DialectCategory {
  const info = DIALECT_LIST.find((item) => item.id === d);
  return info?.category || 'web';
}

export const BasicGenerator: React.FC<BasicGeneratorProps> = ({
  promptText,
  setPromptText,
  dialect,
  setDialect,
  unlockPass,
  setUnlockPass,
  isVaultLocked,
  googleUser,
  outputCode,
  isProcessing,
  onGenerate,
  onRunEmulator,
  rotationNotification,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DialectCategory>(getCategoryForDialect(dialect));
  const [pngPreviewUrl, setPngPreviewUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isExportingMedia, setIsExportingMedia] = useState(false);
  const [webPreviewReloadKey, setWebPreviewReloadKey] = useState(0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isWebDialect = ['html', 'htmlaio', 'jsaio', 'js', 'css', 'bookmarklet'].includes(dialect);

  // Formulate standalone HTML document for iframe live preview
  const getWebPreviewHtml = (codeText: string, currentDialect: BasicDialect) => {
    if (currentDialect === 'bookmarklet') {
      const cleanScript = codeText.replace(/^(javascript:)+/i, '');
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { min-height: 100vh; background: #0f172a; color: #f8fafc; padding: 24px; display: flex; align-items: center; justify-content: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h3 { color: #38bdf8; margin-bottom: 8px; font-size: 1.25rem; font-weight: bold; }
    p { font-size: 13px; color: #94a3b8; margin-bottom: 20px; line-height: 1.5; }
    button { background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s; font-size: 0.95rem; }
    button:hover { background: #0369a1; }
    .tag { display: block; margin-top: 16px; font-size: 11px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <h3>nl.js Bookmarklet Test Sandbox</h3>
    <p>Click below to test executing this bookmarklet routine inside this isolated frame:</p>
    <button onclick="${cleanScript.replace(/"/g, '&quot;')}">Execute Bookmarklet</button>
    <span class="tag">Compatible with nl.js (nljs.web1337.net)</span>
  </div>
</body>
</html>`;
    }
    if (currentDialect === 'js' || currentDialect === 'jsaio') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { min-height: 100vh; background: #0f172a; color: #f8fafc; padding: 20px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>${codeText}<\/script>
</body>
</html>`;
    }
    if (currentDialect === 'css') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    ${codeText}
  </style>
</head>
<body>
  <div class="feature-container" style="padding: 28px; text-align: center; max-width: 500px; margin: 20px auto;">
    <h1>CSS Stylesheet Preview</h1>
    <p style="margin: 12px 0; opacity: 0.85;">Rendered preview of custom CSS classes and design tokens.</p>
    <button class="action-btn" style="padding: 8px 16px; border-radius: 6px; cursor: pointer;">Action Button</button>
  </div>
</body>
</html>`;
    }
    if (currentDialect === 'html' && !codeText.includes('<!DOCTYPE')) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { min-height: 100vh; background: #0f172a; color: #f8fafc; padding: 24px; }
    button { background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  ${codeText}
</body>
</html>`;
    }
    return codeText;
  };

  // Sync category tab if dialect changes
  useEffect(() => {
    setActiveCategory(getCategoryForDialect(dialect));
  }, [dialect]);

  const currentInfo = DIALECT_LIST.find((d) => d.id === dialect) || DIALECT_LIST[0];
  const samples = SAMPLES_BY_CATEGORY[activeCategory] || SAMPLES_BY_CATEGORY.web;

  const handleRandomizePrompt = () => {
    const pool = SAMPLES_BY_CATEGORY[activeCategory] || SAMPLES_BY_CATEGORY.web;
    const candidates = pool.filter((p) => p !== promptText);
    const selected = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    setPromptText(selected);
  };

  // Auto-render PNG preview when dialect is PNG and output code arrives
  useEffect(() => {
    if (dialect === 'png' && outputCode) {
      renderCanvasToPngBlob(outputCode, 520, 360)
        .then(({ dataUrl }) => setPngPreviewUrl(dataUrl))
        .catch(() => setPngPreviewUrl(null));
    } else {
      setPngPreviewUrl(null);
    }
  }, [dialect, outputCode]);

  // Mini canvas animation preview when dialect is MP4
  useEffect(() => {
    if (dialect === 'mp4' && outputCode && previewCanvasRef.current) {
      let animId: number;
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let start = performance.now();
      const loop = (now: number) => {
        const time = (now - start) / 1000;
        const frame = Math.floor(time * 30);
        try {
          const fn = new Function('ctx', 'frame', 'totalFrames', 'time', outputCode);
          fn(ctx, frame, 90, time % 3);
        } catch {
          // fallback animation
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animId);
    }
  }, [dialect, outputCode]);

  const handleCopy = () => {
    if (!outputCode) return;
    navigator.clipboard.writeText(outputCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayWav = () => {
    try {
      setIsPlayingAudio(true);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const soundConfig = getSoundPresetForPrompt(promptText);
      const samples = synthesizeSound(soundConfig, ctx.sampleRate);
      const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.copyToChannel(samples, 0);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.onended = () => setIsPlayingAudio(false);
      src.start();
    } catch (err) {
      console.warn('Audio playback error:', err);
      setIsPlayingAudio(false);
    }
  };

  const handleDownload = async () => {
    if (!outputCode) return;
    setIsExportingMedia(true);

    try {
      // 1. PNG Export
      if (dialect === 'png') {
        const { blob } = await renderCanvasToPngBlob(outputCode, 640, 480);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graphic_asset.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportingMedia(false);
        return;
      }

      // 2. WAV Audio Export
      if (dialect === 'wav') {
        const soundConfig = getSoundPresetForPrompt(promptText);
        const samples = synthesizeSound(soundConfig, 44100);
        const wavBlob = encodeWav(samples, 44100);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sound_effect.wav';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportingMedia(false);
        return;
      }

      // 3. MP4 Video Export
      if (dialect === 'mp4') {
        const videoBlob = await recordCanvasToVideoBlob(
          (ctx, frame, totalFrames, time) => {
            try {
              const fn = new Function('ctx', 'frame', 'totalFrames', 'time', outputCode);
              fn(ctx, frame, totalFrames, time);
            } catch {
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
          },
          480,
          360,
          3,
          30
        );
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'animation_loop.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportingMedia(false);
        return;
      }

      // Standard Code / Script Download
      const element = document.createElement('a');
      const file = new Blob([outputCode], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      const filename = currentInfo.extension === 'Makefile' ? 'Makefile' : `routine${currentInfo.extension}`;
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.warn('Download error:', err);
    } finally {
      setIsExportingMedia(false);
    }
  };

  const handleCategorySwitch = (cat: DialectCategory) => {
    setActiveCategory(cat);
    const firstInCat = DIALECT_LIST.find((d) => d.category === cat);
    if (firstInCat && currentInfo.category !== cat) {
      setDialect(firstInCat.id);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Sparkles size={16} className="text-blue-600" />
            <span>
              {activeCategory === 'web'
                ? dialect === 'bookmarklet'
                  ? '2. NLP to Bookmarklet (nl.js)'
                  : `2. NLP to Web (${currentInfo.label})`
                : '2. Natural Language Asset & Code Generator'}
            </span>
          </div>

          <div className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
            {activeCategory === 'web' ? 'nl.js Engine' : currentInfo.platform}
          </div>
        </div>

        {/* Multi-Language & Media Category Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySwitch(cat.id)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* nl.js Engine Banner when Web tab is selected */}
        {activeCategory === 'web' && (
          <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#001f3f] text-white flex items-center justify-center font-bold font-mono text-sm shadow-xs shrink-0">
                nl.js
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#001f3f] text-sm tracking-tight">nl.js Builder Engine</h3>
                  <span className="text-[10px] font-bold bg-[#1a73e8] text-white px-2 py-0.5 rounded-full">
                    Gemini Flash
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Ported Edition</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Natural Language JavaScript & Bookmarklet synthesizer ported from{' '}
                  <a
                    href="https://nljs.web1337.net"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1a73e8] hover:underline font-semibold"
                  >
                    nljs.web1337.net
                  </a>
                  . Drag-to-bar bookmarklets, HTML-AIO, and web modules.
                </p>
              </div>
            </div>
            <a
              href="https://nljs.web1337.net"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 self-start sm:self-center"
            >
              <span>Original Host</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {/* Target Dialect Badges */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {DIALECT_LIST.filter((d) => d.category === activeCategory).map((d) => (
            <button
              key={d.id}
              onClick={() => setDialect(d.id)}
              className={`p-2.5 rounded-xl border text-left transition-all relative ${
                dialect === d.id
                  ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-xs ring-1 ring-blue-400/50'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>{d.label}</span>
                {dialect === d.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">{d.extension}</div>
            </button>
          ))}
        </div>

        {/* Feature summary line */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{currentInfo.label}:</span>
            <span className="text-slate-500 font-mono text-[11px] bg-white border border-slate-200 px-1.5 py-0.5 rounded">
              {currentInfo.extension}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 truncate">{currentInfo.features}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Natural Language Instruction
            </label>
            <button
              type="button"
              onClick={handleRandomizePrompt}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Pick a random prompt idea for this category"
            >
              <Shuffle size={13} className="text-blue-600" />
              <span>Randomize Prompt</span>
            </button>
          </div>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder={
              activeCategory === 'web'
                ? dialect === 'bookmarklet'
                  ? "What should the tool do? (e.g., 'Extract all emails from this page and log them')"
                  : "What should the web tool or component do? (e.g., 'Interactive bouncing particle canvas with speed physics')"
                : `Describe the ${currentInfo.label} asset, routine, or program you want to generate...`
            }
            className="w-full min-h-[105px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y"
          />

          {/* Prompt suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[11px] font-semibold text-slate-400 self-center mr-1">Templates:</span>
            <button
              type="button"
              onClick={handleRandomizePrompt}
              className="text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              title="Pick a random prompt"
            >
              <Shuffle size={11} />
              <span>Randomize</span>
            </button>
            {samples.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPromptText(sample)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-colors truncate max-w-[280px] cursor-pointer ${
                  promptText === sample
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
                title={sample}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Access Code requirement check */}
        {!googleUser && isVaultLocked && (
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vault Access Code
            </label>
            <input
              type="password"
              value={unlockPass}
              onChange={(e) => setUnlockPass(e.target.value)}
              placeholder="Confirm Master Access Code to decrypt key..."
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        {googleUser && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>
                Vault verified via tethered Google Account (<strong>{googleUser.email}</strong>)
              </span>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold">Zero-Password Auto-Unlock</span>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={() => onGenerate()}
          disabled={isProcessing}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Terminal size={16} />
          )}
          <span>
            {isProcessing
              ? activeCategory === 'web'
                ? 'Processing in Memory...'
                : `Synthesizing ${currentInfo.label} Asset in Memory...`
              : dialect === 'bookmarklet'
              ? 'Generate JS Code'
              : `Generate ${currentInfo.label}`}
          </span>
        </button>
      </div>

      {/* Auto-Rotation Notification */}
      <AnimatePresence>
        {rotationNotification && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5 shadow-xs"
          >
            <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-950">Auto-Key Rotation Succeeded</div>
              <div className="text-emerald-800 mt-0.5">{rotationNotification}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Media Visual Player / Preview Section */}
      <AnimatePresence>
        {outputCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-4"
          >
            {/* Inline Media Preview Card for PNG, MP4, WAV */}
            {dialect === 'png' && pngPreviewUrl && (
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex flex-col items-center gap-3">
                <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <ImageIcon size={14} /> PNG Graphic Render
                  </span>
                  <span>640 x 480 32-Bit RGBA</span>
                </div>
                <div className="bg-[#0b101b] p-2 rounded-xl border border-slate-800 max-w-full overflow-hidden flex items-center justify-center">
                  <img
                    src={pngPreviewUrl}
                    alt="Generated Graphic"
                    className="max-h-72 rounded-lg object-contain shadow-md"
                  />
                </div>
              </div>
            )}

            {dialect === 'mp4' && (
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex flex-col items-center gap-3">
                <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Video size={14} /> MP4 Video Animation Stage
                  </span>
                  <span>60 FPS Animation Stream</span>
                </div>
                <div className="bg-[#0b101b] p-2 rounded-xl border border-slate-800 flex items-center justify-center">
                  <canvas
                    ref={previewCanvasRef}
                    width={480}
                    height={320}
                    className="rounded-lg shadow-md max-w-full bg-[#0a0f1d]"
                  />
                </div>
              </div>
            )}

            {dialect === 'wav' && (
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayWav}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isPlayingAudio
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                    }`}
                  >
                    {isPlayingAudio ? <Square size={18} /> : <Play size={20} className="ml-0.5 fill-current" />}
                  </button>
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Volume2 size={15} className="text-emerald-400" />
                      <span>44.1kHz 16-Bit PCM WAV Audio</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isPlayingAudio ? 'Synthesizing audio output...' : 'Click play to audition sound effect'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePlayWav}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Play SFX
                </button>
              </div>
            )}

            {/* Authentic nl.js Encapsulated Component for Web Dialects */}
            {activeCategory === 'web' && (
              <div className="bg-[#fff9e6] border border-[#ffe58f] rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <strong className="text-[#001f3f] text-sm font-bold tracking-tight">
                      Script Encapsulated:
                    </strong>
                    <span className="text-[10px] font-mono bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md font-semibold">
                      {dialect === 'bookmarklet' ? 'nl.js IIFE Bookmarklet' : currentInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {(dialect === 'bookmarklet' || outputCode.startsWith('javascript:')) && (
                      <a
                        href={outputCode}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#202124] hover:bg-black text-white rounded-full text-xs font-semibold shadow-xs transition-transform cursor-grab active:cursor-grabbing hover:scale-[1.02] no-underline"
                        title="Drag directly to your browser's bookmarks bar"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Bookmark size={13} className="text-amber-400 fill-amber-400" />
                        <span>Drag to Bookmark Bar</span>
                      </a>
                    )}
                    <button
                      onClick={() => onRunEmulator(outputCode)}
                      className="px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Play size={12} className="fill-current" />
                      <span>Execute Sandbox</span>
                    </button>
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <code className="block bg-black/[0.04] p-3.5 rounded-lg text-xs font-mono text-[#c7254e] border border-amber-200/70 break-all max-h-40 overflow-y-auto leading-relaxed select-all">
                  {outputCode}
                </code>

                <div className="flex items-center justify-between text-[11px] text-amber-900/75 pt-0.5 font-medium">
                  <span>Engine: nl.js port (Gemini Flash) • Self-Contained Execution</span>
                  <span>Drag pill to browser bar or click Execute</span>
                </div>
              </div>
            )}

            {/* Inline Web Live Sandbox for Web Dialects (htmlaio, html, jsaio, js, css) */}
            {isWebDialect && (
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex flex-col gap-3">
                <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <Globe size={14} /> Interactive Web Live Preview ({currentInfo.label})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWebPreviewReloadKey((k) => k + 1)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Reload sandbox preview"
                    >
                      <RotateCcw size={12} />
                      <span>Reload</span>
                    </button>
                    <button
                      onClick={() => onRunEmulator(outputCode)}
                      className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Expand to Fullscreen Runner"
                    >
                      <Maximize2 size={12} />
                      <span>Full Runner</span>
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl overflow-hidden border border-slate-800 shadow-md">
                  <iframe
                    key={webPreviewReloadKey}
                    title="Inline Web Live Sandbox"
                    srcDoc={getWebPreviewHtml(outputCode, dialect)}
                    sandbox="allow-scripts allow-modals allow-forms"
                    className="w-full h-80 border-0 bg-white"
                  />
                </div>
              </div>
            )}

            {/* Terminal Header & Source Code */}
            <div className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-xl border border-slate-800">
              <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                    {currentInfo.extension === 'Makefile' ? 'Makefile' : `ASSET${currentInfo.extension.toUpperCase()}`} [{currentInfo.label}]
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(dialect === 'bookmarklet' || outputCode.startsWith('javascript:')) && (
                    <a
                      href={outputCode}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-grab active:cursor-grabbing shadow-xs no-underline"
                      title="Drag directly to your browser's bookmarks bar"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Bookmark size={13} className="fill-amber-400/20 text-amber-400" />
                      <span>Drag to Bookmark Bar</span>
                    </a>
                  )}

                  <button
                    onClick={() => onRunEmulator(outputCode)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Open virtual runner / interactive sandbox"
                  >
                    <Play size={12} className="fill-current" />
                    <span>
                      {isWebDialect
                        ? 'Live Preview'
                        : ['png', 'mp4', 'wav'].includes(dialect)
                        ? 'Media Sandbox'
                        : 'Run Virtual'}
                    </span>
                  </button>

                  <button
                    onClick={handleDownload}
                    disabled={isExportingMedia}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                    title={`Download ${currentInfo.extension} file`}
                  >
                    {isExportingMedia ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                    <span>Download {currentInfo.extension}</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                    title="Copy Code to clipboard"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Code Output Screen */}
              <div className="p-5 font-mono text-sm leading-relaxed overflow-x-auto text-emerald-400 bg-[#0a0f1d] selection:bg-emerald-900/60 max-h-[380px] overflow-y-auto">
                <pre>
                  <code>{outputCode}</code>
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
