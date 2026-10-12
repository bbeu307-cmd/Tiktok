/**
 * TikTok Live Racing Arena - Administrative Dashboard
 * Streamer control center for Euler Stream API setup, lockable credentials,
 * race lifecycle controls, gift boosts configuration, and real-time live events feed.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Lock,
  Unlock,
  Radio,
  Play,
  Pause,
  RotateCcw,
  Square,
  ExternalLink,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Settings,
  Flame,
  Zap,
  Gift,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Activity,
  History,
  Car,
  Bike,
} from 'lucide-react';
import {
  RaceConfig,
  RaceState,
  ConnectionDiagnostics,
  LiveEvent,
  RaceHistoryRecord,
} from '../types/racing';
import { narrationEngine } from '../services/narrationEngine';

interface AdminPanelProps {
  config: RaceConfig & { hasApiKey: boolean; maskedKey: string };
  raceState: RaceState;
  diagnostics: ConnectionDiagnostics;
  recentEvents: LiveEvent[];
  raceHistory: RaceHistoryRecord[];
  onUpdateConfig: (newConfig: Partial<RaceConfig>) => Promise<void>;
  onTestConnection: (tiktokUser: string, apiKey: string, webhookUrl: string) => Promise<void>;
  onRaceAction: (action: string, payload?: any) => Promise<void>;
  onOpenGameView: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  config,
  raceState,
  diagnostics,
  recentEvents,
  raceHistory,
  onUpdateConfig,
  onTestConnection,
  onRaceAction,
  onOpenGameView,
}) => {
  // Local form state
  const [tiktokUsername, setTiktokUsername] = useState(config.tiktokUsername || '');
  const [eulerApiKey, setEulerApiKey] = useState('');
  const [eulerWebhookUrl, setEulerWebhookUrl] = useState(config.eulerWebhookUrl || '');
  const [isLocked, setIsLocked] = useState(config.isLocked || false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [customDuration, setCustomDuration] = useState(config.raceDurationSeconds || 120);
  const [selectedTab, setSelectedTab] = useState<'connections' | 'controls' | 'boosts' | 'events' | 'history'>('connections');

  // Confirmation dialogs
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Boost settings form
  const [boosts, setBoosts] = useState(config.boostSettings);

  // Speech voices available
  const [ptVoices, setPtVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setTiktokUsername(config.tiktokUsername);
    setEulerWebhookUrl(config.eulerWebhookUrl);
    setIsLocked(config.isLocked);
    setBoosts(config.boostSettings);
  }, [config]);

  useEffect(() => {
    const voices = narrationEngine.getAvailableVoices();
    setPtVoices(voices);
  }, []);

  const handleSaveAndLock = async () => {
    await onUpdateConfig({
      tiktokUsername,
      eulerApiKey: eulerApiKey || undefined,
      eulerWebhookUrl,
      isLocked: true,
      boostSettings: boosts,
    });
    setEulerApiKey(''); // Limpa o campo local por segurança
    setIsLocked(true);
  };

  const handleUnlock = async () => {
    await onUpdateConfig({ isLocked: false });
    setIsLocked(false);
  };

  const handleTest = async () => {
    setTestingConnection(true);
    try {
      await onTestConnection(tiktokUsername, eulerApiKey, eulerWebhookUrl);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleUnlink = async () => {
    if (window.confirm('Deseja realmente desvincular o TikTok e remover as chaves da API?')) {
      await onUpdateConfig({
        tiktokUsername: '',
        eulerApiKey: '',
        eulerWebhookUrl: '',
        isLocked: false,
      });
      setTiktokUsername('');
      setEulerApiKey('');
      setEulerWebhookUrl('');
      setIsLocked(false);
    }
  };

  const statusBadge = () => {
    switch (diagnostics.status) {
      case 'live':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
            <Radio className="w-3.5 h-3.5 text-rose-500" />
            AO VIVO NO TIKTOK
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            CONECTANDO
          </span>
        );
      case 'checking':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            VERIFICANDO
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-800">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            ERRO DE CONEXÃO
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <Radio className="w-3.5 h-3.5 text-slate-500" />
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 shadow-lg">
            <Flame className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="font-racing text-lg font-black tracking-wider text-white">
              TIKTOK LIVE RACING ARENA
            </h1>
            <p className="text-xs text-slate-400">
              Painel de Controle e Gestão da Corrida em Tempo Real
            </p>
          </div>
        </div>

        {/* Global Action: Open Clean Fullscreen Game Window */}
        <div className="flex items-center gap-3">
          {statusBadge()}
          <button
            onClick={onOpenGameView}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 hover:from-amber-400 to-yellow-500 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95"
          >
            <Eye className="w-4 h-4" />
            Abrir Jogo
          </button>
        </div>
      </header>

      {/* Quick Navigation Tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-800 bg-slate-900/40 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSelectedTab('connections')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            selectedTab === 'connections'
              ? 'border-amber-400 text-amber-400 bg-amber-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          Conexões & TikTok
        </button>
        <button
          onClick={() => setSelectedTab('controls')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            selectedTab === 'controls'
              ? 'border-amber-400 text-amber-400 bg-amber-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-4 h-4" />
          Controle da Corrida
        </button>
        <button
          onClick={() => setSelectedTab('boosts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            selectedTab === 'boosts'
              ? 'border-amber-400 text-amber-400 bg-amber-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          Presentes & Impulsos
        </button>
        <button
          onClick={() => setSelectedTab('events')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            selectedTab === 'events'
              ? 'border-amber-400 text-amber-400 bg-amber-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Feed da LIVE ({recentEvents.length})
        </button>
        <button
          onClick={() => setSelectedTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            selectedTab === 'history'
              ? 'border-amber-400 text-amber-400 bg-amber-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* --- TAB 1: CONEXÕES & TIKTOK --- */}
        {selectedTab === 'connections' && (
          <div className="space-y-6">
            {/* Status Card & Diagnostic Report */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  Status Atual da Transmissão
                </span>
                <span className="text-xs text-slate-500 font-telemetry">
                  Última verificação: {new Date(diagnostics.lastCheckedAt).toLocaleTimeString('pt-BR')}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white text-base">
                    <span>Conta TikTok:</span>
                    <span className="text-amber-400 font-mono">
                      {config.tiktokUsername ? config.tiktokUsername : 'Não vinculada'}
                    </span>
                  </div>
                  {diagnostics.errorMessage ? (
                    <p className="text-xs text-rose-400 font-medium">
                      ⚠️ {diagnostics.errorMessage}
                    </p>
                  ) : diagnostics.status === 'live' ? (
                    <p className="text-xs text-emerald-400 font-medium">
                      ✓ LIVE conectada com sucesso! Eventos e presentes sendo capturados.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Configure sua chave Euler Stream e @ do TikTok para verificar a live.
                    </p>
                  )}
                </div>

                <button
                  onClick={handleTest}
                  disabled={testingConnection || !config.tiktokUsername}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all disabled:opacity-50 active:scale-95 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
                  Testar Conexão Agora
                </button>
              </div>
            </div>

            {/* Lock / Security Warning */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isLocked
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-amber-950/20 border-amber-800/40'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <Lock className="w-4 h-4" />
                      Configurações Bloqueadas com Segurança
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <Unlock className="w-4 h-4" />
                      Modo de Edição Ativo
                    </div>
                  )}
                </div>

                {isLocked ? (
                  <button
                    onClick={handleUnlock}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 border border-slate-700 transition-all active:scale-95"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Desbloquear Configurações
                  </button>
                ) : (
                  <button
                    onClick={handleSaveAndLock}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-md active:scale-95"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Salvar e Bloquear
                  </button>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TikTok Handle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Seu @ do TikTok (sem senha)
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={tiktokUsername}
                    onChange={(e) => setTiktokUsername(e.target.value)}
                    placeholder="@seunome"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-sm text-white placeholder-slate-600 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-[11px] text-slate-500">
                    Basta informar o nome público. Jamais solicitamos sua senha.
                  </span>
                </div>

                {/* Euler Stream API Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>API Key do Euler Stream</span>
                    {config.hasApiKey && (
                      <span className="text-[11px] text-emerald-400 font-normal">
                        Chave salva no servidor: {config.maskedKey}
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    disabled={isLocked}
                    value={eulerApiKey}
                    onChange={(e) => setEulerApiKey(e.target.value)}
                    placeholder={config.hasApiKey ? 'Deixe em branco para manter a chave atual' : 'Insira sua chave API'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-sm text-white placeholder-slate-600 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                  />
                  <span className="text-[11px] text-slate-500">
                    A chave é enviada diretamente e armazenada com segurança no backend.
                  </span>
                </div>

                {/* Webhook / Custom Endpoint URL */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">
                    Endpoint do Webhook Euler Stream (Opcional)
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={eulerWebhookUrl}
                    onChange={(e) => setEulerWebhookUrl(e.target.value)}
                    placeholder="https://api.eulerstream.com/v1 ou webhook customizado"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-sm text-white placeholder-slate-600 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed font-mono text-xs"
                  />
                  <span className="text-[11px] text-slate-500">
                    URL do seu webhook para recebimento de comentários e presentes em tempo real.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {!isLocked && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-800">
                  <button
                    onClick={handleUnlink}
                    className="px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-all"
                  >
                    Desvincular TikTok e Chaves
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTest}
                      disabled={testingConnection || !tiktokUsername}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all disabled:opacity-50"
                    >
                      Testar Conexão
                    </button>
                    <button
                      onClick={handleSaveAndLock}
                      className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold uppercase transition-all shadow-md"
                    >
                      Salvar e Vincular
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: CONTROLE DA CORRIDA --- */}
        {selectedTab === 'controls' && (
          <div className="space-y-6">
            {/* Live Status Summary Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 font-bold uppercase">Fase Atual</span>
                <div className="text-2xl font-black text-amber-400 font-racing mt-1 uppercase">
                  {raceState.phase === 'waiting' && 'Sala de Espera'}
                  {raceState.phase === 'countdown' && 'Contagem'}
                  {raceState.phase === 'racing' && 'Em Corrida'}
                  {raceState.phase === 'finished' && 'Finalizada'}
                </div>
                <span className="text-xs text-slate-500">
                  Tempo restante: {Math.ceil(raceState.phaseTimeRemaining)}s
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 font-bold uppercase">Competidores</span>
                <div className="text-2xl font-black text-white font-racing mt-1">
                  {raceState.participants.length} Pilotos
                </div>
                <span className="text-xs text-slate-500">
                  Mínimo para iniciar: {config.minParticipants}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 font-bold uppercase">Líder da Rodada</span>
                <div className="text-2xl font-black text-cyan-400 font-racing mt-1 truncate">
                  {raceState.winner
                    ? raceState.winner.nickname
                    : raceState.participants[0]
                    ? raceState.participants[0].nickname
                    : 'Aguardando'}
                </div>
                <span className="text-xs text-slate-500">
                  Rodada #{raceState.raceRoundNumber}
                </span>
              </div>
            </div>

            {/* Main Action Control Buttons */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Comandos de Operação
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Start Button */}
                <button
                  onClick={() => onRaceAction('start')}
                  disabled={raceState.phase === 'racing' || raceState.participants.length < config.minParticipants}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  <Play className="w-4 h-4" />
                  Iniciar Corrida
                </button>

                {/* Pause / Resume Button */}
                <button
                  onClick={() => onRaceAction(raceState.isPaused ? 'resume' : 'pause')}
                  disabled={raceState.phase !== 'racing'}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs uppercase transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  {raceState.isPaused ? (
                    <>
                      <Play className="w-4 h-4" />
                      Retomar
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      Pausar
                    </>
                  )}
                </button>

                {/* End Button with confirm */}
                {confirmEnd ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        onRaceAction('end');
                        setConfirmEnd(false);
                      }}
                      className="w-1/2 p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setConfirmEnd(false)}
                      className="w-1/2 p-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs uppercase"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmEnd(true)}
                    disabled={raceState.phase !== 'racing'}
                    className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-extrabold text-xs uppercase transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Square className="w-4 h-4" />
                    Encerrar
                  </button>
                )}

                {/* Reset Round with confirm */}
                {confirmReset ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        onRaceAction('reset');
                        setConfirmReset(false);
                      }}
                      className="w-1/2 p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="w-1/2 p-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs uppercase"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs uppercase transition-all shadow-md active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reiniciar Rodada
                  </button>
                )}
              </div>
            </div>

            {/* Duration Settings */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Duração da Corrida
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {[60, 120, 180, 300, 600].map((secs) => (
                  <button
                    key={secs}
                    onClick={() => {
                      setCustomDuration(secs);
                      onRaceAction('duration', { durationSeconds: secs });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      config.raceDurationSeconds === secs
                        ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {secs / 60} {secs === 60 ? 'minuto' : 'minutos'}
                  </button>
                ))}

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-slate-400">Personalizado (segundos):</span>
                  <input
                    type="number"
                    min="30"
                    max="1800"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-telemetry"
                  />
                  <button
                    onClick={() => onRaceAction('duration', { durationSeconds: customDuration })}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>

            {/* Audio & Brazilian Portuguese Narration Options */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Áudio e Narração em Português (pt-BR)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Narration Enable & Voice */}
                <div className="space-y-2 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Mic className="w-4 h-4 text-amber-400" />
                      Narração em Português
                    </span>
                    <button
                      onClick={() => onUpdateConfig({ narrationEnabled: !config.narrationEnabled })}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        config.narrationEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {config.narrationEnabled ? 'Ativada' : 'Desativada'}
                    </button>
                  </div>

                  <div className="pt-2">
                    <label className="text-[11px] text-slate-400">Voz do Locutor:</label>
                    <select
                      value={config.narrationVoice}
                      onChange={(e) => {
                        onUpdateConfig({ narrationVoice: e.target.value });
                        narrationEngine.setVoiceByName(e.target.value);
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none"
                    >
                      {ptVoices.length === 0 ? (
                        <option value="">Voz padrão do navegador (pt-BR)</option>
                      ) : (
                        ptVoices.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({v.lang})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Sound SFX */}
                <div className="space-y-2 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                      Efeitos Sonoros (Motores e Turbos)
                    </span>
                    <button
                      onClick={() => onUpdateConfig({ soundEnabled: !config.soundEnabled })}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        config.soundEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {config.soundEnabled ? 'Ativado' : 'Silenciado'}
                    </button>
                  </div>

                  <div className="pt-2 space-y-1">
                    <label className="text-[11px] text-slate-400">Volume dos Efeitos:</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.narrationVolume}
                      onChange={(e) => onUpdateConfig({ narrationVolume: Number(e.target.value) })}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: PRESENTES & IMPULSOS --- */}
        {selectedTab === 'boosts' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-400" />
                  Configuração de Presentes do TikTok e Impulsos Turbo
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure os segundos de turbo concedidos por moedas e presentes especiais na LIVE.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-300">1 Moeda (TikTok)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={boosts.coins1}
                      onChange={(e) => setBoosts({ ...boosts, coins1: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white font-telemetry"
                    />
                    <span className="text-xs text-slate-400">segundos</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-300">2 Moedas</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={boosts.coins2}
                      onChange={(e) => setBoosts({ ...boosts, coins2: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white font-telemetry"
                    />
                    <span className="text-xs text-slate-400">segundos</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-300">5 Moedas</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={boosts.coins5}
                      onChange={(e) => setBoosts({ ...boosts, coins5: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white font-telemetry"
                    />
                    <span className="text-xs text-slate-400">segundos</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-300">10 Moedas</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={boosts.coins10}
                      onChange={(e) => setBoosts({ ...boosts, coins10: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white font-telemetry"
                    />
                    <span className="text-xs text-slate-400">segundos</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-900/40 space-y-1">
                  <span className="text-xs font-bold text-rose-400">Presente: Rosa (Rose)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={boosts.roseBoost}
                      onChange={(e) => setBoosts({ ...boosts, roseBoost: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white font-telemetry"
                    />
                    <span className="text-xs text-slate-400">segundos</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-amber-900/40 space-y-1">
                  <span className="text-xs font-bold text-amber-400">Presente: Foguete (Rocket)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={boosts.rocketBoost}
                      onChange={(e) => setBoosts({ ...boosts, rocketBoost: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white font-telemetry"
                    />
                    <span className="text-xs text-slate-400">segundos</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => onUpdateConfig({ boostSettings: boosts })}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase shadow-md transition-all active:scale-95"
                >
                  Salvar Parâmetros de Impulsos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 4: FEED DA LIVE --- */}
        {selectedTab === 'events' && (
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Eventos e Comentários Processados
              </span>
              <span className="text-xs text-slate-500">
                Desduplicação e regras estritas ativas
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {recentEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhum evento registrado ainda. Conecte sua LIVE para receber comentários e presentes reais.
                </div>
              ) : (
                recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-500 font-telemetry text-[11px]">
                        {new Date(evt.timestamp).toLocaleTimeString('pt-BR')}
                      </span>
                      <span className="font-bold text-white">{evt.user.username}:</span>
                      {evt.comment && <span className="text-slate-300">"{evt.comment}"</span>}
                      {evt.gift && (
                        <span className="text-amber-400 font-bold">
                          Presente: {evt.gift.name} ({evt.gift.coins} moedas)
                        </span>
                      )}
                    </div>
                    {evt.actionTaken && (
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">
                        {evt.actionTaken}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- TAB 5: HISTÓRICO --- */}
        {selectedTab === 'history' && (
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Histórico das Corridas Anteriores
            </span>

            <div className="space-y-3">
              {raceHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhuma corrida concluída nesta sessão ainda.
                </div>
              ) : (
                raceHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-racing font-bold text-amber-400">
                          RODADA #{rec.roundNumber}
                        </span>
                        <span className="text-slate-500 font-telemetry">({rec.date})</span>
                      </div>
                      <div className="text-white font-semibold">
                        Vencedor:{' '}
                        <strong className="text-amber-300 font-bold">{rec.winner.nickname}</strong>{' '}
                        ({rec.winner.vehicleType === 'car' ? 'Carro' : 'Moto'})
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400 font-telemetry text-xs">
                      <span>Duração: {rec.durationSeconds}s</span>
                      <span>Pilotos: {rec.participantCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
