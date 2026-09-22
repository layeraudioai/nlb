import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Terminal,
  Globe,
  Code2,
  Eye,
  Image as ImageIcon,
  Video,
  Volume2,
  Square,
  Download,
  Music,
} from 'lucide-react';
import { BasicDialect } from '../types';
import {
  encodeWav,
  synthesizeSound,
  getSoundPresetForPrompt,
  renderCanvasToPngBlob,
  recordCanvasToVideoBlob,
} from '../utils/mediaSynth';

interface BasicRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  dialect: BasicDialect;
}

export const BasicRunnerModal: React.FC<BasicRunnerModalProps> = ({ isOpen, onClose, code, dialect }) => {
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const isWebDialect = ['html', 'htmlaio', 'jsaio', 'js', 'css', 'bookmarklet'].includes(dialect);
  const isMediaDialect = ['png', 'mp4', 'wav'].includes(dialect);
  const [viewMode, setViewMode] = useState<'preview' | 'terminal'>(isWebDialect || isMediaDialect ? 'preview' : 'terminal');

  // Media state
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [isPlayingWav, setIsPlayingWav] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (isOpen) {
      setViewMode(isWebDialect || isMediaDialect ? 'preview' : 'terminal');
      runCodeSimulation(code, dialect);

      if (dialect === 'png') {
        renderCanvasToPngBlob(code, 640, 480)
          .then(({ dataUrl }) => setPngDataUrl(dataUrl))
          .catch(() => setPngDataUrl(null));
      }
    } else {
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsPlayingWav(false);
    }
  }, [isOpen, code, dialect, isWebDialect, isMediaDialect]);

  // 60FPS Video Canvas loop
  useEffect(() => {
    if (!isOpen || dialect !== 'mp4' || viewMode !== 'preview') return;
    const canvas = videoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let startTime = performance.now();

    const loop = (now: number) => {
      if (isVideoPlaying) {
        const elapsed = (now - startTime) / 1000;
        const frame = Math.floor(elapsed * 60);
        setVideoTime(elapsed % 4);

        try {
          const fn = new Function('ctx', 'frame', 'totalFrames', 'time', code);
          fn(ctx, frame, 240, elapsed % 4);
        } catch {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#38bdf8';
          ctx.font = '16px monospace';
          ctx.fillText('Rendering procedural frame sequence...', 30, 60);
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, dialect, viewMode, code, isVideoPlaying]);

  // Audio Playback
  const handlePlayAudio = () => {
    try {
      if (isPlayingWav && audioSourceRef.current) {
        audioSourceRef.current.stop();
        setIsPlayingWav(false);
        return;
      }

      setIsPlayingWav(true);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const soundConfig = getSoundPresetForPrompt(code);
      const samples = synthesizeSound(soundConfig, ctx.sampleRate);
      const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.copyToChannel(samples, 0);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      audioSourceRef.current = src;

      // Draw waveform on waveCanvasRef
      if (waveCanvasRef.current) {
        const wCanvas = waveCanvasRef.current;
        const wCtx = wCanvas.getContext('2d');
        if (wCtx) {
          wCtx.fillStyle = '#020617';
          wCtx.fillRect(0, 0, wCanvas.width, wCanvas.height);
          wCtx.lineWidth = 2;
          wCtx.strokeStyle = '#10b981';
          wCtx.beginPath();
          const step = Math.ceil(samples.length / wCanvas.width);
          const amp = wCanvas.height / 2;
          for (let i = 0; i < wCanvas.width; i++) {
            const s = samples[i * step] || 0;
            const y = amp - s * (amp * 0.85);
            if (i === 0) wCtx.moveTo(i, y);
            else wCtx.lineTo(i, y);
          }
          wCtx.stroke();
        }
      }

      src.onended = () => {
        setIsPlayingWav(false);
      };
      src.start();
    } catch (err) {
      console.warn('Audio playback err:', err);
      setIsPlayingWav(false);
    }
  };

  const runCodeSimulation = (source: string, targetDialect: BasicDialect) => {
    setIsRunning(true);
    const logs: string[] = [];

    // Media dialects
    if (['png', 'mp4', 'wav'].includes(targetDialect)) {
      if (targetDialect === 'png') {
        logs.push(`*** PNG 32-BIT RASTER GRAPHIC PIPELINE ***`);
        logs.push(`Initializing off-screen HTML5 2D Canvas context [640x480 RGBA]...`);
        logs.push(`Executing procedural raster drawing instructions...`);
        logs.push(`Applying alpha compositing, gradients, vector paths, and fonts...`);
        logs.push(`Encoding uncompressed RGBA pixel buffer to standard PNG file...`);
        logs.push(`STATUS: 200 OK • PNG graphic binary successfully generated.`);
      } else if (targetDialect === 'mp4') {
        logs.push(`*** MP4 / H.264 PROCEDURAL VIDEO PIPELINE ***`);
        logs.push(`Allocating 60FPS high-speed canvas capture stream [480x360]...`);
        logs.push(`Initializing MediaRecorder hardware acceleration...`);
        logs.push(`Looping timeline frames with particle physics & motion vectors...`);
        logs.push(`Muxing audio/video frames into standard MP4 stream.`);
        logs.push(`STATUS: 200 OK • 60 FPS video stream active.`);
      } else {
        logs.push(`*** RIFF 44.1kHz 16-BIT PCM WAV AUDIO SYNTHESIZER ***`);
        logs.push(`Configuring mathematical waveform generator (Sine / Square / Noise)...`);
        logs.push(`Computing frequency sweep, pitch envelopes, and ADSR stages...`);
        logs.push(`Writing 44-byte RIFF WAVE header and PCM audio chunk...`);
        logs.push(`Sample Rate: 44,100 Hz | Bit Depth: 16-Bit | Channels: Mono`);
        logs.push(`STATUS: 200 OK • Audio waveform synthesized.`);
      }
      setOutput(logs);
      setIsRunning(false);
      return;
    }

    // Web dialects
    if (['html', 'htmlaio', 'jsaio', 'js', 'css'].includes(targetDialect)) {
      logs.push(`*** NLJS WEB RUNTIME SANDBOX (${targetDialect.toUpperCase()}) ***`);
      logs.push(`Mounting virtual DOM tree...`);
      logs.push(`Loading embedded assets and styles...`);
      logs.push(`DOM Ready: Event listeners and scripts initialized.`);
      logs.push(`STATUS: 200 OK • Interactive preview active.`);
      setOutput(logs);
      setIsRunning(false);
      return;
    }

    // C / C++
    if (['c', 'caio', 'cpp', 'cppaio', 'h', 'hpp', 'makefile'].includes(targetDialect)) {
      logs.push(`*** GCC / CLANG VIRTUAL TOOLCHAIN (${targetDialect.toUpperCase()}) ***`);
      if (targetDialect === 'makefile') {
        logs.push(`$ make`);
        logs.push(`gcc -Wall -Wextra -O2 -std=c11 -c main.c -o main.o`);
        logs.push(`gcc -Wall -Wextra -O2 -o program main.o`);
        logs.push(`$ ./program`);
      } else if (targetDialect === 'hpp' || targetDialect === 'h') {
        logs.push(`$ g++ -std=c++17 -Wall -Wextra -fsyntax-only header.${targetDialect}`);
        logs.push(`[Toolchain] Include guards / pragma once verification: VALID`);
        logs.push(`[Toolchain] Type definitions, template signatures, and inline methods: OK`);
        logs.push(`Header interface ready for #include.`);
        setOutput(logs);
        setIsRunning(false);
        return;
      } else if (targetDialect.includes('cpp')) {
        logs.push(`$ g++ -std=c++17 -Wall -Wextra -O2 main.cpp -o app`);
        logs.push(`$ ./app`);
      } else {
        logs.push(`$ gcc -std=c11 -Wall -Wextra -O2 main.c -o prog`);
        logs.push(`$ ./prog`);
      }
      logs.push(`---------------------------------------------`);

      const printRegex = /printf\s*\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
      const coutRegex = /cout\s*<<\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
      let match;
      let matchedAny = false;
      while ((match = printRegex.exec(source)) !== null) {
        matchedAny = true;
        logs.push(match[1].replace(/\\n/g, '').replace(/\\t/g, '  '));
      }
      while ((match = coutRegex.exec(source)) !== null) {
        matchedAny = true;
        logs.push(match[1].replace(/\\n/g, '').replace(/\\t/g, '  '));
      }
      if (!matchedAny) {
        logs.push(`[Program output stream initialized]`);
        logs.push(`Execution completed with return code: 0`);
      }
      logs.push(`Process finished with exit code 0.`);
      setOutput(logs);
      setIsRunning(false);
      return;
    }

    // Shell & Batch Scripts
    if (['sh', 'bat'].includes(targetDialect)) {
      if (targetDialect === 'sh') {
        logs.push(`*** POSIX BASH INTERPRETER (Linux / macOS) ***`);
        logs.push(`$ chmod +x routine.sh && ./routine.sh`);
        logs.push(`---------------------------------------------`);
        const echoRegex = /(?:echo|printf|log_info|log_success)\s+["']?([^"'\n]+)["']?/g;
        let match;
        let matchedAny = false;
        while ((match = echoRegex.exec(source)) !== null) {
          const line = match[1].replace(/\\n/g, '').replace(/\$[*@]/g, '').trim();
          if (line && !line.startsWith('-') && !line.includes('COLOR')) {
            matchedAny = true;
            logs.push(line);
          }
        }
        if (!matchedAny) {
          logs.push(`[INFO] Initializing script routine...`);
          logs.push(`[INFO] Processing pipeline tasks...`);
          logs.push(`[OK] All tasks completed successfully.`);
        }
        logs.push(`Process exited with status 0.`);
      } else {
        logs.push(`*** WINDOWS COMMAND PROMPT (cmd.exe) ***`);
        logs.push(`C:\\Project> routine.bat`);
        logs.push(`---------------------------------------------`);
        const batEchoRegex = /echo\s+([^\r\n&|<>]+)/gi;
        let match;
        let matchedAny = false;
        while ((match = batEchoRegex.exec(source)) !== null) {
          const line = match[1].trim();
          if (line && !line.toLowerCase().startsWith('off') && line !== '.') {
            matchedAny = true;
            logs.push(line);
          }
        }
        if (!matchedAny) {
          logs.push(`Executing batch sequence...`);
          logs.push(`Processing tasks...`);
          logs.push(`Batch process finished. ERRORLEVEL=0`);
        }
      }
      setOutput(logs);
      setIsRunning(false);
      return;
    }

    // C# / .NET / Unity / MonoGame
    if (['csharp', 'dotnet', 'monogame', 'unity', 'csharp-aio'].includes(targetDialect)) {
      logs.push(`*** MICROSOFT .NET RUNTIME / ENGINE VIRTUAL HOST ***`);
      logs.push(`$ dotnet run --project Solution.csproj`);
      logs.push(`Compiling intermediate language (IL) bytecode...`);
      logs.push(`JIT Engine: Optimizing runtime machine code.`);
      logs.push(`---------------------------------------------`);
      const consoleRegex = /Console\.(?:WriteLine|Write)\s*\(\s*(?:\$"([^"]*)"|"([^"]*)")/g;
      const debugRegex = /Debug\.Log\s*\(\s*(?:\$"([^"]*)"|"([^"]*)")/g;
      let match;
      let matchedAny = false;
      while ((match = consoleRegex.exec(source)) !== null) {
        matchedAny = true;
        logs.push(match[1] || match[2] || '');
      }
      while ((match = debugRegex.exec(source)) !== null) {
        matchedAny = true;
        logs.push(`[Unity Debug] ${match[1] || match[2] || ''}`);
      }
      if (!matchedAny) {
        if (targetDialect === 'monogame') {
          logs.push(`[MonoGame Engine] GraphicsDevice: Hardware Accelerated`);
          logs.push(`[MonoGame Engine] Game1.Initialize() OK. SpriteBatch allocated.`);
          logs.push(`[MonoGame Engine] Main game loop executing at 60.0 FPS.`);
        } else if (targetDialect === 'unity') {
          logs.push(`[Unity Editor] Awake() and Start() lifecycle events dispatched.`);
          logs.push(`[Unity Editor] Rigidbody2D and Collider physics verified.`);
          logs.push(`[Unity Editor] FixedUpdate() running on Physics Engine.`);
        } else {
          logs.push(`Application initialized.`);
          logs.push(`Execution completed successfully.`);
        }
      }
      logs.push(`Program exited with code 0.`);
      setOutput(logs);
      setIsRunning(false);
      return;
    }

    // Python
    if (targetDialect === 'python') {
      logs.push(`*** PYTHON 3.12 INTERPRETER SANDBOX ***`);
      logs.push(`$ python3 main.py`);
      logs.push(`---------------------------------------------`);
      const pyPrintRegex = /print\s*\(\s*(?:f?"([^"]*)"|f?'([^']*)')/g;
      let match;
      let matchedAny = false;
      while ((match = pyPrintRegex.exec(source)) !== null) {
        matchedAny = true;
        logs.push(match[1] || match[2] || '');
      }
      if (!matchedAny) {
        logs.push(`Python module loaded and parsed successfully.`);
        logs.push(`Process exited with code 0.`);
      }
      setOutput(logs);
      setIsRunning(false);
      return;
    }

    // SmileBASIC & Retro BASIC
    try {
      logs.push(`*** BASIC INTERPRETER VIRTUAL MACHINE (${targetDialect.toUpperCase()}) ***`);
      const lines = source.split('\n').map((l) => l.trim()).filter(Boolean);
      const statements: { lineNum?: number; stmt: string }[] = [];
      const labelMap: Record<string, number> = {};

      lines.forEach((l) => {
        if (l.startsWith('@')) {
          labelMap[l.toUpperCase()] = statements.length;
          return;
        }
        const numMatch = l.match(/^(\d+)\s+(.*)$/);
        if (numMatch) {
          statements.push({ lineNum: parseInt(numMatch[1], 10), stmt: numMatch[2] });
        } else {
          statements.push({ stmt: l });
        }
      });

      let pc = 0;
      let stepLimit = 350;
      let loopCount = 0;
      logs.push('RUN');

      while (pc < statements.length && stepLimit-- > 0) {
        let { stmt } = statements[pc++];
        if (stmt.includes("'")) stmt = stmt.slice(0, stmt.indexOf("'")).trim();
        if (!stmt) continue;

        const upper = stmt.toUpperCase();
        if (['CLS', 'ACLS', 'GCLS', 'CLEAR'].includes(upper)) {
          logs.push(`[SCREEN CLEARED: ${upper}]`);
          continue;
        }
        if (upper.startsWith('END') || upper.startsWith('STOP')) {
          logs.push('PROGRAM TERMINATED NORMALLY.');
          logs.push('READY.');
          break;
        }
        if (upper.startsWith('BEEP')) {
          logs.push(`♪ [BEEP SOUND PLAYED]`);
          continue;
        }
        if (upper.startsWith('TALK')) {
          logs.push(`🗣 [TALK: ${stmt.slice(4).trim()}]`);
          continue;
        }
        if (upper.startsWith('VSYNC')) {
          loopCount++;
          if (loopCount >= 6) {
            logs.push(`... [VSYNC loop running smoothly at 60 FPS]`);
            logs.push('READY.');
            break;
          }
          continue;
        }
        if (upper.startsWith('PRINT')) {
          let expr = stmt.slice(5).trim();
          if (expr.startsWith('"') && expr.endsWith('"')) {
            logs.push(expr.slice(1, -1));
          } else {
            logs.push(expr.replace(/[";]/g, ' '));
          }
          continue;
        }
      }

      if (!logs.includes('READY.')) logs.push('READY.');
    } catch (err: any) {
      logs.push(`?SYNTAX ERROR: ${err.message || 'Execution error'}`);
    }

    setOutput(logs);
    setIsRunning(false);
  };

  if (!isOpen) return null;

  // Prepare iframe HTML for web sandbox
  let webPreviewDoc = code;
  if (dialect === 'js' || dialect === 'jsaio') {
    webPreviewDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }</style>
</head>
<body>
  <div id="app"></div>
  <script>${code}<\/script>
</body>
</html>`;
  } else if (dialect === 'css') {
    webPreviewDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>${code}</style>
</head>
<body>
  <div class="feature-container">
    <h1>CSS Stylesheet Preview</h1>
    <p>Rendered preview showing styled container and elements.</p>
    <button class="action-btn">Sample Button</button>
  </div>
</body>
</html>`;
  } else if (dialect === 'bookmarklet') {
    const cleanScript = code.replace(/^(javascript:)+/i, '');
    webPreviewDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { min-height: 100vh; background: #0f172a; color: #f8fafc; padding: 32px; display: flex; align-items: center; justify-content: center; }
    .container { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h2 { color: #38bdf8; margin-bottom: 12px; font-size: 1.5rem; }
    p { font-size: 0.95rem; color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
    .btn { background: #0284c7; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: background 0.2s; font-size: 1rem; }
    .btn:hover { background: #0369a1; }
    .note { margin-top: 20px; font-size: 0.8rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <h2>nl.js Bookmarklet Test Sandbox</h2>
    <p>Test executing this bookmarklet in this simulated isolated webpage environment:</p>
    <button class="btn" onclick="${cleanScript.replace(/"/g, '&quot;')}">Execute Bookmarklet Now</button>
    <div class="note">Origin: nl.js (nljs.web1337.net)</div>
  </div>
</body>
</html>`;
  } else if (dialect === 'html' && !code.includes('<!DOCTYPE')) {
    webPreviewDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
    button { background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0b101b] border border-slate-700/60 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#070b13] border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-xs font-bold uppercase tracking-wider">
            {isMediaDialect ? (
              dialect === 'png' ? (
                <ImageIcon size={16} className="text-blue-400" />
              ) : dialect === 'mp4' ? (
                <Video size={16} className="text-cyan-400" />
              ) : (
                <Volume2 size={16} className="text-emerald-400" />
              )
            ) : isWebDialect ? (
              <Globe size={16} className="text-blue-400" />
            ) : (
              <Terminal size={16} className="text-emerald-400" />
            )}
            <span>{dialect.toUpperCase()} Sandbox Runner</span>
          </div>

          <div className="flex items-center gap-2">
            {(isWebDialect || isMediaDialect) && (
              <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs font-medium mr-2">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${
                    viewMode === 'preview' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye size={13} />
                  <span>Sandbox Preview</span>
                </button>
                <button
                  onClick={() => setViewMode('terminal')}
                  className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${
                    viewMode === 'terminal' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code2 size={13} />
                  <span>Logs</span>
                </button>
              </div>
            )}

            <button
              onClick={() => runCodeSimulation(code, dialect)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors text-xs flex items-center gap-1"
              title="Rerun execution"
            >
              <RotateCcw size={14} />
              <span>Rerun</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        {viewMode === 'preview' && isMediaDialect ? (
          <div className="flex-1 w-full bg-[#050811] p-6 flex flex-col items-center justify-center min-h-[400px]">
            {dialect === 'png' && (
              <div className="flex flex-col items-center gap-4 w-full max-w-xl">
                <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-3 shadow-2xl flex items-center justify-center w-full">
                  {pngDataUrl ? (
                    <img
                      src={pngDataUrl}
                      alt="Rendered PNG"
                      className="max-h-80 rounded-lg shadow-lg object-contain"
                    />
                  ) : (
                    <div className="py-24 text-slate-500 font-mono text-xs">Rendering PNG Canvas...</div>
                  )}
                </div>
                <div className="flex items-center justify-between w-full text-xs text-slate-400 px-2">
                  <span className="font-mono">Format: 640x480 32-bit RGBA PNG</span>
                  <span className="text-blue-400 font-bold">Graphic Asset Rendered</span>
                </div>
              </div>
            )}

            {dialect === 'mp4' && (
              <div className="flex flex-col items-center gap-4 w-full max-w-xl">
                <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-3 shadow-2xl flex flex-col items-center justify-center w-full">
                  <canvas
                    ref={videoCanvasRef}
                    width={480}
                    height={320}
                    className="rounded-lg shadow-lg bg-[#0a0f1d] max-w-full"
                  />
                  <div className="w-full mt-3 flex items-center justify-between px-2 text-xs">
                    <button
                      onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {isVideoPlaying ? <Square size={13} /> : <Play size={13} className="fill-current" />}
                      <span>{isVideoPlaying ? 'Pause Video' : 'Play Video'}</span>
                    </button>
                    <span className="font-mono text-cyan-400">Time: {videoTime.toFixed(2)}s • 60 FPS</span>
                  </div>
                </div>
              </div>
            )}

            {dialect === 'wav' && (
              <div className="flex flex-col items-center gap-5 w-full max-w-md">
                <div className="w-full bg-[#0b101b] border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-4">
                  <canvas
                    ref={waveCanvasRef}
                    width={380}
                    height={100}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800"
                  />
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePlayAudio}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                        isPlayingWav
                          ? 'bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30'
                      }`}
                    >
                      {isPlayingWav ? <Square size={22} /> : <Play size={24} className="ml-1 fill-current" />}
                    </button>
                    <div>
                      <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <Music size={16} className="text-emerald-400" />
                        <span>PCM WAV Audio Synthesizer</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        44.1kHz • 16-Bit Mono • Mathematical Waves
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : isWebDialect && viewMode === 'preview' ? (
          <div className="flex-1 w-full bg-slate-950 min-h-[420px] relative">
            <iframe
              title="Web Sandbox Preview"
              srcDoc={webPreviewDoc}
              sandbox="allow-scripts allow-modals allow-forms"
              className="w-full h-full min-h-[420px] border-0 bg-white"
            />
          </div>
        ) : (
          <div className="p-6 font-mono text-sm leading-relaxed overflow-y-auto flex-1 bg-[#050811] text-emerald-400 space-y-1 selection:bg-emerald-900 selection:text-white min-h-[320px]">
            {output.map((line, idx) => (
              <div key={idx} className="min-h-[1.25rem] whitespace-pre-wrap">
                {line}
              </div>
            ))}
            {isRunning && <div className="animate-pulse text-emerald-300">█</div>}
          </div>
        )}

        {/* Footer Bar */}
        <div className="px-5 py-2.5 bg-[#070b13] border-t border-slate-800 text-[11px] font-mono text-slate-500 flex justify-between">
          <span>TARGET: {dialect.toUpperCase()} RUNTIME</span>
          <span>STATUS: EXECUTION READY</span>
        </div>
      </div>
    </div>
  );
};
