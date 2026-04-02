import { DepartureBoard } from './DepartureBoard.js';
import { SoundEngine } from './SoundEngine.js';
import { WordBank } from './WordBank.js';
import { DEFAULT_SETTINGS } from './config.js';
import { buildWsUrl, getSessionId, setSessionId, sanitiseSessionId, isLocalServer } from './session.js';

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
    if (ws) {
      ws.onclose = null; // prevent auto-reconnect
      ws.close();
    }

    const wsUrl = buildWsUrl();
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      updateConnDot(true);
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
      updateConnDot(false);
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  function updateConnDot(connected) {
    const dot = document.getElementById('conn-dot');
    if (dot) dot.classList.toggle('connected', connected);
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

      case 'restore_settings':
        // Server-side settings restored for a named session
        applySettings(msg.settings);
        refresh();
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
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window && window.innerWidth < 1200)
    || (navigator.maxTouchPoints > 1 && navigator.platform === 'MacIntel');
  if (isMobile) {
    document.body.classList.add('mobile');
  }

  // --- Top toolbar (sync + config) ---
  initToolbar(connectWebSocket);

  // --- Start ---
  applySettings(settings);
  refresh();
  startAutoRefresh();
  connectWebSocket();
});

// --- Top toolbar ---
function initToolbar(reconnect) {
  const toolbar = document.createElement('div');
  toolbar.className = 'top-toolbar';

  // Config button — opens control page in new tab, passing current session
  const configLink = document.createElement('a');
  configLink.className = 'config-btn';
  configLink.textContent = 'Config';
  configLink.target = '_blank';
  configLink.rel = 'noopener';
  configLink.addEventListener('click', (e) => {
    e.preventDefault();
    const session = getSessionId();
    const url = session ? `/control?session=${encodeURIComponent(session)}` : '/control';
    window.open(url, '_blank', 'noopener');
  });
  toolbar.appendChild(configLink);

  // Sync widget (only on hosted version)
  if (!isLocalServer()) {
    const currentSession = getSessionId();

    const widget = document.createElement('div');
    widget.className = 'sync-widget';
    widget.innerHTML = `
      <button class="sync-btn ${currentSession ? 'active' : ''}" id="syncBtn">
        ${currentSession || 'Sync'}
      </button>
      <div class="sync-panel" id="syncPanel" style="display:none;">
        <input type="text" id="syncInput" placeholder="e.g. smith-family"
          maxlength="40" value="${currentSession || ''}">
        <div class="sync-actions">
          <button class="sync-connect" id="syncConnect">Connect</button>
          <button class="sync-disconnect" id="syncDisconnect"
            style="display:${currentSession ? 'block' : 'none'}">Disconnect</button>
        </div>
      </div>
    `;
    toolbar.appendChild(widget);

    // Defer event binding until after DOM insertion
    setTimeout(() => {
      const btn = document.getElementById('syncBtn');
      const panel = document.getElementById('syncPanel');
      const input = document.getElementById('syncInput');
      const connectBtn = document.getElementById('syncConnect');
      const disconnectBtn = document.getElementById('syncDisconnect');

      btn.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });

      connectBtn.addEventListener('click', () => {
        const id = sanitiseSessionId(input.value);
        if (!id) return;
        setSessionId(id);
        btn.textContent = id;
        btn.classList.add('active');
        disconnectBtn.style.display = 'block';
        panel.style.display = 'none';
        reconnect();
      });

      disconnectBtn.addEventListener('click', () => {
        setSessionId(null);
        btn.textContent = 'Sync';
        btn.classList.remove('active');
        input.value = '';
        disconnectBtn.style.display = 'none';
        panel.style.display = 'none';
        reconnect();
      });
    }, 0);
  }

  document.body.appendChild(toolbar);
}
