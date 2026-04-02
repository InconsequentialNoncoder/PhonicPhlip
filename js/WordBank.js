import { WORD_BANK, STATUSES, DEFAULT_SETTINGS, MAX_DEST_CHARS } from './config.js';

export class WordBank {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
  }

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }

  // Generate a random departure
  generateDeparture() {
    const destination = this._buildDestination();
    const time = this._randomTime();
    const platform = this._randomPlatform();
    const status = this._pickStatus();
    return { time, destination, platform, status: status.text, statusColor: status.color };
  }

  // Generate a full board of departures
  generateBoard(count = 4) {
    const departures = [];
    for (let i = 0; i < count; i++) {
      departures.push(this.generateDeparture());
    }
    departures.sort((a, b) => {
      const [ah, am] = a.time.split(':').map(Number);
      const [bh, bm] = b.time.split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });
    return departures;
  }

  _buildDestination() {
    const baseWord = this._pickWord();
    let destination = baseWord;

    // Maybe add a suffix
    if (Math.random() < this.settings.suffixChance && WORD_BANK.suffixes.length > 0) {
      const suffix = WORD_BANK.suffixes[Math.floor(Math.random() * WORD_BANK.suffixes.length)];
      const combined = baseWord + ' ' + suffix;
      // Only add suffix if it fits within the destination column
      if (combined.length <= MAX_DEST_CHARS) {
        destination = combined;
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
    const useDigraph = Math.random() < this.settings.digraphFrequency
      && this.settings.activeDigraphs.length > 0;

    if (useDigraph) {
      const digraph = this.settings.activeDigraphs[
        Math.floor(Math.random() * this.settings.activeDigraphs.length)
      ];
      const words = (WORD_BANK.digraphs[digraph] || [])
        .filter(w => w.length <= this.settings.maxWordLength);
      if (words.length > 0) {
        return words[Math.floor(Math.random() * words.length)];
      }
    }

    const eligible = WORD_BANK.core.filter(w => w.length <= this.settings.maxWordLength);
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  _randomTime() {
    const hour = 6 + Math.floor(Math.random() * 17);
    const minute = Math.floor(Math.random() * 60);
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  _randomPlatform() {
    return String(1 + Math.floor(Math.random() * 9));
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
