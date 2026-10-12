/**
 * TikTok Live Racing Arena - Server Race Engine
 * Authoritative game loop, Euler Stream API integration, gift processing, and deduplication.
 */

import {
  RaceConfig,
  RaceState,
  Participant,
  LiveEvent,
  LiveConnectionStatus,
  ConnectionDiagnostics,
  RaceHistoryRecord,
} from '../types/racing.ts';

const CAR_COLORS = [
  { primary: '#EF4444', secondary: '#111827' }, // Racing Red
  { primary: '#3B82F6', secondary: '#FFFFFF' }, // Electric Blue
  { primary: '#10B981', secondary: '#064E3B' }, // Emerald Green
  { primary: '#F59E0B', secondary: '#78350F' }, // Amber Yellow
  { primary: '#8B5CF6', secondary: '#4C1D95' }, // Cyber Purple
  { primary: '#EC4899', secondary: '#831843' }, // Hot Pink
  { primary: '#14B8A6', secondary: '#134E4A' }, // Cyan Teal
  { primary: '#F97316', secondary: '#7C2D12' }, // Neon Orange
  { primary: '#E2E8F0', secondary: '#0F172A' }, // Polar White
  { primary: '#1E293B', secondary: '#E2E8F0' }, // Stealth Slate
];

const BIKE_COLORS = [
  { primary: '#E11D48', secondary: '#4C0519' }, // Ducati Crimson
  { primary: '#2563EB', secondary: '#1E3A8A' }, // Yamaha Blue
  { primary: '#16A34A', secondary: '#14532D' }, // Kawasaki Lime
  { primary: '#D97706', secondary: '#78350F' }, // Repsol Orange
  { primary: '#9333EA', secondary: '#3B0764' }, // Hyper Violet
  { primary: '#0891B2', secondary: '#164E63' }, // Petronas Cyan
  { primary: '#EA580C', secondary: '#7C2D12' }, // KTM Blaze
  { primary: '#F8FAFC', secondary: '#334155' }, // Alpine Silver
];

export class RaceEngine {
  private config: RaceConfig;
  private state: RaceState;
  private diagnostics: ConnectionDiagnostics;
  private recentEvents: LiveEvent[] = [];
  private processedEventIds = new Set<string>();
  private speechQueue: string[] = [];
  private raceHistory: RaceHistoryRecord[] = [];
  private lastTickTime: number = Date.now();
  private tickInterval: NodeJS.Timeout | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private cameraDirectorTimer: number = 0;
  private cameraState: 'leader' | 'gift' | 'backmarker' | 'battle' = 'leader';

  constructor() {
    this.config = {
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
      boostSettings: {
        coins1: 2,
        coins2: 4,
        coins5: 10,
        coins10: 20,
        roseBoost: 3,
        rocketBoost: 15,
      },
    };

    this.diagnostics = {
      status: 'offline',
      tiktokConnected: false,
      eulerConnected: false,
      lastCheckedAt: Date.now(),
      errorMessage: 'Nenhuma credencial configurada. Vincule seu TikTok e API Key do Euler Stream.',
    };

    this.state = {
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
    };

    this.startEngineLoop();
  }

  // --- Engine Tick Loop (30 Hz) ---
  private startEngineLoop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.lastTickTime = Date.now();

    this.tickInterval = setInterval(() => {
      const now = Date.now();
      const dt = Math.min((now - this.lastTickTime) / 1000, 0.1);
      this.lastTickTime = now;

      if (!this.state.isPaused) {
        this.update(dt);
      }
    }, 1000 / 30);
  }

  public update(dt: number) {
    this.state.lastUpdated = Date.now();

    switch (this.state.phase) {
      case 'waiting':
        this.updateWaitingPhase(dt);
        break;
      case 'countdown':
        this.updateCountdownPhase(dt);
        break;
      case 'racing':
        this.updateRacingPhase(dt);
        break;
      case 'finished':
        this.updateFinishedPhase(dt);
        break;
    }
  }

  // 1. Sala de Espera (2 minutos inicial, mínimo 2 jogadores, +1 min prorrogação)
  private updateWaitingPhase(dt: number) {
    this.state.phaseTimeRemaining = Math.max(0, this.state.phaseTimeRemaining - dt);

    if (this.state.phaseTimeRemaining <= 0) {
      const count = this.state.participants.length;

      if (count >= this.config.minParticipants) {
        // Iniciar contagem regressiva
        this.state.phase = 'countdown';
        this.state.countdownNumber = 3;
        this.state.phaseTimeRemaining = 3;
        this.queueSpeech('Atenção, pilotos! A corrida vai começar!');
        this.addSystemEvent('Sala de espera concluída! Iniciando contagem regressiva.');
      } else if (count === 1) {
        // Prorrogar por mais 1 minuto (60 segundos)
        this.state.phaseTimeRemaining = 60;
        this.state.waitingExtensionsCount += 1;
        const participant = this.state.participants[0];
        this.queueSpeech(`Apenas um piloto no grid! Aguardando mais um competidor para desafiar ${participant.nickname}. Mais um minuto!`);
        this.addSystemEvent('Prorrogação de 1 minuto: necessário no mínimo 2 jogadores para iniciar.');
      } else {
        // 0 jogadores: reiniciar espera de 2 minutos
        this.state.phaseTimeRemaining = this.config.waitingDurationSeconds;
        this.addSystemEvent('Aguardando comentários "carro" ou "moto" no chat da LIVE.');
      }
    }
  }

  // 2. Contagem Regressiva (3, 2, 1, GO!)
  private updateCountdownPhase(dt: number) {
    const prevSec = Math.ceil(this.state.phaseTimeRemaining);
    this.state.phaseTimeRemaining = Math.max(0, this.state.phaseTimeRemaining - dt);
    const currSec = Math.ceil(this.state.phaseTimeRemaining);

    if (currSec !== prevSec && currSec > 0) {
      this.state.countdownNumber = currSec;
      this.queueSpeech(`${currSec}!`);
    }

    if (this.state.phaseTimeRemaining <= 0) {
      this.state.phase = 'racing';
      this.state.phaseTimeRemaining = this.config.raceDurationSeconds;
      this.state.totalRaceDuration = this.config.raceDurationSeconds;
      this.state.elapsedRaceTime = 0;
      this.state.countdownNumber = 0;
      this.queueSpeech('Três, dois, um... GO! Bandeira verde liberada!');
      this.addSystemEvent('LARGADA! Corrida em andamento!');
    }
  }

  // 3. Em Corrida (Física, ultrapassagens, turbos, câmeras dinâmicas)
  private updateRacingPhase(dt: number) {
    this.state.phaseTimeRemaining = Math.max(0, this.state.phaseTimeRemaining - dt);
    this.state.elapsedRaceTime += dt;

    // Atualização de física e distância de cada veículo
    for (const p of this.state.participants) {
      // Decaimento de boost
      let isBoosting = false;
      let boostFactor = 1.0;
      if (p.boostRemaining > 0) {
        p.boostRemaining = Math.max(0, p.boostRemaining - dt);
        isBoosting = true;
        boostFactor = p.boostType === 'rocket' ? 1.45 : p.boostMultiplier || 1.25;
        if (p.boostRemaining <= 0) {
          p.boostType = 'none';
          p.boostMultiplier = 1.0;
        }
      }

      // Variação orgânica e aceleração realista (carros e motos disputam igualmente)
      const targetSpeed = p.baseSpeed * boostFactor + (Math.sin(Date.now() / 3000 + p.modelIndex) * 4);
      p.speed += (targetSpeed - p.speed) * Math.min(dt * 2.5, 1.0);

      // Conversão km/h para m/s: 1 km/h = 1/3.6 m/s
      const deltaMeters = (p.speed / 3.6) * dt;
      p.distance += deltaMeters;

      // Troca suave de pistas para evitar colisão e dar efeito de ultrapassagem
      p.lane += (p.targetLane - p.lane) * Math.min(dt * 1.5, 1.0);
      if (Math.random() < 0.008) {
        p.targetLane = (Math.random() * 3.2) - 1.6;
      }
    }

    // Ordenar participantes por distância percorrida
    const sorted = [...this.state.participants].sort((a, b) => b.distance - a.distance);
    const previousLeaderId = this.state.leaderId;

    sorted.forEach((p, index) => {
      p.position = index + 1;
      p.isLeader = index === 0;
    });

    const newLeader = sorted[0] || null;
    this.state.leaderId = newLeader ? newLeader.userId : null;
    this.state.previousLeaderId = previousLeaderId;

    // Notificação de ultrapassagem da liderança
    if (newLeader && previousLeaderId && newLeader.userId !== previousLeaderId) {
      this.queueSpeech(`${newLeader.nickname} assumiu a liderança! Nova coroa de ouro!`);
      this.addSystemEvent(`${newLeader.nickname} ultrapassou e assumiu o 1º lugar!`);
      // Foco imediato na nova disputa
      this.state.activeFocusParticipantId = newLeader.userId;
      this.state.focusReason = 'overtake';
      this.state.focusExpiresAt = Date.now() + 4000;
    }

    // Anúncio de últimos 10 segundos
    if (this.state.phaseTimeRemaining <= 10 && this.state.phaseTimeRemaining + dt > 10) {
      this.queueSpeech('Últimos dez segundos de prova!');
      this.addSystemEvent('Últimos 10 segundos de corrida!');
    }

    // Coreografia de Câmeras Dinâmicas
    this.updateCameraDirector(dt, sorted);

    // Verificação de fim de prova
    if (this.state.phaseTimeRemaining <= 0) {
      this.finishRace(sorted);
    }
  }

  // Diretor Automático de Câmeras
  private updateCameraDirector(dt: number, sorted: Participant[]) {
    if (this.config.cameraMode !== 'auto') {
      return;
    }

    const now = Date.now();
    if (now < this.state.focusExpiresAt) {
      return; // Mantém o foco prioritário (ex: presente por 5s ou ultrapassagem)
    }

    this.cameraDirectorTimer += dt;

    if (this.cameraState === 'leader' && this.cameraDirectorTimer >= 5.0) {
      // Transiciona para os últimos colocados por ~3s
      this.cameraDirectorTimer = 0;
      this.cameraState = 'backmarker';
      const backmarker = sorted[sorted.length - 1];
      if (backmarker) {
        this.state.activeFocusParticipantId = backmarker.userId;
        this.state.focusReason = 'backmarker';
        this.state.focusExpiresAt = now + 3000;
      }
    } else if (this.cameraState === 'backmarker' && this.cameraDirectorTimer >= 3.0) {
      // Transiciona para disputa acirrada ou volta para o líder
      this.cameraDirectorTimer = 0;
      this.cameraState = 'battle';
      // Procura 2 participantes com distância muito próxima
      let battleParticipant = sorted[0];
      for (let i = 0; i < sorted.length - 1; i++) {
        if (Math.abs(sorted[i].distance - sorted[i + 1].distance) < 25) {
          battleParticipant = sorted[i + 1];
          break;
        }
      }
      this.state.activeFocusParticipantId = battleParticipant ? battleParticipant.userId : null;
      this.state.focusReason = 'normal';
      this.state.focusExpiresAt = now + 4000;
    } else if (this.cameraState === 'battle' && this.cameraDirectorTimer >= 4.0) {
      // Retorna para o líder por 5s
      this.cameraDirectorTimer = 0;
      this.cameraState = 'leader';
      const leader = sorted[0];
      if (leader) {
        this.state.activeFocusParticipantId = leader.userId;
        this.state.focusReason = 'leader';
        this.state.focusExpiresAt = now + 5000;
      }
    } else if (!this.state.activeFocusParticipantId && sorted[0]) {
      this.state.activeFocusParticipantId = sorted[0].userId;
      this.state.focusReason = 'leader';
      this.state.focusExpiresAt = now + 5000;
    }
  }

  // 4. Finalização da Corrida & Transição Automática
  private finishRace(sorted: Participant[]) {
    this.state.phase = 'finished';
    this.state.phaseTimeRemaining = 15; // 15 segundos de pódio e comemoração
    this.state.winner = sorted[0] || null;
    this.state.podium = sorted.slice(0, 3);

    if (this.state.winner) {
      const winnerName = this.state.winner.nickname;
      this.queueSpeech(`Temos um vencedor! Parabéns, ${winnerName}! Grande vitória na TikTok Live Racing Arena!`);
      this.addSystemEvent(`Vencedor da Rodada #${this.state.raceRoundNumber}: ${winnerName}!`);

      // Salva no histórico
      this.raceHistory.unshift({
        id: `race_${Date.now()}`,
        roundNumber: this.state.raceRoundNumber,
        date: new Date().toLocaleTimeString('pt-BR'),
        durationSeconds: this.state.totalRaceDuration,
        winner: {
          username: this.state.winner.username,
          nickname: this.state.winner.nickname,
          vehicleType: this.state.winner.vehicleType,
        },
        podium: this.state.podium.map((p, idx) => ({
          position: idx + 1,
          username: p.username,
          vehicleType: p.vehicleType,
        })),
        participantCount: this.state.participants.length,
      });

      if (this.raceHistory.length > 20) {
        this.raceHistory.pop();
      }
    }
  }

  // 5. Fase de Pódio e Transição para Nova Corrida Automática
  private updateFinishedPhase(dt: number) {
    this.state.phaseTimeRemaining = Math.max(0, this.state.phaseTimeRemaining - dt);

    if (this.state.phaseTimeRemaining <= 0) {
      // Reiniciar rodada automaticamente com nova sala de espera
      this.resetRound();
      this.queueSpeech('Nova rodada iniciando! Comentem carro ou moto para entrar no grid!');
    }
  }

  // --- Processamento de Comentários da TikTok LIVE ("carro" ou "moto") ---
  public handleComment(userId: string, username: string, nickname: string, text: string, avatarUrl?: string): { success: boolean; message: string; participant?: Participant } {
    const cleanText = text.toLowerCase().trim();
    const wantsCar = cleanText.includes('carro') || cleanText === 'car';
    const wantsBike = cleanText.includes('moto') || cleanText === 'bike';

    if (!wantsCar && !wantsBike) {
      return { success: false, message: 'Comentário não é comando de veículo' };
    }

    // Regra estrita: verificar se já está na corrida pelo identificador único (userId)
    const existing = this.state.participants.find(p => p.userId === userId);
    if (existing) {
      const msg = `@${existing.nickname || existing.username} já está na corrida com um ${existing.vehicleType === 'car' ? 'carro' : 'moto'}!`;
      this.addEvent({
        id: `evt_${Date.now()}_${Math.random()}`,
        type: 'comment',
        timestamp: Date.now(),
        user: { userId, username, nickname, avatarUrl },
        comment: text,
        actionTaken: msg,
      });
      return { success: false, message: msg };
    }

    // Apenas pode entrar na fase de sala de espera (ou se configurado para entrar no início)
    if (this.state.phase !== 'waiting') {
      return { success: false, message: 'Grid fechado! Corrida já em andamento. Aguarde a próxima rodada!' };
    }

    const vehicleType = wantsCar ? 'car' : 'bike';
    const colorsList = vehicleType === 'car' ? CAR_COLORS : BIKE_COLORS;
    const colorScheme = colorsList[this.state.participants.length % colorsList.length];
    const modelIndex = Math.floor(Math.random() * 3);

    // Velocidade base equilibrada entre carros e motos (160 a 175 km/h)
    const baseSpeed = 165 + (Math.random() * 10 - 5);

    const newParticipant: Participant = {
      userId,
      username: username.startsWith('@') ? username : `@${username}`,
      nickname: nickname || username.replace('@', ''),
      avatarUrl,
      vehicleType,
      color: colorScheme.primary,
      secondaryColor: colorScheme.secondary,
      modelIndex,
      distance: 0,
      speed: 0,
      baseSpeed,
      lane: (Math.random() * 3) - 1.5,
      targetLane: (Math.random() * 3) - 1.5,
      boostRemaining: 0,
      boostType: 'none',
      boostMultiplier: 1.0,
      position: this.state.participants.length + 1,
      joinedAt: Date.now(),
      isLeader: false,
      totalGiftsReceived: 0,
    };

    this.state.participants.push(newParticipant);

    this.addEvent({
      id: `evt_${Date.now()}_${Math.random()}`,
      type: 'join',
      timestamp: Date.now(),
      user: { userId, username, nickname, avatarUrl },
      comment: text,
      actionTaken: `Entrou na pista com ${vehicleType === 'car' ? 'Carro' : 'Moto'}!`,
    });

    return { success: true, message: `${newParticipant.nickname} entrou com ${vehicleType === 'car' ? 'Carro' : 'Moto'}!`, participant: newParticipant };
  }

  // --- Processamento de Presentes e Impulsos da TikTok LIVE ---
  public handleGift(
    userId: string,
    username: string,
    nickname: string,
    giftName: string,
    coins: number,
    giftCount: number = 1,
    avatarUrl?: string,
    eventId?: string
  ): { success: boolean; message: string; targetParticipant?: Participant } {
    // Desduplicação de evento
    if (eventId) {
      if (this.processedEventIds.has(eventId)) {
        return { success: false, message: 'Evento de presente duplicado ignorado.' };
      }
      this.processedEventIds.add(eventId);
      if (this.processedEventIds.size > 2000) {
        const firstKey = this.processedEventIds.values().next().value;
        if (firstKey) this.processedEventIds.delete(firstKey);
      }
    }

    const totalCoins = (coins || 1) * giftCount;
    const lowerGift = giftName.toLowerCase();

    // Determina o tempo de boost baseado nas regras configuráveis
    let boostSeconds = 2;
    let boostType: Participant['boostType'] = 'coins';
    let multiplier = 1.25;

    if (lowerGift.includes('foguete') || lowerGift.includes('rocket')) {
      boostSeconds = this.config.boostSettings.rocketBoost;
      boostType = 'rocket';
      multiplier = 1.45;
    } else if (lowerGift.includes('rosa') || lowerGift.includes('rose')) {
      boostSeconds = this.config.boostSettings.roseBoost;
      boostType = 'light';
      multiplier = 1.2;
    } else if (totalCoins >= 10) {
      boostSeconds = this.config.boostSettings.coins10;
      multiplier = 1.35;
    } else if (totalCoins >= 5) {
      boostSeconds = this.config.boostSettings.coins5;
      multiplier = 1.3;
    } else if (totalCoins >= 2) {
      boostSeconds = this.config.boostSettings.coins2;
      multiplier = 1.25;
    } else {
      boostSeconds = this.config.boostSettings.coins1;
      multiplier = 1.2;
    }

    // Busca se o apoiador já tem veículo na corrida
    let target = this.state.participants.find(p => p.userId === userId);

    // Se o apoiador não participa, beneficia o líder ou o mais próximo
    let isExternalSupporter = false;
    if (!target) {
      isExternalSupporter = true;
      if (this.state.participants.length > 0) {
        // Beneficia o líder ou quem está disputando
        target = this.state.participants.find(p => p.isLeader) || this.state.participants[0];
      }
    }

    if (target && this.state.phase === 'racing') {
      target.boostRemaining += boostSeconds;
      target.boostType = boostType;
      target.boostMultiplier = multiplier;
      target.totalGiftsReceived += totalCoins;

      // Câmera dinâmica foca no veículo beneficiado por 5 segundos
      this.state.activeFocusParticipantId = target.userId;
      this.state.focusReason = 'gift';
      this.state.focusExpiresAt = Date.now() + 5000;

      // Narração
      if (isExternalSupporter) {
        this.queueSpeech(`@${nickname || username} enviou ${giftName}! Impulso turbo concedido para ${target.nickname}!`);
      } else {
        if (boostType === 'rocket') {
          this.queueSpeech(`Foguete na pista! ${target.nickname} ativou o super turbo!`);
        } else {
          this.queueSpeech(`Tem turbo na pista! ${target.nickname} recebeu um impulso de ${boostSeconds} segundos!`);
        }
      }

      this.addEvent({
        id: eventId || `gift_${Date.now()}_${Math.random()}`,
        type: 'gift',
        timestamp: Date.now(),
        user: { userId, username, nickname, avatarUrl },
        gift: { name: giftName, count: giftCount, coins: totalCoins },
        actionTaken: `+${boostSeconds}s de turbo para ${target.nickname}!`,
      });

      return { success: true, message: `Turbo de ${boostSeconds}s aplicado para ${target.nickname}`, targetParticipant: target };
    }

    return { success: true, message: `Presente registrado. (Corrida não iniciada ou sem participantes)` };
  }

  // --- Fila e Gerenciador de Narração ---
  private queueSpeech(text: string) {
    if (!this.config.narrationEnabled) return;
    this.speechQueue.push(text);
    if (this.speechQueue.length > 10) {
      this.speechQueue.shift();
    }
  }

  public popNextSpeech(): string | null {
    return this.speechQueue.shift() || null;
  }

  // --- Gestão de Eventos e Histórico ---
  private addEvent(evt: LiveEvent) {
    this.recentEvents.unshift(evt);
    if (this.recentEvents.length > 50) {
      this.recentEvents.pop();
    }
  }

  private addSystemEvent(msg: string) {
    this.addEvent({
      id: `sys_${Date.now()}_${Math.random()}`,
      type: 'system',
      timestamp: Date.now(),
      user: { userId: 'system', username: '@sistema', nickname: 'Sistema' },
      actionTaken: msg,
    });
  }

  // --- Ações de Controle Administrativo ---
  public startRaceNow() {
    if (this.state.participants.length < this.config.minParticipants) {
      return { success: false, message: `Mínimo de ${this.config.minParticipants} participantes necessários para iniciar.` };
    }
    this.state.phase = 'countdown';
    this.state.countdownNumber = 3;
    this.state.phaseTimeRemaining = 3;
    this.queueSpeech('Contagem iniciada manualmente pelo controle!');
    this.addSystemEvent('Corrida iniciada via painel.');
    return { success: true, message: 'Contagem iniciada.' };
  }

  public pauseRace() {
    this.state.isPaused = true;
    this.addSystemEvent('Corrida pausada pelo administrador.');
    return { success: true };
  }

  public resumeRace() {
    this.state.isPaused = false;
    this.addSystemEvent('Corrida retomada.');
    return { success: true };
  }

  public endRaceNow() {
    if (this.state.phase === 'racing') {
      const sorted = [...this.state.participants].sort((a, b) => b.distance - a.distance);
      this.finishRace(sorted);
      return { success: true, message: 'Corrida encerrada pelo administrador.' };
    }
    return { success: false, message: 'Corrida não está em andamento.' };
  }

  public resetRound() {
    this.state.phase = 'waiting';
    this.state.phaseTimeRemaining = this.config.waitingDurationSeconds;
    this.state.countdownNumber = 3;
    this.state.elapsedRaceTime = 0;
    this.state.totalRaceDuration = this.config.raceDurationSeconds;
    this.state.participants = [];
    this.state.leaderId = null;
    this.state.previousLeaderId = null;
    this.state.activeFocusParticipantId = null;
    this.state.waitingExtensionsCount = 0;
    this.state.winner = null;
    this.state.podium = [];
    this.state.raceRoundNumber += 1;
    this.state.isPaused = false;
    this.addSystemEvent(`Rodada #${this.state.raceRoundNumber} aberta na sala de espera.`);
    return { success: true, message: 'Rodada reiniciada.' };
  }

  public updateDuration(seconds: number) {
    this.config.raceDurationSeconds = seconds;
    if (this.state.phase === 'waiting' || this.state.phase === 'countdown') {
      this.state.totalRaceDuration = seconds;
      this.state.phaseTimeRemaining = seconds;
    }
    return { success: true };
  }

  public updateConfig(newConfig: Partial<RaceConfig>) {
    this.config = { ...this.config, ...newConfig };
    return { success: true, config: this.getPublicConfig() };
  }

  // --- Conexão Real com a API Euler Stream ---
  public async testEulerConnection(tiktokUser: string, apiKey: string, webhookUrl?: string): Promise<ConnectionDiagnostics> {
    this.diagnostics.status = 'checking';
    this.diagnostics.lastCheckedAt = Date.now();

    const cleanUser = (tiktokUser || '').replace('@', '').trim();

    if (!cleanUser) {
      this.diagnostics.status = 'error';
      this.diagnostics.errorMessage = 'Informe o @ do TikTok para verificar o status da LIVE.';
      return this.diagnostics;
    }

    if (!apiKey) {
      this.diagnostics.status = 'error';
      this.diagnostics.errorMessage = 'Informe a API Key do Euler Stream.';
      return this.diagnostics;
    }

    try {
      // Chamada real para Euler Stream API
      // Base URL oficial do Euler Stream: https://api.eulerstream.com/v1
      const endpoint = `https://api.eulerstream.com/v1/tiktok/live/status?unique_id=${encodeURIComponent(cleanUser)}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'TikTokLiveRacingArena/1.0',
        },
      });

      if (response.status === 401 || response.status === 403) {
        this.diagnostics.status = 'error';
        this.diagnostics.eulerConnected = false;
        this.diagnostics.errorMessage = 'API Key do Euler Stream inválida ou sem permissão de acesso (HTTP 401/403).';
        return this.diagnostics;
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.diagnostics.status = 'error';
        this.diagnostics.errorMessage = `Erro retornado pela API Euler Stream (HTTP ${response.status}): ${errorText.slice(0, 150)}`;
        return this.diagnostics;
      }

      const data = await response.json() as any;
      const isLive = data?.is_live === true || data?.status === 'LIVE' || data?.room_status === 1;

      this.diagnostics.eulerConnected = true;
      this.diagnostics.tiktokConnected = true;
      this.diagnostics.status = isLive ? 'live' : 'offline';
      this.diagnostics.viewerCount = data?.viewer_count || data?.viewers || 0;
      this.diagnostics.activeRoomId = data?.room_id || data?.roomId || undefined;
      this.diagnostics.errorMessage = isLive
        ? undefined
        : `A conta @${cleanUser} está OFFLINE no TikTok. Inicie a transmissão ao vivo no TikTok para os eventos fluírem.`;

      return this.diagnostics;
    } catch (err: any) {
      this.diagnostics.status = 'error';
      this.diagnostics.errorMessage = `Falha na requisição de rede com Euler Stream: ${err?.message || 'Servidor inacessível'}.`;
      return this.diagnostics;
    }
  }

  // Iniciar monitoramento contínuo da LIVE se credenciais existirem
  public startLiveMonitoring() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      if (this.config.tiktokUsername && this.config.eulerApiKey) {
        await this.testEulerConnection(this.config.tiktokUsername, this.config.eulerApiKey);
      }
    }, 20000); // Checa a cada 20 segundos
  }

  // --- Getters ---
  public getState(): RaceState {
    return this.state;
  }

  public getDiagnostics(): ConnectionDiagnostics {
    return this.diagnostics;
  }

  public getRecentEvents(): LiveEvent[] {
    return this.recentEvents;
  }

  public getRaceHistory(): RaceHistoryRecord[] {
    return this.raceHistory;
  }

  public getPublicConfig(): Omit<RaceConfig, 'eulerApiKey'> & { hasApiKey: boolean; maskedKey: string } {
    const key = this.config.eulerApiKey;
    return {
      ...this.config,
      hasApiKey: Boolean(key && key.length > 4),
      maskedKey: key ? `${key.slice(0, 4)}••••••••${key.slice(-4)}` : '',
    };
  }

  public getSecretApiKey(): string {
    return this.config.eulerApiKey;
  }
}

// Instância Singleton do motor no servidor
export const raceEngine = new RaceEngine();
