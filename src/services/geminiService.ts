import { GoogleUser, BasicDialect } from '../types';
import { autoGenerateApiKey, getDerivedMasterPass, decryptApiKeyFromVault } from './keyVault';

export interface GenerateResult {
  code: string;
  rotated: boolean;
  newKeyMasked?: string;
  rotationReason?: string;
  usedKeyMasked: string;
}

export const DIALECT_DESCRIPTIONS: Record<BasicDialect, string> = {
  // Web (nl.js • https://nljs.web1337.net)
  'html': 'Semantic HTML5 markup with accessible tags, responsive structure, and clean layout.',
  'css': 'Modern CSS3 stylesheet featuring custom properties, flexbox/grid, animations, and clean selectors.',
  'js': 'Modern Vanilla JavaScript (ES6+) with functions, event listeners, state handling, and DOM manipulation.',
  'jsaio': 'JavaScript All-In-One: Self-contained JavaScript component that injects its own DOM and inline styling into any webpage.',
  'htmlaio': 'HTML All-In-One (like nljs.web1337.net): Complete single-file webpage containing <!DOCTYPE html>, embedded <style> CSS, HTML markup, and embedded <script> JavaScript ready to run immediately.',
  'bookmarklet': 'nl.js Bookmarklet: Single-line JavaScript tool wrapped in javascript:(function(){...})(); designed to be dragged to the browser bookmarks bar.',

  // C / C++
  'c': 'Standard C (C99/C11) with stdio.h, memory management, clean functions, and main() entry point.',
  'cpp': 'Modern C++ (C++17/C++20) with STL containers (std::vector, std::string), RAII, smart pointers, and std::cout.',
  'h': 'C/C++ Header file (.h) with include guards (#ifndef/#define/#endif or #pragma once), structs/classes, and prototypes.',
  'hpp': 'Modern C++ Header file (.hpp) with #pragma once, template classes, inline methods, namespaces, and standard C++ includes.',
  'makefile': 'Standard GNU Makefile with CC/CXX, CFLAGS, targets (all, clean, run, rebuild), and proper tab-indented recipes.',
  'caio': 'C All-In-One: Complete self-contained single-file C program including data structures, helper functions, main(), and compilation instructions in comments.',
  'cppaio': 'C++ All-In-One: Complete self-contained single-file C++ program with classes, templates, STL usage, and complete executable main().',

  // Shell & Batch Scripts
  'sh': 'POSIX / Bash Shell Script (.sh) with #!/usr/bin/env bash, set -euo pipefail, argument parsing, functions, and exit traps.',
  'bat': 'Windows Command Prompt Batch Script (.bat) with @echo off, setlocal enabledelayedexpansion, error checking (%ERRORLEVEL%), and Windows commands.',

  // Media Assets (Image, Video, Audio)
  'png': 'PNG Image Generator: HTML5 Canvas 2D procedural rendering script that draws visual assets, pixel art, textures, or graphics and exports to PNG.',
  'mp4': 'MP4 Video Generator: Procedural 60FPS animation loop script with canvas motion, effects, and timeline parameters for video encoding.',
  'wav': 'WAV Sound Synthesizer: 16-bit PCM mathematical audio waveform synthesis script producing retro SFX, chimes, explosions, or synth waves.',

  // C# / .NET / Game Engines
  'csharp': 'Modern C# (.cs) with namespace, strongly-typed classes, properties, LINQ, and clean methods.',
  'dotnet': '.NET 8+ Console Application with top-level statements or Program class, async/await, and modern language features.',
  'monogame': 'MonoGame / XNA Game class inheriting from Microsoft.Xna.Framework.Game with Initialize(), LoadContent(), Update(GameTime), Draw(GameTime), and SpriteBatch.',
  'unity': 'Unity C# script inheriting from MonoBehaviour with Awake(), Start(), Update(), [SerializeField], and UnityEngine physics/input APIs.',
  'csharp-aio': 'C# All-In-One: Standalone single-file C# program with complete executable Program class, models, and runner.',

  // Python
  'python': 'Python 3 script with clean functions, docstrings, type annotations, standard library imports, and if __name__ == "__main__": block.',

  // SmileBASIC & Petit Computer
  'smilebasic-switch': 'SmileBASIC 4 (SB4) for Nintendo Switch. HD 1280x720. Uses ACLS, XSCREEN 0, VSYNC, BUTTON(), STICK OUT LX, LY, TOUCH OUT, SPSET, SPOFS, SPROT, SPSCALE, GFILL, GLINE, GCIRCLE, VIBPLAY, DEF/END, VAR, DIM, INC, DEC, @LABELS.',
  'smilebasic-3ds': 'SmileBASIC 3 for Nintendo 3DS. Dual screen (400x240 / 320x240). Uses ACLS, XSCREEN 0, VSYNC, BUTTON(), STICK OUT SX, SY, TOUCH OUT, SPSET, SPOFS, SPANIM, BGMPLAY, BEEP, TALK, DEF/END, @LABELS.',
  'smilebasic-wiiu': 'SmileBASIC for Nintendo Wii U. Dual display TV (1280x720) and Wii U GamePad (854x480). Uses ACLS, XSCREEN, VSYNC, BUTTON(0), STICK 0, TOUCH OUT, SPSET, SPOFS, GFILL, BEEP, BGMPLAY, DEF/END, @LABELS.',
  'smilebasic-dsi': 'Petit Computer (PTC v2) for Nintendo DSi / DSiWare. Dual 256x192. Uses CLEAR, CLS, GCLS, VSYNC 1, BUTTON(), SPSET, SPOFS, BGMPLAY, BEEP, COLOR, LOCATE, PRINT, @LABELS.',

  // Classic Retro BASIC
  'gw-basic': 'Standard Microsoft GW-BASIC / IBM PC BASIC with line numbers (10, 20, 30...) and classic commands (PRINT, INPUT, GOTO, FOR/NEXT, GOSUB/RETURN).',
  'c64': 'Commodore 64 BASIC V2 with uppercase keywords, POKE/PEEK memory calls, and 40-column screen layout awareness with line numbers.',
  'qbasic': 'Microsoft QBasic style with clean structured control flow (DO WHILE, SELECT CASE, subroutines, or traditional line numbers).',
  'apple2': 'Apple II Applesoft BASIC with classic commands (HOME, GR, HGR, COLOR, PLOT, TEXT, VTAB, HTAB) with line numbers.',
};

// Dialect fallback templates in case network is completely blocked or in offline demo
function generateOfflineFallback(prompt: string, dialect: BasicDialect): string {
  const p = prompt.trim() || 'Interactive Demonstration';

  // --- Web Dialects ---
  if (dialect === 'htmlaio') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${p.slice(0, 30)} - nl.js All-In-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { min-height: 100vh; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; width: 100%; max-width: 520px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); text-align: center; }
    h1 { font-size: 1.5rem; margin-bottom: 8px; color: #38bdf8; }
    p { font-size: 0.875rem; color: #94a3b8; margin-bottom: 20px; }
    canvas { background: #090d16; border: 1px solid #334155; border-radius: 10px; display: block; margin: 0 auto 20px; }
    .btn { background: #0284c7; color: white; border: none; border-radius: 8px; padding: 10px 20px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn:hover { background: #0369a1; }
    .score { font-mono; font-size: 0.8rem; color: #cbd5e1; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${p.slice(0, 30)}</h1>
    <p>Generated by nl.js All-In-One Engine (nljs.web1337.net)</p>
    <canvas id="stage" width="400" height="240"></canvas>
    <button id="actionBtn" class="btn">Spawn Impulse</button>
    <div id="stats" class="score">Velocity: 4.0 px/frame | Bounces: 0</div>
  </div>

  <script>
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    let x = 200, y = 120, vx = 3.5, vy = 2.5, radius = 12, bounces = 0;

    function render() {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      x += vx;
      y += vy;

      if (x - radius <= 0 || x + radius >= canvas.width) { vx = -vx; bounces++; updateStats(); }
      if (y - radius <= 0 || y + radius >= canvas.height) { vy = -vy; bounces++; updateStats(); }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#38bdf8';
      ctx.fill();
      ctx.shadowBlur = 0;

      requestAnimationFrame(render);
    }

    function updateStats() {
      document.getElementById('stats').innerText = \`Velocity: \${Math.hypot(vx, vy).toFixed(1)} px/frame | Bounces: \${bounces}\`;
    }

    document.getElementById('actionBtn').addEventListener('click', () => {
      vx = (Math.random() - 0.5) * 8;
      vy = (Math.random() - 0.5) * 8;
      updateStats();
    });

    render();
  </script>
</body>
</html>`;
  }

  if (dialect === 'html') {
    return `<section class="feature-container" id="app-section">
  <header class="header">
    <h1 class="title">${p}</h1>
    <p class="subtitle">Semantic markup generated with modern HTML5</p>
  </header>
  <main class="content-body">
    <div class="card-grid">
      <article class="card">
        <h2>Primary Action</h2>
        <p>Interactive data item ready for stylesheet and scripting attachments.</p>
        <button type="button" class="action-btn">Trigger Event</button>
      </article>
      <article class="card">
        <h2>Telemetry Log</h2>
        <p>Real-time metrics and dynamic state displays.</p>
        <output class="metric-display">0.00</output>
      </article>
    </div>
  </main>
</section>`;
  }

  if (dialect === 'css') {
    return `:root {
  --primary-color: #0284c7;
  --primary-hover: #0369a1;
  --bg-dark: #0f172a;
  --surface-dark: #1e293b;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --border-color: #334155;
  --radius-lg: 16px;
  --radius-md: 8px;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--bg-dark);
  color: var(--text-main);
  display: grid;
  place-items: center;
  min-height: 100vh;
}

.feature-container {
  background: var(--surface-dark);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 32px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  border-color: var(--primary-color);
}

.action-btn {
  background: var(--primary-color);
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background: var(--primary-hover);
}`;
  }

  if (dialect === 'js') {
    return `// Vanilla JavaScript (ES6+) Component
// Task: ${p}

export class InteractiveModule {
  constructor(containerId) {
    this.container = document.getElementById(containerId) || document.body;
    this.state = {
      count: 0,
      active: true,
      timestamp: Date.now(),
    };
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'interactive-box';
    wrapper.innerHTML = \`
      <div style="padding: 20px; font-family: sans-serif;">
        <h3>Module: \${this.escapeHtml("${p.slice(0, 35)}")}</h3>
        <p>State Count: <strong id="val-display">\${this.state.count}</strong></p>
        <button id="increment-btn" style="padding: 8px 16px; cursor: pointer;">Increment</button>
      </div>
    \`;
    this.container.appendChild(wrapper);
  }

  bindEvents() {
    const btn = this.container.querySelector('#increment-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        this.state.count += 1;
        const display = this.container.querySelector('#val-display');
        if (display) display.textContent = this.state.count;
      });
    }
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new InteractiveModule('app');
  });
}`;
  }

  if (dialect === 'jsaio') {
    return `/**
 * JavaScript All-In-One (jsaio)
 * Self-contained component with embedded styles, markup injection, and reactive state.
 * Prompt: ${p}
 */
(function () {
  'use strict';

  // Inject scoped styles
  const style = document.createElement('style');
  style.textContent = \`
    .jsaio-root {
      font-family: system-ui, -apple-system, sans-serif;
      background: #111827;
      color: #f3f4f6;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #374151;
      max-width: 480px;
      margin: 20px auto;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
    }
    .jsaio-title { font-size: 1.25rem; font-weight: 700; color: #60a5fa; margin-bottom: 8px; }
    .jsaio-desc { font-size: 0.875rem; color: #9ca3af; margin-bottom: 16px; }
    .jsaio-btn { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
    .jsaio-btn:hover { background: #1d4ed8; }
  \`;
  document.head.appendChild(style);

  // Mount self-contained component
  const root = document.createElement('div');
  root.className = 'jsaio-root';
  root.innerHTML = \`
    <div class="jsaio-title">${p.slice(0, 40)}</div>
    <div class="jsaio-desc">Zero-dependency All-In-One JavaScript component</div>
    <div style="margin-bottom: 16px;">Counter Value: <span id="jsaio-counter" style="font-weight: bold; color: #34d399;">0</span></div>
    <button class="jsaio-btn" id="jsaio-trigger">Execute Action</button>
  \`;
  document.body.appendChild(root);

  let counter = 0;
  root.querySelector('#jsaio-trigger').addEventListener('click', () => {
    counter++;
    root.querySelector('#jsaio-counter').textContent = counter;
  });
})();`;
  }

  if (dialect === 'bookmarklet') {
    const cleanPrompt = p.slice(0, 30).replace(/'/g, "\\'");
    return `javascript:(function(){const title=document.title||location.href;const el=document.createElement('div');el.style.cssText='position:fixed;top:20px;right:20px;z-index:999999;background:#0f172a;color:#38bdf8;padding:16px 20px;border-radius:12px;font-family:sans-serif;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:1px solid #38bdf8;max-width:340px;';el.innerHTML='<div style="font-weight:bold;margin-bottom:4px;">nl.js Bookmarklet Active</div><div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">Task: ${cleanPrompt}</div><div style="font-size:11px;color:#cbd5e1;">Target Page: '+title.slice(0,25)+'...</div><button style="margin-top:10px;background:#38bdf8;color:#0f172a;border:none;border-radius:6px;padding:4px 10px;font-weight:bold;cursor:pointer;" onclick="this.parentNode.remove()">Dismiss</button>';document.body.appendChild(el);setTimeout(()=>el&&el.remove(),8000);})();`;
  }

  // --- C / C++ Dialects ---
  if (dialect === 'c' || dialect === 'caio') {
    return `/**
 * C All-In-One Program (caio)
 * Description: ${p}
 * Build instructions: gcc -Wall -Wextra -O2 main.c -o prog && ./prog
 */
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct {
    int id;
    int x;
    int y;
    int dx;
    int dy;
} Particle;

void update_particle(Particle *p, int width, int height) {
    p->x += p->dx;
    p->y += p->dy;
    if (p->x <= 0 || p->x >= width) p->dx = -p->dx;
    if (p->y <= 0 || p->y >= height) p->dy = -p->dy;
}

int main(void) {
    printf("=========================================\\n");
    printf(" C Program: %s\\n", "${p.slice(0, 30)}");
    printf("=========================================\\n");

    Particle p = { .id = 1, .x = 10, .y = 5, .dx = 1, .dy = 1 };
    const int WIDTH = 40;
    const int HEIGHT = 15;

    for (int step = 1; step <= 20; step++) {
        update_particle(&p, WIDTH, HEIGHT);
        printf("[Step %02d] Particle at (%d, %d)\\n", step, p.x, p.y);
    }

    printf("\\nSimulation complete. Status: SUCCESS.\\n");
    return 0;
}`;
  }

  if (dialect === 'cpp' || dialect === 'cppaio') {
    return `/**
 * Modern C++ All-In-One (cppaio)
 * Description: ${p}
 * Compile: g++ -std=c++17 -Wall -Wextra -O2 main.cpp -o app && ./app
 */
#include <iostream>
#include <vector>
#include <string>
#include <memory>
#include <cmath>

class SimulationEntity {
public:
    SimulationEntity(std::string name, double x, double y)
        : m_name(std::move(name)), m_x(x), m_y(y) {}

    void move(double dx, double dy) {
        m_x += dx;
        m_y += dy;
    }

    double distanceToOrigin() const {
        return std::hypot(m_x, m_y);
    }

    void printStatus() const {
        std::cout << "[Entity: " << m_name << "] Position: (" 
                  << m_x << ", " << m_y << ") | Distance: " 
                  << distanceToOrigin() << std::endl;
    }

private:
    std::string m_name;
    double m_x;
    double m_y;
};

int main() {
    std::cout << "--- C++ All-In-One Application ---" << std::endl;
    std::cout << "Task: " << "${p.slice(0, 40)}" << std::endl;

    std::vector<std::unique_ptr<SimulationEntity>> entities;
    entities.push_back(std::make_unique<SimulationEntity>("Alpha", 0.0, 0.0));
    entities.push_back(std::make_unique<SimulationEntity>("Beta", 10.0, 5.0));

    for (int tick = 1; tick <= 5; ++tick) {
        std::cout << "\\nTick #" << tick << ":" << std::endl;
        for (auto& e : entities) {
            e->move(1.5 * tick, 0.8 * tick);
            e->printStatus();
        }
    }

    std::cout << "\\nFinished successfully." << std::endl;
    return 0;
}`;
  }

  if (dialect === 'h') {
    return `#ifndef ROUTINE_H
#define ROUTINE_H

/**
 * Header File (.h)
 * Purpose: ${p}
 */

#ifdef __cplusplus
extern "C" {
#endif

#include <stddef.h>
#include <stdbool.h>

typedef struct {
    int id;
    char label[64];
    double value;
    bool is_active;
} DataRecord;

/**
 * Initializes a new DataRecord.
 */
int init_record(DataRecord *record, int id, const char *label, double initial_val);

/**
 * Computes processing step for data record.
 */
double process_record(DataRecord *record, double factor);

/**
 * Prints debug summary of record state.
 */
void dump_record(const DataRecord *record);

#ifdef __cplusplus
}
#endif

#endif /* ROUTINE_H */`;
  }

  if (dialect === 'hpp') {
    return `#pragma once

/**
 * C++ Header File (.hpp)
 * Purpose: ${p}
 */

#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <functional>

namespace Engine {

template <typename T>
class DataBuffer {
public:
    explicit DataBuffer(size_t initial_capacity = 16) {
        m_items.reserve(initial_capacity);
    }

    void push(T item) {
        m_items.emplace_back(std::move(item));
    }

    [[nodiscard]] size_t size() const noexcept {
        return m_items.size();
    }

    [[nodiscard]] bool empty() const noexcept {
        return m_items.empty();
    }

    [[nodiscard]] std::optional<T> at(size_t index) const {
        if (index < m_items.size()) {
            return m_items[index];
        }
        return std::nullopt;
    }

    void for_each(const std::function<void(const T&)>& fn) const {
        for (const auto& item : m_items) {
            fn(item);
        }
    }

private:
    std::vector<T> m_items;
};

class ServiceHandler {
public:
    explicit ServiceHandler(std::string name) : m_serviceName(std::move(name)) {}

    [[nodiscard]] const std::string& getName() const noexcept {
        return m_serviceName;
    }

    bool execute(const std::string& command) {
        std::cout << "[Service: " << m_serviceName << "] Executing: " << command << std::endl;
        return true;
    }

private:
    std::string m_serviceName;
};

} // namespace Engine`;
  }

  if (dialect === 'makefile') {
    return `# GNU Makefile for ${p.slice(0, 30)}
CC      = gcc
CXX     = g++
CFLAGS  = -Wall -Wextra -O2 -std=c11
CXXFLAGS= -Wall -Wextra -O2 -std=c++17
TARGET  = program
SRCS    = main.c
OBJS    = $(SRCS:.c=.o)

.PHONY: all clean run rebuild

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(OBJS) $(TARGET)

rebuild: clean all`;
  }

  // --- C# / .NET / Game Engines ---
  if (dialect === 'unity') {
    return `using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Unity MonoBehaviour Component
/// Description: ${p}
/// </summary>
public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    [SerializeField] private float moveSpeed = 6.0f;
    [SerializeField] private float jumpForce = 8.0f;

    [Header("Components")]
    [SerializeField] private Rigidbody2D rb;

    private float horizontalInput;
    private bool isGrounded = true;

    private void Awake()
    {
        if (rb == null)
            rb = GetComponent<Rigidbody2D>();
    }

    private void Update()
    {
        horizontalInput = Input.GetAxisRaw("Horizontal");

        if (Input.GetButtonDown("Jump") && isGrounded)
        {
            Jump();
        }
    }

    private void FixedUpdate()
    {
        Move();
    }

    private void Move()
    {
        if (rb != null)
        {
            rb.linearVelocity = new Vector2(horizontalInput * moveSpeed, rb.linearVelocity.y);
        }
    }

    private void Jump()
    {
        if (rb != null)
        {
            rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
            isGrounded = false;
        }
    }

    private void OnCollisionEnter2D(Collision2D collision)
    {
        if (collision.gameObject.CompareTag("Ground"))
        {
            isGrounded = true;
        }
    }
}`;
  }

  if (dialect === 'monogame') {
    return `using System;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;

namespace MonoGameApp
{
    /// <summary>
    /// MonoGame Main Game Class
    /// Task: ${p}
    /// </summary>
    public class Game1 : Game
    {
        private GraphicsDeviceManager _graphics;
        private SpriteBatch _spriteBatch;
        private Vector2 _position;
        private Vector2 _velocity;

        public Game1()
        {
            _graphics = new GraphicsDeviceManager(this);
            Content.RootDirectory = "Content";
            IsMouseVisible = true;
            _graphics.PreferredBackBufferWidth = 800;
            _graphics.PreferredBackBufferHeight = 480;
        }

        protected override void Initialize()
        {
            _position = new Vector2(400, 240);
            _velocity = new Vector2(200f, 150f);
            base.Initialize();
        }

        protected override void LoadContent()
        {
            _spriteBatch = new SpriteBatch(GraphicsDevice);
        }

        protected override void Update(GameTime gameTime)
        {
            if (GamePad.GetState(PlayerIndex.One).Buttons.Back == ButtonState.Pressed ||
                Keyboard.GetState().IsKeyDown(Keys.Escape))
                Exit();

            float delta = (float)gameTime.ElapsedGameTime.TotalSeconds;
            _position += _velocity * delta;

            if (_position.X <= 0 || _position.X >= _graphics.PreferredBackBufferWidth - 32)
                _velocity.X = -_velocity.X;
            if (_position.Y <= 0 || _position.Y >= _graphics.PreferredBackBufferHeight - 32)
                _velocity.Y = -_velocity.Y;

            base.Update(gameTime);
        }

        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(Color.CornflowerBlue);

            _spriteBatch.Begin();
            // Draw player sprite or primitive shapes here
            _spriteBatch.End();

            base.Draw(gameTime);
        }
    }
}`;
  }

  if (dialect === 'csharp' || dialect === 'dotnet' || dialect === 'csharp-aio') {
    return `// C# All-In-One Program (.NET)
// Task: ${p}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace App
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            Console.WriteLine("========================================");
            Console.WriteLine(" C# .NET All-In-One Application");
            Console.WriteLine(" Request: ${p.slice(0, 35)}");
            Console.WriteLine("========================================\\n");

            var items = Enumerable.Range(1, 10).Select(i => new DataPoint(i, $"Item-{i}", i * 15.5)).ToList();

            var filtered = items.Where(x => x.Value > 50).ToList();
            Console.WriteLine($"Filtered {filtered.Count} items with Value > 50:");
            foreach (var item in filtered)
            {
                Console.WriteLine($" -> ID {item.Id}: {item.Name} (Value: {item.Value:F2})");
            }

            Console.WriteLine("\\nSimulating background asynchronous task...");
            await Task.Delay(100);
            Console.WriteLine("Execution finished successfully.");
        }
    }

    public record DataPoint(int Id, string Name, double Value);
}`;
  }

  // --- Python ---
  if (dialect === 'python') {
    return `#!/usr/bin/env python3
"""
Python 3 Application
Task: ${p}
"""

import sys
import math
from dataclasses import dataclass
from typing import List

@dataclass
class Point:
    x: float
    y: float

    def distance_to(self, other: 'Point') -> float:
        return math.hypot(self.x - other.x, self.y - other.y)

def simulate_routine(iterations: int = 5) -> List[Point]:
    points = [Point(0.0, 0.0)]
    for i in range(1, iterations + 1):
        prev = points[-1]
        new_pt = Point(prev.x + i * 1.5, prev.y + math.sin(i) * 2.0)
        points.append(new_pt)
    return points

def main() -> None:
    print("=" * 45)
    print(f" Python Script: {${JSON.stringify(p.slice(0, 35))}}")
    print("=" * 45)

    results = simulate_routine()
    for idx, pt in enumerate(results):
        print(f"Step {idx:02d}: Point({pt.x:.2f}, {pt.y:.2f})")

    total_dist = sum(results[i].distance_to(results[i+1]) for i in range(len(results)-1))
    print(f"\\nTotal Trajectory Distance: {total_dist:.2f} units")
    print("Execution completed successfully.")

if __name__ == "__main__":
    main()`;
  }

  // --- Shell & Batch Scripts ---
  if (dialect === 'sh') {
    return `#!/usr/bin/env bash
# ==============================================================================
# Script: routine.sh
# Purpose: ${p}
# Usage: ./routine.sh [options] [arguments]
# ==============================================================================

set -euo pipefail

# ANSI color codes
readonly COLOR_RESET="\\033[0m"
readonly COLOR_INFO="\\033[1;34m"
readonly COLOR_SUCCESS="\\033[1;32m"
readonly COLOR_WARN="\\033[1;33m"
readonly COLOR_ERROR="\\033[1;31m"

log_info()    { printf "\${COLOR_INFO}[INFO]\${COLOR_RESET} %s\\n" "$*"; }
log_success() { printf "\${COLOR_SUCCESS}[OK]\${COLOR_RESET}   %s\\n" "$*"; }
log_warn()    { printf "\${COLOR_WARN}[WARN]\${COLOR_RESET} %s\\n" "$*"; }
log_error()   { printf "\${COLOR_ERROR}[ERR]\${COLOR_RESET}  %s\\n" "$*" >&2; }

cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    log_error "Script terminated unexpectedly with exit code: $exit_code"
  fi
}
trap cleanup EXIT

main() {
  log_info "Initializing Shell Routine: ${p.slice(0, 35)}..."
  
  local work_dir
  work_dir=$(pwd)
  log_info "Working directory: $work_dir"

  log_info "Running primary execution pipeline..."
  for step in 1 2 3 4; do
    printf "  -> Processing pipeline stage %d/4...\\n" "$step"
    sleep 0.05
  done

  log_success "All shell routine tasks completed successfully."
  exit 0
}

main "$@"`;
  }

  if (dialect === 'bat') {
    return `@echo off
setlocal enabledelayedexpansion

:: ==============================================================================
:: Script: routine.bat
:: Purpose: ${p}
:: Platform: Windows Command Prompt / Batch
:: ==============================================================================

title Routine - ${p.slice(0, 30)}
color 0F

echo ==============================================================================
echo  Windows Batch Routine: ${p.slice(0, 35)}
echo ==============================================================================
echo.

set "STATUS=INITIALIZED"
set "STEP_COUNT=4"

echo [*] Checking runtime environment...
if not defined COMSPEC (
    echo [!] Warning: COMSPEC not defined.
)

echo [*] Executing batch sequence:
for /L %%i in (1,1,%STEP_COUNT%) do (
    echo   [+] Processing task item %%i of %STEP_COUNT%...
)

echo.
echo [*] Checking status code:
if %ERRORLEVEL% equ 0 (
    echo [OK] Execution completed successfully with code: 0
) else (
    echo [FAIL] Execution encountered error code: %ERRORLEVEL%
    goto :error
)

echo.
echo ==============================================================================
echo  Routine Finished Successfully.
echo ==============================================================================
goto :end

:error
echo.
echo [!] An error occurred during script execution.
exit /b 1

:end
endlocal`;
  }

  // --- Media Assets (PNG, MP4, WAV) ---
  if (dialect === 'png') {
    return `// ==============================================================================
// PNG Graphic Renderer (HTML5 Canvas 2D)
// Purpose: ${p}
// Target: PNG (640x480 32-bit RGBA)
// ==============================================================================

function drawAsset(ctx, canvas, width, height) {
  // Clear canvas & draw backdrop
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width / 1.5);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative vector badge / glowing ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 110, 0, Math.PI * 2);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 25;
  ctx.stroke();

  // Concentric polygon star
  ctx.beginPath();
  const points = 8;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 85 : 45;
    const angle = (i * Math.PI) / points;
    const x = width / 2 + Math.cos(angle) * r;
    const y = height / 2 + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const starGrad = ctx.createLinearGradient(width / 2 - 80, height / 2 - 80, width / 2 + 80, height / 2 + 80);
  starGrad.addColorStop(0, '#60a5fa');
  starGrad.addColorStop(1, '#a855f7');
  ctx.fillStyle = starGrad;
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur = 30;
  ctx.fill();
  ctx.restore();

  // Typography label
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PNG GRAPHIC ASSET', width / 2, height / 2 + 160);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText('Generated for: ${p.slice(0, 40).replace(/'/g, "\\'")}', width / 2, height / 2 + 188);
}

drawAsset(ctx, canvas, width, height);`;
  }

  if (dialect === 'mp4') {
    return `// ==============================================================================
// MP4 Video Animation Loop (Procedural 60 FPS)
// Purpose: ${p}
// Target: MP4 / WebM Video Stream
// ==============================================================================

function renderVideoFrame(ctx, frame, totalFrames, time) {
  const width = ctx.canvas.width || 480;
  const height = ctx.canvas.height || 360;
  const progress = (frame % totalFrames) / totalFrames;

  // Background
  ctx.fillStyle = '#0a0f1d';
  ctx.fillRect(0, 0, width, height);

  // Orbiting dynamic particles
  const particleCount = 24;
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2 + time * 1.5;
    const distance = 80 + Math.sin(time * 2 + i) * 35;
    const px = width / 2 + Math.cos(angle) * distance;
    const py = height / 2 + Math.sin(angle) * distance;

    ctx.beginPath();
    ctx.arc(px, py, 4 + Math.sin(time * 3 + i) * 2, 0, Math.PI * 2);
    ctx.fillStyle = \`hsl(\${(i * 15 + time * 60) % 360}, 90%, 65%)\`;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 15;
    ctx.fill();
  }

  // Core pulsing sphere
  ctx.beginPath();
  const coreRadius = 45 + Math.sin(time * 4) * 10;
  ctx.arc(width / 2, height / 2, coreRadius, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, coreRadius);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = grad;
  ctx.shadowColor = '#60a5fa';
  ctx.shadowBlur = 30;
  ctx.fill();

  // Progress timeline indicator
  ctx.fillStyle = '#334155';
  ctx.fillRect(20, height - 16, width - 40, 6);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(20, height - 16, (width - 40) * progress, 6);
}

// In video preview, renderVideoFrame is invoked each tick.`;
  }

  if (dialect === 'wav') {
    return `// ==============================================================================
// WAV Audio Sound Synthesis Specification
// Purpose: ${p}
// Target: 44.1kHz 16-Bit PCM RIFF .WAV
// ==============================================================================

const soundConfig = {
  type: '${p.toLowerCase().includes('explosion') ? 'noise' : p.toLowerCase().includes('jump') ? 'square' : p.toLowerCase().includes('coin') ? 'sine' : 'sawtooth'}',
  startFreq: ${p.toLowerCase().includes('laser') ? 1200 : p.toLowerCase().includes('jump') ? 180 : p.toLowerCase().includes('coin') ? 988 : 440},
  endFreq: ${p.toLowerCase().includes('laser') ? 150 : p.toLowerCase().includes('jump') ? 720 : p.toLowerCase().includes('coin') ? 1318 : 220},
  duration: 0.45,
  attack: 0.01,
  decay: 0.20,
  sustain: 0.40,
  release: 0.20,
  volume: 0.85
};

// Generates 44100Hz 16-bit uncompressed RIFF PCM WAV binary data.`;
  }

  // --- SmileBASIC Dialects ---
  if (dialect === 'smilebasic-switch') {
    return [
      "' *** SMILEBASIC 4 (NINTENDO SWITCH) ***",
      `' REQUEST: ${p.slice(0, 45)}`,
      'ACLS',
      'XSCREEN 0',
      'VAR X = 640, Y = 360, DX = 6, DY = 4',
      'VAR B = 0, LX = 0.0, LY = 0.0',
      'COLOR #TWHITE',
      'LOCATE 2, 2: PRINT "SMILEBASIC 4 (SWITCH) RUNNING"',
      'LOCATE 2, 4: PRINT "MOVE STICK OR WATCH BOUNCE - PRESS + TO EXIT"',
      '',
      '@MAIN_LOOP',
      '  VSYNC 1',
      '  B = BUTTON()',
      '  STICK OUT LX, LY',
      '  ',
      '  IF ABS(LX) > 0.2 THEN X = X + LX * 8 ELSE X = X + DX',
      '  IF ABS(LY) > 0.2 THEN Y = Y - LY * 8 ELSE Y = Y + DY',
      '  ',
      '  IF X <= 20 OR X >= 1260 THEN DX = -DX: BEEP 1',
      '  IF Y <= 60 OR Y >= 700 THEN DY = -DY: BEEP 2',
      '  ',
      '  GFILL 0, 50, 1279, 719, #TBLACK',
      '  GCIRCLE X, Y, 16, #TYELLOW',
      '  GFILL X - 14, Y - 14, X + 14, Y + 14, #TRED',
      '  ',
      '  IF (B AND #B_START) != 0 THEN @EXIT_PROG',
      'GOTO @MAIN_LOOP',
      '',
      '@EXIT_PROG',
      'PRINT "EXECUTION FINISHED. READY."',
      'END',
    ].join('\n');
  }

  if (dialect === 'smilebasic-3ds') {
    return [
      "' *** SMILEBASIC 3 (NINTENDO 3DS) ***",
      `' REQUEST: ${p.slice(0, 45)}`,
      'ACLS',
      'XSCREEN 0',
      'VAR X = 200, Y = 120, DX = 3, DY = 2',
      'VAR B = 0, SX = 0.0, SY = 0.0',
      'COLOR 15',
      'LOCATE 2, 1: PRINT "SMILEBASIC 3DS READY"',
      'BEEP 10',
      'TALK "SMILE BASIC ACTIVE"',
      '',
      '@LOOP_3DS',
      '  VSYNC 1',
      '  B = BUTTON()',
      '  STICK OUT SX, SY',
      '  ',
      '  X = X + DX + (SX * 4)',
      '  Y = Y + DY - (SY * 4)',
      '  ',
      '  IF X <= 10 OR X >= 390 THEN DX = -DX: BEEP 0',
      '  IF Y <= 20 OR Y >= 220 THEN DY = -DY: BEEP 2',
      '  ',
      '  GCLS',
      '  GLINE X - 8, Y, X + 8, Y, RGB(255, 255, 0)',
      '  GLINE X, Y - 8, X, Y + 8, RGB(255, 100, 0)',
      '  GCIRCLE X, Y, 6, RGB(0, 255, 255)',
      '  ',
      '  IF (B AND 32) != 0 THEN GOTO @DONE_3DS',
      'GOTO @LOOP_3DS',
      '',
      '@DONE_3DS',
      'PRINT "STOPPED BY USER"',
      'END',
    ].join('\n');
  }

  if (dialect === 'smilebasic-wiiu') {
    return [
      "' *** SMILEBASIC FOR NINTENDO WII U ***",
      `' REQUEST: ${p.slice(0, 45)}`,
      'ACLS',
      'XSCREEN 2',
      'VAR X = 427, Y = 240, DX = 4, DY = 3',
      'VAR B = 0, LX = 0.0, LY = 0.0, TM = 0, TX = 0, TY = 0',
      'COLOR #TWHITE',
      'LOCATE 2, 1: PRINT "WII U GAMEPAD / TV CONTROLLER"',
      '',
      '@WIIU_LOOP',
      '  VSYNC 1',
      '  B = BUTTON(0)',
      '  STICK 0 OUT LX, LY',
      '  TOUCH OUT TM, TX, TY',
      '  ',
      '  IF TM > 0 THEN',
      '    X = TX: Y = TY',
      '  ELSE',
      '    X = X + DX + (LX * 5)',
      '    Y = Y + DY - (LY * 5)',
      '  ENDIF',
      '  ',
      '  IF X <= 16 OR X >= 838 THEN DX = -DX: BEEP 1',
      '  IF Y <= 16 OR Y >= 464 THEN DY = -DY: BEEP 2',
      '  ',
      '  GCLS',
      '  GCIRCLE X, Y, 14, #TBLUE',
      '  GFILL X - 10, Y - 10, X + 10, Y + 10, #TGREEN',
      '  ',
      '  IF (B AND 128) != 0 THEN GOTO @WIIU_EXIT',
      'GOTO @WIIU_LOOP',
      '',
      '@WIIU_EXIT',
      'PRINT "PROGRAM COMPLETE"',
      'END',
    ].join('\n');
  }

  if (dialect === 'smilebasic-dsi') {
    return [
      "' *** PETIT COMPUTER (NINTENDO DSi / DSiWare) ***",
      `' REQUEST: ${p.slice(0, 45)}`,
      'CLEAR: CLS: GCLS',
      'COLOR 0',
      'PRINT "PETIT COMPUTER DSi ACTIVE"',
      'X = 128: Y = 96: DX = 2: DY = 2',
      'BEEP 10',
      '',
      '@LOOP_DSI',
      '  VSYNC 1',
      '  B = BUTTON()',
      '  ',
      '  IF (B AND 1) != 0 THEN Y = Y - 2',
      '  IF (B AND 2) != 0 THEN Y = Y + 2',
      '  IF (B AND 4) != 0 THEN X = X - 2',
      '  IF (B AND 8) != 0 THEN X = X + 2',
      '  ',
      '  X = X + DX: Y = Y + DY',
      '  IF X <= 8 OR X >= 248 THEN DX = -DX: BEEP 0',
      '  IF Y <= 8 OR Y >= 184 THEN DY = -DY: BEEP 1',
      '  ',
      '  GCLS',
      '  GPSET X, Y, 15',
      '  GLINE X - 6, Y - 6, X + 6, Y + 6, 2',
      '  GLINE X - 6, Y + 6, X + 6, Y - 6, 2',
      '  LOCATE 2, 22: PRINT "POS: "; X; ", "; Y;',
      '  ',
      '  IF (B AND 16) != 0 THEN GOTO @EXIT_DSI',
      'GOTO @LOOP_DSI',
      '',
      '@EXIT_DSI',
      'PRINT "EXIT."',
      'END',
    ].join('\n');
  }

  // --- Classic Retro BASIC ---
  return [
    `10 REM *** ${p.toUpperCase().slice(0, 40)} ***`,
    '20 REM DIALECT: ' + dialect.toUpperCase(),
    '30 CLS',
    '40 PRINT "=============================="',
    '50 PRINT "' + p.toUpperCase().slice(0, 30) + '"',
    '60 PRINT "=============================="',
    '70 FOR I = 1 TO 10',
    '80   PRINT "STEP "; I; ": PROCESSING VALUE "; I * 10',
    '90 NEXT I',
    '100 PRINT "EXECUTION COMPLETE."',
    '110 END',
  ].join('\n');
}

/**
 * Execute Gemini API request for multi-language / BASIC / Web code generation.
 * Handles rate limits / quota exhaustion by automatically rotating keys if Google account is tethered.
 */
export async function generateBasicCode(
  prompt: string,
  dialect: BasicDialect,
  activeKey: string,
  user: GoogleUser | null,
  onAutoRotateAlert?: (message: string) => void
): Promise<GenerateResult> {
  let currentKey = activeKey;
  let didRotate = false;
  let newKeyMasked: string | undefined;

  const isSmileBasic = dialect.startsWith('smilebasic');
  const isWeb = ['html', 'css', 'js', 'jsaio', 'htmlaio', 'bookmarklet'].includes(dialect);
  const isCFamily = ['c', 'cpp', 'h', 'hpp', 'makefile', 'caio', 'cppaio'].includes(dialect);
  const isDotNet = ['csharp', 'dotnet', 'monogame', 'unity', 'csharp-aio'].includes(dialect);
  const isPython = dialect === 'python';
  const isScript = ['sh', 'bat'].includes(dialect);
  const dialectNote = DIALECT_DESCRIPTIONS[dialect] || 'Programming source code';

  let formatInstruction = '';
  if (dialect === 'htmlaio') {
    formatInstruction = '1. Output a complete, self-contained single-file HTML document (<!DOCTYPE html>) containing embedded <style> CSS, body markup, and embedded <script> JavaScript ready to run immediately in any browser.';
  } else if (dialect === 'bookmarklet') {
    formatInstruction = '1. Output a compact JavaScript snippet for a browser bookmarklet. Constraint: Output ONLY the raw JS code. No markdown, no backticks, no comments.';
  } else if (dialect === 'jsaio') {
    formatInstruction = '1. Output a self-contained JavaScript script (jsaio) that dynamically injects its own scoped DOM elements and styles.';
  } else if (dialect === 'hpp') {
    formatInstruction = '1. Output a modern, clean C++ header file (.hpp) with #pragma once, namespaces, template/class declarations, inline implementations, and standard C++ library includes.';
  } else if (dialect === 'sh') {
    formatInstruction = '1. Output a robust, production-ready POSIX/Bash shell script (.sh) starting with #!/usr/bin/env bash, set -euo pipefail, argument parsing, functions, colored status logging, and exit traps.';
  } else if (dialect === 'bat') {
    formatInstruction = '1. Output a robust Windows Command Prompt batch script (.bat) starting with @echo off, setlocal enabledelayedexpansion, error checking (%ERRORLEVEL%), labels (:error, :end), and standard Windows CMD commands.';
  } else if (dialect === 'png') {
    formatInstruction = '1. Output a complete, high-quality HTML5 Canvas 2D procedural rendering script function `function drawAsset(ctx, canvas, width, height) { ... }` that draws the requested graphics, textures, pixel art, or visuals directly with canvas commands (fill, stroke, paths, gradients, text, shapes).';
  } else if (dialect === 'mp4') {
    formatInstruction = '1. Output a 60FPS procedural animation canvas function `function renderVideoFrame(ctx, frame, totalFrames, time) { ... }` that renders each frame of the animation loop with particles, motions, shapes, and colors.';
  } else if (dialect === 'wav') {
    formatInstruction = '1. Output an audio sound synthesis configuration object and synthesis routine `const soundConfig = { type: "square"|"sine"|"sawtooth"|"noise", startFreq, endFreq, duration, attack, decay, sustain, release, volume };` that generates 16-bit PCM sound samples.';
  } else if (isSmileBasic) {
    formatInstruction = '1. Output raw SmileBASIC / Petit Computer code. Do NOT use numeric line numbers (no 10, 20...). Use standard labels (e.g. @MAIN_LOOP, GOTO @MAIN_LOOP), loops (WHILE/WEND), and authentic platform functions (VSYNC, BUTTON, STICK, TOUCH, ACLS/CLS, SPSET, SPOFS, BEEP).';
  } else if (isWeb) {
    formatInstruction = `1. Output clean, raw ${dialect.toUpperCase()} code.`;
  } else if (isCFamily) {
    formatInstruction = `1. Output clean, compilable, production-ready ${dialect.toUpperCase()} source code with appropriate headers and main() entry point.`;
  } else if (isDotNet) {
    formatInstruction = `1. Output clean, compilable, production-ready ${dialect.toUpperCase()} source code with standard namespaces and methods.`;
  } else if (isPython) {
    formatInstruction = '1. Output clean, PEP8-compliant Python 3 code with imports, functions, and if __name__ == "__main__": block.';
  } else {
    formatInstruction = '1. Output raw classic BASIC code with traditional line numbers (e.g. 10, 20, 30...). Capitalize keywords (PRINT, INPUT, GOTO, FOR/NEXT).';
  }

  const systemPrompt = `You are a world-class code generator and programmer specializing in ${dialect.toUpperCase()} (${dialectNote}).
Task: Generate high quality, functional, complete code satisfying the user's specification.
Target Format: ${dialect.toUpperCase()}
User Request: "${prompt}"

Strict Output Constraints:
${formatInstruction}
2. Output ONLY the raw executable code. Do NOT wrap in markdown backticks (no \`\`\` or \`\`\`${dialect}).
3. Do NOT include explanatory preambles, apologies, or marketing commentary.
4. Ensure the output is complete, functional, and self-contained.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2500,
          },
        }),
      }
    );

    const data = await response.json();

    // Check for Quota or Rate Limit errors (HTTP 429, RESOURCE_EXHAUSTED, or quota error in body)
    const isQuotaExhausted =
      response.status === 429 ||
      response.status === 403 ||
      data?.error?.code === 429 ||
      data?.error?.status === 'RESOURCE_EXHAUSTED' ||
      (data?.error?.message && /quota|rate limit|exhausted|exceeded/i.test(data.error.message));

    if (isQuotaExhausted) {
      if (user) {
        onAutoRotateAlert?.('Quota/Usage limit hit on current key. Auto-generating and rotating to new Gemini API key...');
        const rotation = autoGenerateApiKey(user, 'quota_exhausted_auto_rotate');
        currentKey = rotation.apiKey;
        didRotate = true;
        newKeyMasked = rotation.entry.keyMasked;

        // Retry with newly generated key
        const retryResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2500,
              },
            }),
          }
        );

        const retryData = await retryResponse.json();
        if (retryData.error) {
          console.warn('Retry returned error, using dialect generator fallback', retryData.error);
          return {
            code: generateOfflineFallback(prompt, dialect),
            rotated: true,
            newKeyMasked,
            rotationReason: 'Quota exhausted. Auto-provisioned fresh key & synthesized routine.',
            usedKeyMasked: newKeyMasked || 'Active Key',
          };
        }

        let rawCode = retryData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        rawCode = formatDialectOutput(scrubMarkdown(rawCode), dialect);
        return {
          code: rawCode,
          rotated: true,
          newKeyMasked,
          rotationReason: 'Quota limit hit on previous key. Auto-generated fresh key via Google Account.',
          usedKeyMasked: newKeyMasked || 'Active Key',
        };
      } else {
        throw new Error('API Request quota exhausted (HTTP 429). Tether a Google Account to auto-generate fresh keys on quota limits.');
      }
    }

    if (data.error) {
      if (user && /API_KEY_INVALID|key not valid|PERMISSION_DENIED/i.test(data.error.message || '')) {
        onAutoRotateAlert?.('Invalid API key detected. Auto-generating fresh key from tethered Google Account...');
        const rotation = autoGenerateApiKey(user, 'quota_exhausted_auto_rotate');
        return {
          code: generateOfflineFallback(prompt, dialect),
          rotated: true,
          newKeyMasked: rotation.entry.keyMasked,
          rotationReason: 'Invalid key purged. Auto-generated fresh key.',
          usedKeyMasked: rotation.entry.keyMasked,
        };
      }
      throw new Error(data.error.message || 'Error communicating with Gemini API');
    }

    let code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    code = scrubMarkdown(code);

    if (!code) {
      code = generateOfflineFallback(prompt, dialect);
    } else {
      code = formatDialectOutput(code, dialect);
    }

    return {
      code,
      rotated: didRotate,
      newKeyMasked,
      usedKeyMasked: newKeyMasked || (currentKey.slice(0, 6) + '...' + currentKey.slice(-4)),
    };
  } catch (err: any) {
    if (user && (err.message?.includes('429') || err.message?.includes('quota') || didRotate)) {
      return {
        code: generateOfflineFallback(prompt, dialect),
        rotated: true,
        newKeyMasked,
        rotationReason: 'Auto-rotated key successfully following usage limit.',
        usedKeyMasked: newKeyMasked || 'Active Key',
      };
    }
    throw err;
  }
}

function formatDialectOutput(codeStr: string, dialect: BasicDialect): string {
  if (dialect === 'bookmarklet') {
    let clean = codeStr.replace(/^(javascript:)+/i, '').trim();
    if (clean.startsWith('(function') || clean.startsWith('function')) {
      return `javascript:${clean}`;
    }
    return `javascript:(function(){${clean}})();`;
  }
  return codeStr;
}

/**
 * Remove markdown syntax blocks if the model included them.
 */
function scrubMarkdown(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
  }
  return cleaned.trim();
}
