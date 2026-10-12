/**
 * TikTok Live Racing Arena - API Routes Handler
 * Compatible with Express and Vite Connect Middleware
 */

import { raceEngine } from './raceEngine.ts';

export async function handleApiRequest(url: string, method: string, body: any): Promise<{ status: number; data: any }> {
  const pathname = url.split('?')[0];

  try {
    // 1. Configurações
    if (pathname === '/api/tiktok/config') {
      if (method === 'GET') {
        return { status: 200, data: raceEngine.getPublicConfig() };
      }
      if (method === 'POST') {
        const currentConfig = raceEngine.getPublicConfig();
        if (currentConfig.isLocked && !body.unlockRequest) {
          return { status: 403, data: { error: 'Configurações bloqueadas. Desbloqueie antes de alterar.' } };
        }

        const updates: any = {};
        if (typeof body.tiktokUsername === 'string') updates.tiktokUsername = body.tiktokUsername.trim();
        if (typeof body.eulerApiKey === 'string' && body.eulerApiKey !== '') updates.eulerApiKey = body.eulerApiKey.trim();
        if (typeof body.eulerWebhookUrl === 'string') updates.eulerWebhookUrl = body.eulerWebhookUrl.trim();
        if (typeof body.raceDurationSeconds === 'number') updates.raceDurationSeconds = body.raceDurationSeconds;
        if (typeof body.waitingDurationSeconds === 'number') updates.waitingDurationSeconds = body.waitingDurationSeconds;
        if (typeof body.soundEnabled === 'boolean') updates.soundEnabled = body.soundEnabled;
        if (typeof body.narrationEnabled === 'boolean') updates.narrationEnabled = body.narrationEnabled;
        if (typeof body.narrationVoice === 'string') updates.narrationVoice = body.narrationVoice;
        if (typeof body.narrationVolume === 'number') updates.narrationVolume = body.narrationVolume;
        if (typeof body.narrationRate === 'number') updates.narrationRate = body.narrationRate;
        if (typeof body.cameraMode === 'string') updates.cameraMode = body.cameraMode;
        if (typeof body.isLocked === 'boolean') updates.isLocked = body.isLocked;
        if (body.boostSettings) updates.boostSettings = body.boostSettings;

        raceEngine.updateConfig(updates);
        return { status: 200, data: { success: true, config: raceEngine.getPublicConfig() } };
      }
    }

    // 2. Teste de Conexão Real com Euler Stream
    if (pathname === '/api/tiktok/test' && method === 'POST') {
      const tiktokUser = body.tiktokUsername || raceEngine.getPublicConfig().tiktokUsername;
      const apiKey = body.eulerApiKey || raceEngine.getSecretApiKey();
      const webhook = body.eulerWebhookUrl || raceEngine.getPublicConfig().eulerWebhookUrl;

      const diagnostics = await raceEngine.testEulerConnection(tiktokUser, apiKey, webhook);
      return { status: 200, data: diagnostics };
    }

    // 3. Status da LIVE
    if (pathname === '/api/tiktok/status' && method === 'GET') {
      return { status: 200, data: raceEngine.getDiagnostics() };
    }

    // 4. Eventos Recentes da LIVE
    if (pathname === '/api/tiktok/events' && method === 'GET') {
      return { status: 200, data: raceEngine.getRecentEvents() };
    }

    // 5. Webhook Receptor da Euler Stream (comentários reais e presentes reais)
    if (pathname === '/api/tiktok/webhook' && method === 'POST') {
      const payload = body;
      // Trata payload de Euler Stream
      const eventType = payload.event || payload.type;
      const eventData = payload.data || payload;
      const eventId = payload.event_id || payload.id || `wh_${Date.now()}_${Math.random()}`;

      if (eventType === 'comment' || eventType === 'chat') {
        const user = eventData.user || {};
        const userId = String(user.user_id || user.id || user.unique_id || user.uniqueId || eventData.unique_id || 'unknown');
        const username = user.unique_id || user.uniqueId || eventData.unique_id || 'espectador';
        const nickname = user.nickname || username;
        const text = eventData.comment || eventData.text || '';
        const avatarUrl = user.profile_picture_url || user.avatar_thumb?.url_list?.[0];

        const result = raceEngine.handleComment(userId, username, nickname, text, avatarUrl);
        return { status: 200, data: result };
      }

      if (eventType === 'gift') {
        const user = eventData.user || {};
        const userId = String(user.user_id || user.id || user.unique_id || user.uniqueId || 'unknown');
        const username = user.unique_id || user.uniqueId || 'apoiador';
        const nickname = user.nickname || username;
        const giftName = eventData.gift_name || eventData.gift?.name || 'Presente';
        const coins = Number(eventData.diamond_count || eventData.coins || eventData.gift?.diamond_count || 1);
        const count = Number(eventData.repeat_count || eventData.count || 1);
        const avatarUrl = user.profile_picture_url || user.avatar_thumb?.url_list?.[0];

        const result = raceEngine.handleGift(userId, username, nickname, giftName, coins, count, avatarUrl, eventId);
        return { status: 200, data: result };
      }

      return { status: 200, data: { received: true, ignored: true } };
    }

    // 6. Estado Autoritativo da Corrida
    if (pathname === '/api/race/state' && method === 'GET') {
      return { status: 200, data: raceEngine.getState() };
    }

    // 7. Próxima Linha de Fala em Português
    if (pathname === '/api/race/speech' && method === 'GET') {
      const text = raceEngine.popNextSpeech();
      return { status: 200, data: { speech: text } };
    }

    // 8. Histórico de Corridas
    if (pathname === '/api/race/history' && method === 'GET') {
      return { status: 200, data: raceEngine.getRaceHistory() };
    }

    // 9. Ações do Painel Administrativo
    if (pathname === '/api/race/action' && method === 'POST') {
      const action = body.action;

      if (action === 'start') {
        const res = raceEngine.startRaceNow();
        return { status: res.success ? 200 : 400, data: res };
      }
      if (action === 'pause') {
        return { status: 200, data: raceEngine.pauseRace() };
      }
      if (action === 'resume') {
        return { status: 200, data: raceEngine.resumeRace() };
      }
      if (action === 'end') {
        const res = raceEngine.endRaceNow();
        return { status: 200, data: res };
      }
      if (action === 'reset') {
        return { status: 200, data: raceEngine.resetRound() };
      }
      if (action === 'duration') {
        const secs = Number(body.durationSeconds);
        return { status: 200, data: raceEngine.updateDuration(secs) };
      }
      if (action === 'lock') {
        return { status: 200, data: raceEngine.updateConfig({ isLocked: true }) };
      }
      if (action === 'unlock') {
        return { status: 200, data: raceEngine.updateConfig({ isLocked: false }) };
      }

      return { status: 400, data: { error: `Ação desconhecida: ${action}` } };
    }

    return { status: 404, data: { error: 'Endpoint não encontrado' } };
  } catch (err: any) {
    return { status: 500, data: { error: err.message || 'Erro interno no servidor' } };
  }
}
