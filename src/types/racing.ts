/**
 * TikTok Live Racing Arena - Type Definitions
 */

export type VehicleType = 'car' | 'bike';

export type BoostType = 'none' | 'light' | 'rocket' | 'coins';

export interface Participant {
  userId: string;
  username: string; // e.g. "@daniela"
  nickname: string;
  avatarUrl?: string;
  vehicleType: VehicleType;
  color: string;
  secondaryColor: string;
  modelIndex: number;
  distance: number; // In meters
  speed: number; // Current km/h
  baseSpeed: number; // Base speed variation for fair competition
  lane: number; // -1.8 to 1.8 across track width
  targetLane: number;
  boostRemaining: number; // Seconds
  boostType: BoostType;
  boostMultiplier: number;
  position: number; // 1 = 1st place, etc.
  joinedAt: number;
  isLeader: boolean;
  totalGiftsReceived: number;
}

export type RacePhase = 'waiting' | 'countdown' | 'racing' | 'finished';

export interface BoostSettings {
  coins1: number; // seconds (default 2)
  coins2: number; // seconds (default 4)
  coins5: number; // seconds (default 10)
  coins10: number; // seconds (default 20)
  roseBoost: number; // seconds (default 3)
  rocketBoost: number; // seconds (default 15)
}

export interface RaceConfig {
  tiktokUsername: string; // e.g. "@meucanal"
  eulerApiKey: string; // masked in client
  eulerWebhookUrl: string;
  raceDurationSeconds: number; // default 120s
  waitingDurationSeconds: number; // default 120s
  minParticipants: number; // default 2
  soundEnabled: boolean;
  narrationEnabled: boolean;
  narrationVoice: string;
  narrationVolume: number; // 0 to 1
  narrationRate: number; // 0.8 to 1.4
  cameraMode: 'auto' | 'leader' | 'gift' | 'backmarker' | 'manual';
  isLocked: boolean; // Settings locked against accidental changes
  boostSettings: BoostSettings;
}

export type LiveConnectionStatus = 'offline' | 'checking' | 'connecting' | 'live' | 'error';

export interface LiveEvent {
  id: string;
  type: 'comment' | 'gift' | 'join' | 'system';
  timestamp: number;
  user: {
    userId: string;
    username: string;
    nickname: string;
    avatarUrl?: string;
  };
  comment?: string;
  gift?: {
    name: string;
    count: number;
    coins: number;
    iconUrl?: string;
  };
  actionTaken?: string;
}

export interface RaceState {
  phase: RacePhase;
  phaseTimeRemaining: number; // in seconds
  countdownNumber: number; // 3, 2, 1, 0
  elapsedRaceTime: number; // in seconds
  totalRaceDuration: number;
  participants: Participant[];
  leaderId: string | null;
  previousLeaderId: string | null;
  activeFocusParticipantId: string | null; // For dynamic camera focus
  focusReason: 'gift' | 'leader' | 'overtake' | 'backmarker' | 'normal';
  focusExpiresAt: number;
  waitingExtensionsCount: number;
  winner: Participant | null;
  podium: Participant[];
  raceRoundNumber: number;
  isPaused: boolean;
  trackLength: number; // e.g. 5000m
  lastUpdated: number;
}

export interface ConnectionDiagnostics {
  status: LiveConnectionStatus;
  tiktokConnected: boolean;
  eulerConnected: boolean;
  lastCheckedAt: number;
  errorMessage?: string;
  details?: string;
  activeRoomId?: string;
  viewerCount?: number;
}

export interface RaceHistoryRecord {
  id: string;
  roundNumber: number;
  date: string;
  durationSeconds: number;
  winner: {
    username: string;
    nickname: string;
    vehicleType: VehicleType;
  };
  podium: Array<{
    position: number;
    username: string;
    vehicleType: VehicleType;
  }>;
  participantCount: number;
}
