# 🏁 TikTok Live Racing Arena

Plataforma profissional de jogo de corrida 3D em tempo real com física sincronizada, integrada ao **TikTok LIVE** através da API **Euler Stream**, desenvolvida com **Three.js**, **React**, **TypeScript**, **Tailwind CSS** e **Web Audio/Speech APIs**.

---

## 🚀 Funcionalidades

1. **Painel do Streamer e Conexões Seguras**:
   - Vínculo direto com seu `@nomedotiktok` (sem necessidade de senha).
   - Conexão e validação real com a API da **Euler Stream**.
   - Trava de segurança com bloqueio e desbloqueio para prevenir alterações acidentais durante a transmissão.
   - Diagnósticos em tempo real: status da live (`offline`, `verificando`, `conectando`, `AO VIVO`), contagem de espectadores e mensagens autênticas de erro.
   - Segredos protegidos: a API Key do Euler Stream fica protegida no backend e é mascarada no navegador.

2. **Entrada Automática de Jogadores**:
   - Espectadores comentam no chat da live:
     - `"carro"`: entram no grid pilotando um carro esportivo 3D.
     - `"moto"`: entram no grid pilotando uma superbike 3D esportiva.
   - Prevenção de duplicatas por identificador único de usuário (`userId`): cada espectador tem apenas um veículo por rodada.
   - Pilotos visíveis e modelados em 3D (capacete, visor, macacão de corrida e postura biomecânica).

3. **Sistema de Espera e Início Automático**:
   - Sala de espera automática de 2 minutos (120 segundos).
   - Mínimo de 2 jogadores:
     - Com 2 ou mais jogadores: contagem regressiva `3, 2, 1, GO!` e largada automática.
     - Com apenas 1 jogador: prorrogação de 1 minuto avisada pelo narrador, repetida até entrar outro piloto.
     - Com 0 jogadores: reinicia a espera automaticamente.
   - Temporizador autoritativo no servidor: atualização do navegador não reseta a corrida.
   - Pódio automático com exibição de resultados e início da próxima rodada em loop contínuo.

4. **Gráficos 3D WebGL (Three.js)**:
   - Pista com asfalto realista, linhas centrais, zebras zebradas vermelhas/brancas e pórtico de largada com placar neon.
   - Carros e motos esportivos disputando a mesma prova com rodas girando conforme a velocidade real.
   - Efeitos de luz, sombras dinâmicas e labaredas de turbo (nitro azul e foguete ciano/magenta).
   - **Coroa Dourada do 1º Lugar**: coroa 3D flutuante e reluzente que acompanha o líder em tempo real. Se houver ultrapassagem, a coroa muda de dono instantaneamente.

5. **Presentes do TikTok e Impulsos Turbo**:
   - Integração com eventos de presentes da live via Euler Stream com proteção contra eventos duplicados.
   - Impulsos configuráveis no painel:
     - 1 moeda = 2s de turbo
     - 2 moedas = 4s de turbo
     - 5 moedas = 10s de turbo
     - 10 moedas = 20s de turbo
     - Rosa (Rose) = impulso ágil
     - Foguete (Rocket) = super turbo com rastro de chamas e aceleração potente
   - Câmera dinâmica foca no veículo beneficiado por 5 segundos.

6. **Narração Automática em Português Brasileiro (pt-BR)**:
   - Motor nativo Web Speech API sem custos e com zero latência.
   - Anuncia largadas, ultrapassagens, liderança, turbos e vencedores com os nomes reais dos participantes.
   - Seleção de voz, volume e velocidade de fala no painel.

7. **Efeitos Sonoros Realistas (Web Audio API)**:
   - Ronco de motores procedural: grave para carros e agudo de alta rotação para superbikes.
   - Efeitos de turbo e nitro, beeps de largada e fanfarra de vitória.

8. **Modo Tela Cheia & OBS Studio**:
   - Botão **"Abrir Jogo"**: tela limpa sem controles administrativos para projeção ou captura de tela.
   - Proporção adaptável tanto para transmissões horizontais (16:9) quanto verticais do TikTok (9:16).

---

## 🛠️ Como Executar e Publicar

### 1. Pré-requisitos
- Node.js 18+ instalado.
- Conta no [Euler Stream](https://eulerstream.com) com uma chave de API para receber os eventos do TikTok LIVE.

### 2. Instalação e Desenvolvimento
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (Porta 3000)
npm run dev
```

### 3. Publicação no GitHub
```bash
git init
git add .
git commit -m "feat: TikTok Live Racing Arena v1.0.0"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/tiktok-live-racing-arena.git
git push -u origin main
```

---

## 🎥 Como Configurar no OBS Studio / TikTok Live Studio

1. Abra o painel da aplicação e configure seu `@nomedotiktok` e sua API Key do Euler Stream.
2. Clique no botão **"Abrir Jogo"** no topo da tela.
3. No **OBS Studio**:
   - Adicione uma fonte do tipo **"Navegador" (Browser Source)** apontando para a URL da arena (ex: `https://seu-dominio.com` ou `http://localhost:3000`).
   - Defina a largura e altura desejadas (ex: `1920x1080` para formato horizontal ou `1080x1920` para formato vertical TikTok).
   - Marque a opção "Controlar áudio via OBS" se desejar mixar o som diretamente no mixer de áudio.
