/**
 * TikTok Live Racing Arena - Racing HUD Overlay
 * Clean, stream-optimized broadcast overlay with leader crown, real-time positions,
 * phase timers, gift announcements, and full-screen controls.
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Camera,
  Car,
  Bike,
  Sparkles,
  Users,
  Clock,
} from 'lucide-react';
import { Participant, RaceState, RaceConfig } from '../types/racing';

interface RaceHUDProps {
  raceState: RaceState;
  config: RaceConfig;
  cameraMode: 'auto' | 'chase' | 'front' | 'side' | 'drone';
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleSound: () => void;
  onToggleNarration: () => void;
  onChangeCameraMode: (mode: 'auto' | 'chase' | 'front' | 'side' | 'drone') => void;
  onOpenAdmin?: () => void;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  raceState,
  config,
  cameraMode,
  isFullscreen,
  onToggleFullscreen,
  onToggleSound,
  onToggleNarration,
  onChangeCameraMode,
  onOpenAdmin,
}) => {
  // Trigger confetti when race finishes with a winner
  useEffect(() => {
    if (raceState.phase === 'finished' && raceState.winner) {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ef4444', '#06b6d4', '#ffffff'],
      });
    }
  }, [raceState.phase, raceState.winner]);

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.ceil(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sortedParticipants = [...raceState.participants].sort((a, b) => b.distance - a.distance);
  const leader = sortedParticipants[0];

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* --- TOP BAR: Header, Timers, and Controls --- */}
      <header className="flex items-start justify-between gap-4 pointer-events-auto">
        {/* Brand & Round Badge */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-700/50 shadow-lg">
            <span className="font-racing text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400">
              TIKTOK LIVE RACING
            </span>
            <span className="text-xs font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
              R#{raceState.raceRoundNumber}
            </span>
          </div>

          {/* Quick helper tag for viewers */}
          {raceState.phase === 'waiting' && (
            <div className="text-xs text-amber-300 font-medium bg-amber-950/70 border border-amber-800/40 px-3 py-1 rounded-md backdrop-blur-sm animate-pulse">
              Comente <strong className="text-white font-bold uppercase underline">carro</strong> ou{' '}
              <strong className="text-white font-bold uppercase underline">moto</strong> para disputar!
            </div>
          )}
        </div>

        {/* Phase Indicator / Main Timer */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 px-5 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-xl">
            <Clock className="w-5 h-5 text-amber-400 animate-spin-slow" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                {raceState.phase === 'waiting' && 'SALA DE ESPERA'}
                {raceState.phase === 'countdown' && 'PREPARAR'}
                {raceState.phase === 'racing' && 'TEMPO DE PROVA'}
                {raceState.phase === 'finished' && 'PÓDIO FINAL'}
              </span>
              <span className="font-telemetry text-2xl sm:text-3xl font-black text-white tracking-wider tabular-nums">
                {formatTime(raceState.phaseTimeRemaining)}
              </span>
            </div>
          </div>

          {raceState.waitingExtensionsCount > 0 && raceState.phase === 'waiting' && (
            <span className="text-[11px] text-amber-400 font-semibold mt-1 bg-black/60 px-2 py-0.5 rounded">
              +1 min prorrogação ({raceState.participants.length}/2 pilotos)
            </span>
          )}
        </div>

        {/* Quick Streamer Controls (Audio, Camera, Fullscreen) */}
        <div className="flex items-center gap-2">
          {/* Sound Mute Toggle */}
          <button
            onClick={onToggleSound}
            title={config.soundEnabled ? 'Silenciar Sons' : 'Ativar Sons'}
            className="p-2.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700/50 text-slate-200 hover:text-white transition-all shadow-md active:scale-95"
          >
            {config.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          {/* Narration Toggle */}
          <button
            onClick={onToggleNarration}
            title={config.narrationEnabled ? 'Desativar Narração' : 'Ativar Narração'}
            className="p-2.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700/50 text-slate-200 hover:text-white transition-all shadow-md active:scale-95"
          >
            {config.narrationEnabled ? <Mic className="w-4 h-4 text-amber-400" /> : <MicOff className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Camera Cycle Button */}
          <button
            onClick={() => {
              const modes: Array<'auto' | 'chase' | 'front' | 'side' | 'drone'> = ['auto', 'chase', 'front', 'side', 'drone'];
              const nextIdx = (modes.indexOf(cameraMode) + 1) % modes.length;
              onChangeCameraMode(modes[nextIdx]);
            }}
            title={`Câmera atual: ${cameraMode.toUpperCase()}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700/50 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-md active:scale-95"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline uppercase">{cameraMode}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia'}
            className="p-2.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700/50 text-slate-200 hover:text-white transition-all shadow-md active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Return to Admin Panel if available */}
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="hidden lg:inline-flex px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase transition-all shadow-md active:scale-95"
            >
              Painel
            </button>
          )}
        </div>
      </header>

      {/* --- CENTER OVERLAYS: Countdown & Finish Podium --- */}
      <div className="flex flex-col items-center justify-center pointer-events-none">
        {/* Giant Countdown Overlay (3, 2, 1, GO!) */}
        {raceState.phase === 'countdown' && (
          <div className="flex flex-col items-center justify-center animate-bounce">
            <span className="font-racing text-8xl sm:text-9xl font-black text-amber-400 drop-shadow-[0_0_35px_rgba(245,158,11,0.8)]">
              {raceState.countdownNumber > 0 ? raceState.countdownNumber : 'GO!'}
            </span>
            <span className="text-xl font-bold uppercase tracking-widest text-white mt-2 drop-shadow-md">
              Acelere tudo!
            </span>
          </div>
        )}

        {/* Podium Finish Overlay */}
        {raceState.phase === 'finished' && raceState.winner && (
          <div className="pointer-events-auto flex flex-col items-center p-6 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 shadow-2xl max-w-md w-full animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(251,191,36,0.6)]">
              <Trophy className="w-9 h-9 text-slate-950" />
            </div>

            <span className="text-xs uppercase tracking-widest font-extrabold text-amber-400">
              GRANDE CAMPEÃO DA ARENA
            </span>
            <h2 className="text-3xl font-black text-white font-racing mt-1">
              {raceState.winner.nickname}
            </h2>
            <span className="text-sm font-semibold text-slate-400">
              {raceState.winner.username} · {raceState.winner.vehicleType === 'car' ? 'Carro' : 'Moto'}
            </span>

            {/* Podium Top 3 */}
            <div className="grid grid-cols-3 gap-2 w-full mt-5 pt-4 border-t border-slate-800">
              {raceState.podium.map((p, idx) => (
                <div
                  key={p.userId}
                  className={`flex flex-col items-center p-2 rounded-lg ${
                    idx === 0
                      ? 'bg-amber-500/20 border border-amber-500/50'
                      : idx === 1
                      ? 'bg-slate-700/20 border border-slate-600/40'
                      : 'bg-amber-900/20 border border-amber-800/30'
                  }`}
                >
                  <span className="text-xs font-bold text-amber-300">{idx + 1}º Lugar</span>
                  <span className="text-xs font-bold text-white truncate max-w-[90px]">{p.nickname}</span>
                  <span className="text-[10px] text-slate-400 font-telemetry">{Math.round(p.distance)}m</span>
                </div>
              ))}
            </div>

            <div className="mt-5 text-xs text-slate-400">
              Reiniciando sala de espera em <strong className="text-white font-telemetry">{Math.ceil(raceState.phaseTimeRemaining)}s</strong>...
            </div>
          </div>
        )}
      </div>

      {/* --- BOTTOM SECTION: Live Leaderboard Strip & Active Boost Alerts --- */}
      <footer className="flex flex-col gap-3 pointer-events-auto">
        {/* Active Boost Alert (Gift Banner) */}
        {raceState.activeFocusParticipantId && raceState.focusReason === 'gift' && (
          <div className="self-center flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600/90 via-purple-600/90 to-cyan-600/90 backdrop-blur-md border border-white/20 shadow-xl animate-pulse">
            <Flame className="w-5 h-5 text-yellow-300 animate-bounce" />
            <span className="text-xs sm:text-sm font-extrabold text-white">
              TURBO NA PISTA! IMPULSO ATIVO!
            </span>
          </div>
        )}

        {/* Live Leaderboard / Grid Slots (Rankings) */}
        <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-800/80 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>GRID DE LARGADA & RANKING ({raceState.participants.length})</span>
            </div>
            {leader && (
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>LÍDER ATUAL: {leader.nickname}</span>
              </div>
            )}
          </div>

          {/* Horizontal / Scrollable Participant Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {sortedParticipants.length === 0 ? (
              <div className="w-full py-4 text-center text-xs text-slate-500 font-medium">
                Nenhum competidor no grid ainda. Espectadores devem comentar "carro" ou "moto" no chat da LIVE.
              </div>
            ) : (
              sortedParticipants.map((p, index) => {
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;

                return (
                  <div
                    key={p.userId}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl shrink-0 transition-all ${
                      isFirst
                        ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                        : isSecond
                        ? 'bg-slate-800/70 border border-slate-400/40'
                        : isThird
                        ? 'bg-amber-950/40 border border-amber-700/40'
                        : 'bg-slate-800/40 border border-slate-800'
                    }`}
                  >
                    {/* Position Badge & Crown */}
                    <div className="flex items-center gap-1">
                      {isFirst ? (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs font-racing shadow-sm">
                          👑
                        </div>
                      ) : (
                        <span className="font-telemetry text-xs font-bold text-slate-300 w-5 text-center">
                          {p.position}º
                        </span>
                      )}
                    </div>

                    {/* Vehicle Type Icon & Color Indicator */}
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.vehicleType === 'car' ? <Car className="w-3.5 h-3.5" /> : <Bike className="w-3.5 h-3.5" />}
                    </div>

                    {/* Participant Details */}
                    <div className="flex flex-col min-w-[70px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate max-w-[100px]">
                          {p.nickname}
                        </span>
                        {p.boostRemaining > 0 && (
                          <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-telemetry">
                        <span className="text-cyan-300">{Math.round(p.speed)} km/h</span>
                        <span>{Math.round(p.distance)}m</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
