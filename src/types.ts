export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  tetheredAt: number;
  accessToken?: string;
}

export interface KeyLogEntry {
  id: string;
  keyMasked: string;
  createdAt: number;
  reason: 'initial_auto_gen' | 'quota_exhausted_auto_rotate' | 'manual_generate' | 'vault_import';
  usageCount: number;
  status: 'active' | 'rotated_quota' | 'revoked';
}

export interface VaultMetadata {
  isLocked: boolean;
  hasKey: boolean;
  activeKeyMasked?: string;
  keySource?: 'google_tether' | 'manual_input';
  rotationCount: number;
  lastRotatedAt?: number;
}

export type BasicDialect =
  // Web (nl.js • https://nljs.web1337.net)
  | 'html'
  | 'css'
  | 'js'
  | 'jsaio'
  | 'htmlaio'
  | 'bookmarklet'
  // C / C++
  | 'c'
  | 'cpp'
  | 'h'
  | 'hpp'
  | 'makefile'
  | 'caio'
  | 'cppaio'
  // Shell & Batch Scripts
  | 'sh'
  | 'bat'
  // Media Assets (Image, Video, Audio)
  | 'png'
  | 'mp4'
  | 'wav'
  // C# / .NET / Game Engines
  | 'csharp'
  | 'dotnet'
  | 'monogame'
  | 'unity'
  | 'csharp-aio'
  // Python
  | 'python'
  // SmileBASIC & Petit Computer
  | 'smilebasic-switch'
  | 'smilebasic-3ds'
  | 'smilebasic-wiiu'
  | 'smilebasic-dsi'
  // Classic Retro BASIC
  | 'gw-basic'
  | 'c64'
  | 'qbasic'
  | 'apple2';

export interface GenerationRequest {
  prompt: string;
  dialect: BasicDialect;
}
