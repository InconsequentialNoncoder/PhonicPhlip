import { PHASE_WORDS, SUFFIXES, STATUSES, DEFAULT_SETTINGS, MAX_DEST_CHARS, NO_SUFFIX_PHASES, DIGRAPH_PATTERNS, TRIGRAPH_PATTERNS } from './config.js';

export class WordBank {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
  }

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }

  // Generate a random departure
  generateDeparture(usedPlatforms) {
    const destination = this._buildDestination();
    const time = this._randomTime();
    const platform = this._randomPlatform(usedPlatforms);
    const status = this._pickStatus();
    return { time, destination, platform, status: status.text, statusColor: status.color };
  }

  // Generate a full board of departures
  generateBoard(count = 4) {
    const usedPlatforms = new Set();
    const departures = [];
    for (let i = 0; i < count; i++) {
      departures.push(this.generateDeparture(usedPlatforms));
    }
    departures.sort((a, b) => {
      const [ah, am] = a.time.split(':').map(Number);
      const [bh, bm] = b.time.split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });
    return departures;
  }

  _buildDestination() {
    const { word, phase } = this._pickWord();
    let destination = word;

    // Only add suffixes to single-syllable words (Phases 2-5)
    if (!NO_SUFFIX_PHASES.includes(phase)) {
      if (Math.random() < this.settings.suffixChance && SUFFIXES.length > 0) {
        const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
        const combined = word + ' ' + suffix;
        if (combined.length <= MAX_DEST_CHARS) {
          destination = combined;
        }
      }
    }

    // Apply casing
    if (this.settings.titleCase) {
      return this._toTitleCase(destination);
    }
    return destination;
  }

  _toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  _pickWord() {
    const activePhases = this.settings.activePhases || [];
    const pool = [];

    for (const phase of activePhases) {
      const words = PHASE_WORDS[phase];
      if (!words) continue;

      for (const word of words) {
        // For Phase 3 words, filter by active digraph/trigraph toggles
        if (phase === 'phase3') {
          const wordLower = word.toLowerCase();
          // Check trigraphs first (longer patterns before shorter)
          const matchesTrigraph = TRIGRAPH_PATTERNS.some(t =>
            (this.settings.activeTrigraphs || []).includes(t) && wordLower.includes(t)
          );
          const matchesDigraph = DIGRAPH_PATTERNS.some(d =>
            this.settings.activeDigraphs.includes(d) && wordLower.includes(d)
          );
          if (!matchesTrigraph && !matchesDigraph) continue;
        }

        // Filter by max destination character count
        if (word.length <= MAX_DEST_CHARS) {
          pool.push({ word, phase });
        }
      }
    }

    // Fallback if pool is empty (all phases/digraphs disabled)
    if (pool.length === 0) {
      return { word: 'PEN', phase: 'phase2' };
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  _randomTime() {
    const hour = 6 + Math.floor(Math.random() * 17);
    const minute = Math.floor(Math.random() * 60);
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  _randomPlatform(usedPlatforms) {
    const max = this.settings.maxPlatform || 10;

    // Try to pick an unused platform
    if (usedPlatforms && usedPlatforms.size < max) {
      let num;
      do {
        num = 1 + Math.floor(Math.random() * max);
      } while (usedPlatforms.has(num));
      usedPlatforms.add(num);
      return String(num).padStart(2, ' ');
    }

    // All platforms used — fall back to random
    const num = 1 + Math.floor(Math.random() * max);
    return String(num).padStart(2, ' ');
  }

  _pickStatus() {
    const totalWeight = STATUSES.reduce((sum, s) => sum + s.weight, 0);
    let r = Math.random() * totalWeight;
    for (const s of STATUSES) {
      r -= s.weight;
      if (r <= 0) return s;
    }
    return STATUSES[0];
  }
}
