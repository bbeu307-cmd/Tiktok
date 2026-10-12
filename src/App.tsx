/**
 * TikTok Live Racing Arena - Main Application Shell
 * Sincronização em tempo real do estado da corrida, alternância entre Painel Admin
 * e Modo Jogo em Tela Cheia para transmissão OBS.
 */

import React, { useState, useEffect, useRef } from 'react';
import { RaceCanvas3D } from './components/RaceCanvas3D';
import { RaceHUD } from './components/RaceHUD';
import { AdminPanel } from './components/AdminPanel';
import {
  RaceConfig,
  RaceState,
  ConnectionDiagnostics,
  LiveEvent,
  RaceHistoryRecord,
} from './types/racing';
import { soundEngine } from './services/soundEngine';
import { narrationEngine } from './services/narrationEngine';

export default function App() {
  // View mode: 'admin' (Dashboard do Streamer) or 'game' (Tela Cheia / OBS Browser Source)
  const [viewMode, setViewMode] = useState<'admin' | 'game'>('admin');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'auto' | 'chase' | 'front' | 'side' | 'drone'>('auto');

  // Backend state synchronized via server loop
  const [config, setConfig] = useState<RaceConfig & { hasApiKey: boolean; maskedKey: string }>({
    tiktokUsername: '',
    eulerApiKey: '',
    eulerWebhookUrl: '',
    raceDurationSeconds: 120,
    waitingDurationSeconds: 120,
    minParticipants: 2,
    soundEnabled: true,
    narrationEnabled: true,
    narrationVoice: '',
    narrationVolume: 0.9,
    narrationRate: 1.05,
    cameraMode: 'auto',
    isLocked: false,
    hasApiKey: false,
    maskedKey: '',
    boostSettings: {
      coins1: 2,
      coins2: 4,
      coins5: 10,
      coins10: 20,
      roseBoost: 3,
      rocketBoost: 15,
    },
  });

  const [raceState, setRaceState] = useState<RaceState>({
    phase: 'waiting',
    phaseTimeRemaining: 120,
    countdownNumber: 3,
    elapsedRaceTime: 0,
    totalRaceDuration: 120,
    participants: [],
    leaderId: null,
    previousLeaderId: null,
    activeFocusParticipantId: null,
    focusReason: 'leader',
    focusExpiresAt: 0,
    waitingExtensionsCount: 0,
    winner: null,
    podium: [],
    raceRoundNumber: 1,
    isPaused: false,
    trackLength: 3500,
    lastUpdated: Date.now(),
  });

  const [diagnostics, setDiagnostics] = useState<ConnectionDiagnostics>({
    status: 'offline',
    tiktokConnected: false,
    eulerConnected: false,
    lastCheckedAt: Date.now(),
    errorMessage: 'Vincule seu TikTok e API Key do Euler Stream.',
  });

  const [recentEvents, setRecentEvents] = useState<LiveEvent[]>([]);
  const [raceHistory, setRaceHistory] = useState<RaceHistoryRecord[]>([]);

  // Sound triggers tracker
  const prevCountdownRef = useRef<number>(3);
  const prevPhaseRef = useRef<string>('waiting');
  const prevBoostedCountRef = useRef<number>(0);

  // 1. Initial configuration load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [configRes, diagRes, histRes] = await Promise.all([
          fetch('/api/tiktok/config').then((r) => r.json()),
          fetch('/api/tiktok/status').then((r) => r.json()),
          fetch('/api/race/history').then((r) => r.json()),
        ]);

        if (configRes && !configRes.error) setConfig(configRes);
        if (diagRes && !diagRes.error) setDiagnostics(diagRes);
        if (Array.isArray(histRes)) setRaceHistory(histRes);
      } catch (err) {
        console.error('Failed to load initial server state:', err);
      }
    };

    fetchInitialData();
  }, []);

  // 2. High-frequency state polling & speech queue consumer (every 250ms)
  useEffect(() => {
    let isMounted = true;

    const pollInterval = setInterval(async () => {
      try {
        // Fetch current race state
        const stateRes = await fetch('/api/race/state').then((r) => r.json());
        if (isMounted && stateRes && !stateRes.error) {
          setRaceState(stateRes);

          // Audio SFX Triggers
          if (config.soundEnabled) {
            // Countdown beep
            if (stateRes.phase === 'countdown' && stateRes.countdownNumber !== prevCountdownRef.current) {
              soundEngine.playCountdownBeep(stateRes.countdownNumber === 0);
              prevCountdownRef.current = stateRes.countdownNumber;
            }

            // Green flag launch / GO!
            if (stateRes.phase === 'racing' && prevPhaseRef.current === 'countdown') {
              soundEngine.playCountdownBeep(true);
            }

            // Winner fanfare
            if (stateRes.phase === 'finished' && prevPhaseRef.current === 'racing') {
              soundEngine.playVictoryFanfare();
            }

            // Overtake or Gift boost sound
            const currentBoostingCount = stateRes.participants.filter((p: any) => p.boostRemaining > 0).length;
            if (currentBoostingCount > prevBoostedCountRef.current) {
              const rocketActive = stateRes.participants.some((p: any) => p.boostType === 'rocket');
              soundEngine.playTurboSound(rocketActive);
            }
            prevBoostedCountRef.current = currentBoostingCount;

            prevPhaseRef.current = stateRes.phase;
          }
        }

        // Fetch speech queue
        if (config.narrationEnabled) {
          const speechRes = await fetch('/api/race/speech').then((r) => r.json());
          if (speechRes && speechRes.speech) {
            narrationEngine.speak(speechRes.speech);
          }
        }
      } catch (err) {
        // Silent network retry
      }
    }, 250);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [config.soundEnabled, config.narrationEnabled]);

  // 3. Low-frequency status & event feed polling (every 3000ms)
  useEffect(() => {
    const eventsInterval = setInterval(async () => {
      try {
        const [eventsRes, statusRes] = await Promise.all([
          fetch('/api/tiktok/events').then((r) => r.json()),
          fetch('/api/tiktok/status').then((r) => r.json()),
        ]);
        if (Array.isArray(eventsRes)) setRecentEvents(eventsRes);
        if (statusRes && !statusRes.error) setDiagnostics(statusRes);
      } catch (err) {
        // Silent retry
      }
    }, 3000);

    return () => clearInterval(eventsInterval);
  }, []);

  // Fullscreen management
  const handleToggleFullscreen = () => {
    soundEngine.unlockAudio();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Admin configuration updates
  const handleUpdateConfig = async (newConfig: Partial<RaceConfig>) => {
    try {
      const res = await fetch('/api/tiktok/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      }).then((r) => r.json());

      if (res && res.config) {
        setConfig(res.config);
        if (typeof newConfig.soundEnabled === 'boolean') {
          soundEngine.setMuted(!newConfig.soundEnabled);
        }
        if (typeof newConfig.narrationEnabled === 'boolean') {
          narrationEngine.setEnabled(newConfig.narrationEnabled);
        }
        if (typeof newConfig.narrationVolume === 'number') {
          soundEngine.setVolume(newConfig.narrationVolume);
          narrationEngine.setVolume(newConfig.narrationVolume);
        }
      }
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  };

  // Connection test action
  const handleTestConnection = async (tiktokUser: string, apiKey: string, webhookUrl: string) => {
    try {
      const res = await fetch('/api/tiktok/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiktokUsername: tiktokUser, eulerApiKey: apiKey, eulerWebhookUrl: webhookUrl }),
      }).then((r) => r.json());

      if (res) {
        setDiagnostics(res);
      }
    } catch (err) {
      setDiagnostics({
        status: 'error',
        tiktokConnected: false,
        eulerConnected: false,
        lastCheckedAt: Date.now(),
        errorMessage: 'Falha na comunicação com o servidor local.',
      });
    }
  };

  // Race operations
  const handleRaceAction = async (action: string, payload: any = {}) => {
    soundEngine.unlockAudio();
    try {
      await fetch('/api/race/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
    } catch (err) {
      console.error('Failed to perform race action:', err);
    }
  };

  return (
    <div
      onClick={() => soundEngine.unlockAudio()}
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans"
    >
      {viewMode === 'admin' ? (
        // Admin Dashboard View
        <AdminPanel
          config={config}
          raceState={raceState}
          diagnostics={diagnostics}
          recentEvents={recentEvents}
          raceHistory={raceHistory}
          onUpdateConfig={handleUpdateConfig}
          onTestConnection={handleTestConnection}
          onRaceAction={handleRaceAction}
          onOpenGameView={() => {
            soundEngine.unlockAudio();
            setViewMode('game');
          }}
        />
      ) : (
        // Exclusive Clean 3D Game / OBS Broadcast View
        <div className="relative w-full h-full overflow-hidden">
          {/* 3D WebGL Canvas Arena */}
          <RaceCanvas3D
            raceState={raceState}
            cameraAngle={cameraMode}
          />

          {/* Broadcast HUD Layer */}
          <RaceHUD
            raceState={raceState}
            config={config}
            cameraMode={cameraMode}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onToggleSound={() => handleUpdateConfig({ soundEnabled: !config.soundEnabled })}
            onToggleNarration={() => handleUpdateConfig({ narrationEnabled: !config.narrationEnabled })}
            onChangeCameraMode={(mode) => setCameraMode(mode)}
            onOpenAdmin={() => setViewMode('admin')}
          />
        </div>
      )}
    </div>
  );
}
