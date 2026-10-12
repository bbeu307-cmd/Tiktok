# TikTok Live Racing Arena — Plano de Implementação

Plataforma profissional de jogo de corrida interativo 3D em tempo real integrada à TikTok LIVE via Euler Stream API, com física sincronizada no servidor, pilotos visíveis, narração automática em português brasileiro, câmeras cinematográficas e painel administrativo completo.

## Decisões Confirmadas e Diretrizes do Usuário

> [!IMPORTANT]
> **Decisões confirmadas com o usuário na fase de esclarecimento:**
> 1. **Visual da Corrida:** WebGL 3D completo com Three.js, modelos poligonais com sombras dinâmicas, iluminação de arena, pilotos visíveis nos carros e sobre as motos, asfalto realista e partículas.
> 2. **Motor de Narração:** Web Speech API nativa em Português Brasileiro (pt-BR) com voz selecionável, volume e cadência configuráveis — execução com zero latência no navegador/OBS.
> 3. **Modo de Conexão:** Conexão real exclusiva com a API Euler Stream e webhook de eventos ao vivo (sem dados fictícios gerados durante corridas reais; modo de teste dedicado para validação prévia isolada).

---

## 1. Visão Geral e Conceito do Produto

O **TikTok Live Racing Arena** é um ecossistema completo para streamers do TikTok LIVE que transforma a live em um grande prêmio de corrida multiplayer. 

- **Público-alvo:** Streamers e criadores de conteúdo do TikTok, operadores de transmissão (OBS Studio, TikTok Live Studio) e sua audiência.
- **Funcionamento Principal:**
  - O streamer vincula seu `@nomedotiktok` e sua chave da API **Euler Stream** com bloqueio de segurança contra alterações acidentais.
  - O servidor monitora a LIVE e conecta ao fluxo de eventos reais (comentários e presentes).
  - Espectadores entram comentando **"carro"** ou **"moto"**. Cada usuário tem ID único garantido (sem duplicatas).
  - Sala de espera automática de 2 minutos (mínimo de 2 competidores para iniciar; repete 1 minuto se houver apenas 1 competidor).
  - Carros esportivos e superbikes disputam a mesma pista em 3D, com rodas girando, pilotos animados, fumaça, turbo e coroa dourada dinâmica sobre o líder.
  - Presentes enviados na live (Rosa, Foguete, etc.) acionam impulsos de turbo imediatos e narração em tempo real.
  - Modo "Abrir Jogo" em tela cheia limpa para projeção direta em monitor vertical ou captura de janela no OBS.

---

## 2. Experiência do Usuário e Design Visual

### Direção Estética
- **Paleta de Cores:** Fundo escuro esportivo estilo arena automotiva (`#0B0F19`, `#111827`), superfícies translúcidas com efeito *frosted glass* (`rgba(17, 24, 39, 0.85)`), acentos em âmbar neon (`#F59E0B`), ciano de telemetria (`#06B6D4`), vermelho de corrida (`#EF4444`) e ouro metálico para a coroa (`#FFD700`).
- **Tipografia:** Tipografia esportiva moderna (`Plus Jakarta Sans` para interface e controles, combinada com fontes monoespaciais `tabular-nums` para velocímetro, cronômetro e ranking de posições).
- **Sem poluição visual:** Zero pílulas genéricas estáticas; metadados e posições apresentados de forma limpa e legível para espectadores mesmo em transmissões de vídeo comprimidas.

### Modos de Visualização
1. **Painel de Controle do Streamer (Admin View):**
   - Configurações da API Euler Stream & TikTok com trava de segurança (Bloquear/Desbloquear).
   - Testador de conexão com diagnóstico em tempo real (status da LIVE, latência, erros reais reportados).
   - Ajustes de corrida (duração de 1, 2, 3, 5, 10 minutos ou personalizada, multiplicadores de presentes, áudio e TTS).
   - Painel de controle da corrida (Iniciar, Pausar, Retomar, Encerrar, Reiniciar).
   - Feed de eventos recentes e lista de pilotos conectados.
2. **Modo Jogo / Arena 3D (Game View / OBS Ready):**
   - Canvas WebGL 3D em tela cheia com proporções adaptadas para 16:9 (paisagem) e 9:16 (vertical mobile).
   - HUD sem poluição: Placar de líderes (1º, 2º, 3º lugar e demais), cronômetro regressivo da sala de espera ou da corrida, velocímetro, alertas de presentes com foto do espectador.
   - Coroa 3D flutuante e reluzente acompanhando o 1º colocado em tempo real.
   - Câmeras cinematográficas dinâmicas com transições suaves (Foco no presente por 5s -> Foco no líder por 5s -> Foco nos últimos colocados por 3s -> Disputa de ultrapassagem).

---

## 3. Decisões Arquiteturais e Trade-Offs

| Decisão | Opção Escolhida | Racional & Vantagens |
| :--- | :--- | :--- |
| **Renderizador 3D** | **Three.js com WebGL** | Gráficos 3D autênticos com iluminação, sombras, texturas de asfalto, modelos procedurais detalhados de carros e motos com pilotos articulados, malha de coroa flutuante e efeitos de partículas. |
| **Sincronização da Corrida** | **Física e Cronômetro Autoritativos no Servidor** | O servidor calcula as distâncias, tempos de volta e posições dos corredores a cada tick. Se a página for atualizada ou novas janelas do OBS forem abertas, o estado da corrida permanece idêntico. |
| **Segurança das Chaves** | **Armazenamento no Backend Express** | A API Key do Euler Stream e endpoints confidenciais nunca são expostos no cliente. Todas as chamadas para o Euler Stream são roteadas via servidor backend `/api/tiktok/*`. |
| **Prevenção de Duplicatas** | **Indexação por `userId` único** | Cada espectador tem identificador único permanente do TikTok; comentários adicionais de quem já está na corrida são ignorados com notificação na tela ("@usuario já está na corrida"). |
| **Narração em Áudio** | **Web Speech API nativa + Áudio Web procedural** | Zero latência para a transmissão ao vivo, sem dependência de quotas de terceiros, com vozes naturais pt-BR e sintetizador de áudio Web Audio API para motores de carros (ronco grave) e motos (ronco agudo com rotação). |

---

## 4. Arquitetura Técnica e Fluxo de Dados

```
┌────────────────────────────────────────────────────────────────────────┐
│                          TIKTOK LIVE ARENA                             │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
  ┌─────────────────────────┐             ┌─────────────────────────┐
  │   Euler Stream API      │             │  TikTok Webhook Inbound │
  │ (Status, SSE & Events)  │             │   (Comments & Gifts)    │
  └────────────┬────────────┘             └────────────┬────────────┘
               │                                       │
               └───────────────────┬───────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   BACKEND EXPRESS SERVER (/api)                        │
│  • Config Store: Armazena API Key, @TikTok, Regras e Bloqueio Seguro   │
│  • Deduplication Engine: Impede eventos repetidos por eventId / userId │
│  • Waiting Room Manager: 2 min timer, regra mín 2 jogadores, contagem  │
│  • Race Physics Engine: Tick a 30Hz, distâncias, ultrapassagens, turbo │
│  • SSE Broadcast / State Poll: Fornece estado sincronizado ao frontend │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND WEB APP (React)                         │
│  ┌───────────────────────────────────┬───────────────────────────────┐ │
│  │ View 1: Painel do Administrador   │ View 2: Arena 3D (OBS View)   │ │
│  │ • Setup TikTok & Euler Stream     │ • Three.js 3D WebGL Canvas    │ │
│  │ • Testes de conexão reais         │ • Carros, Motos & Pilotos 3D  │ │
│  │ • Controle de largada / pausa     │ • Coroa 3D do 1º Lugar        │ │
│  │ • Configuração de Impulsos/Moedas │ • Sistema de Câmeras Autônomo │ │
│  │ • Feed de eventos da LIVE         │ • HUD de Posições e Tempos    │ │
│  └───────────────────────────────────┴───────────────────────────────┘ │
│                                  │                                     │
│  ┌───────────────────────────────┴───────────────────────────────────┐ │
│  │ Motores de Áudio e Fala                                           │ │
│  │ • Web Audio API: Motores procedurais para carros e motos          │ │
│  │ • Web Speech API: Locutor nativo em Português do Brasil (pt-BR)   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Regras de Negócio e Estados da Corrida

1. **Estado `waiting` (Sala de Espera):**
   - Inicia com 120 segundos (2 minutos).
   - Comentários `"carro"` criam um competidor com carro 3D e piloto.
   - Comentários `"moto"` criam um competidor com moto 3D e piloto.
   - Se o tempo expirar com 0 jogadores: reinicia espera de 120s.
   - Se o tempo expirar com apenas 1 jogador: adiciona 60s de prorrogação e avisa por narração.
   - Se houver >= 2 jogadores: inicia contagem regressiva.
2. **Estado `countdown` (Contagem Regressiva):**
   - 3, 2, 1, GO! com sinalizadores visuais e narração sonora.
3. **Estado `racing` (Em Corrida):**
   - Veículos aceleram conforme física dinâmica de corrida.
   - Presentes recebidos acionam impulsos imediatos:
     - *Rosa*: Impulso leve (ex: 2 a 4 segundos).
     - *Foguete*: Super turbo com rastro de partículas e luz neon (ex: 10 a 20 segundos).
     - Moedas calculadas pela tabela configurável do painel.
   - Coroa dourada fixada acima do 1º colocado em tempo real.
   - Troca de câmeras automática (Líder -> Foco em presente -> Últimos colocados -> Disputas).
4. **Estado `finished` (Pódio e Ranking):**
   - Anúncio do campeão com comemoração e ranking geral.
   - Intervalo de 15 segundos para exibição dos resultados.
   - Transição automática para nova sala de espera.

---

## 5. Plano de Execução em Fases

1. **Infraestrutura e Dependências:** Instalar `three` e `@types/three` para renderização 3D WebGL profissional.
2. **Backend de Integração e Servidor:** Criar `server.ts` com endpoints para Euler Stream, webhook com desduplicação de eventos, persistência de configurações seguras, gerenciador de corrida autoritativo e servidor de estado.
3. **Cena 3D WebGL (Three.js):** Construir circuito detalhado (pista de asfalto, zebras, iluminação de arena, horizonte), modelos 3D poligonais procedurais de carros esportivos e motos com pilotos visíveis em várias cores, malha da coroa dourada do líder, sistema de partículas de turbo e fumaça.
4. **Motor de Câmeras Cinematográficas:** Modos de câmera dinâmica automática (Líder, Presente, Pelotão, Disputa) e controle manual alternável.
5. **Motores de Som e Narração pt-BR:** Web Audio API com geradores oscilatórios para roncos de motores e turbos; narração dinâmica contextual em português brasileiro com os nomes reais dos participantes via Web Speech API.
6. **Painel do Administrador & Trava de Segurança:** Interface intuitiva para vincular o TikTok, chave Euler Stream, testar conexão com diagnóstico de erro real, travar/destravar campos, ajustar duração e impulsos de moedas.
7. **Modo Tela Cheia / Transmissão OBS:** Rota dedicada limpa (`/race` ou botão "Abrir Jogo") sem distrações administrativas, pronta para captura de janela ou navegador OBS.
8. **Validação e Verificação:** Compilação com `compile_applet` e testes de fluxo completos.
