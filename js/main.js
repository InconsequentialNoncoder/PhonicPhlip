import { DepartureBoard } from './DepartureBoard.js';
import { SoundEngine } from './SoundEngine.js';
import { WordBank } from './WordBank.js';
import { DEFAULT_SETTINGS } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('board-container');
  const soundEngine = new SoundEngine();
  const board = new DepartureBoard(container, soundEngine);
  const wordBank = new WordBank();

  let autoRefreshTimer = null;
  let ws = null;
  let settings = { ...DEFAULT_SETTINGS };

  // --- Audio init on first interaction ---
  let audioInitialized = false;
  const initAudio = async () => {
    if (audioInitialized) return;
    audioInitialized = true;
    await soundEngine.init();
    soundEngine.resume();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
  };
  document.addEventListener('click', initAudio);
  document.addEventListener('keydown', initAudio);

  // --- Generate and display departures ---
  function refresh() {
    const departures = wordBank.generateBoard(4);
    board.displayDepartures(departures);
    // Notify control page of current board state
    sendToServer({ type: 'board_state', departures, settings });
  }

  // --- Apply settings ---
  function applySettings(newSettings) {
    Object.assign(settings, newSettings);
    wordBank.updateSettings(settings);

    if (newSettings.clockFormat !== undefined) {
      board.setClockFormat(newSettings.clockFormat);
    }

    if (newSettings.showSeconds !== undefined) {
      board.setShowSeconds(newSettings.showSeconds);
    }

    // Restart auto-refresh if interval changed
    startAutoRefresh();
  }

  // --- Auto-refresh timer ---
  function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    if (settings.autoRefreshSeconds > 0) {
      autoRefreshTimer = setInterval(() => {
        if (!board.isTransitioning) refresh();
      }, settings.autoRefreshSeconds * 1000);
    }
  }

  // --- WebSocket connection ---
  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Send current state to any newly connected control pages
      sendToServer({ type: 'board_state', departures: board.departures, settings });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (e) {
        console.error('Invalid message:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed, reconnecting in 3s...');
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  function sendToServer(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'refresh':
        refresh();
        break;

      case 'custom_departures':
        // Display specific departures from the control page
        board.displayDepartures(msg.departures);
        break;

      case 'update_settings':
        applySettings(msg.settings);
        break;

      case 'request_state':
        sendToServer({ type: 'board_state', departures: board.departures, settings });
        break;
    }
  }

  // --- Keyboard controls ---
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowRight':
        e.preventDefault();
        refresh();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        initAudio();
        soundEngine.toggleMute();
        break;
    }
  });

  // --- Fullscreen on click ---
  container.addEventListener('dblclick', () => {
    initAudio();
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  });

  // --- Detect mobile device ---
  // Safari on iPad reports as "Macintosh" in user agent, so also check
  // for touch capability with small-ish screen as fallback
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window && window.innerWidth < 1200)
    || (navigator.maxTouchPoints > 1 && navigator.platform === 'MacIntel');
  if (isMobile) {
    document.body.classList.add('mobile');
  }

  // --- Start ---
  applySettings(settings);
  refresh();
  startAutoRefresh();
  connectWebSocket();
});
