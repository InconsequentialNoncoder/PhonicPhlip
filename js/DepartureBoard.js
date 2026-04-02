import { TileRow } from './TileRow.js';
import { DEPARTURE_ROWS, MAX_DEST_CHARS, MAX_STATUS_CHARS, TOTAL_TRANSITION, STAGGER_DELAY } from './config.js';

export class DepartureBoard {
  constructor(containerEl, soundEngine) {
    this.soundEngine = soundEngine;
    this.isTransitioning = false;
    this.clockFormat = 24;
    this.showSeconds = false;
    this.departures = [];

    // --- Clock Section ---
    this.clockSection = document.createElement('div');
    this.clockSection.className = 'clock-section';

    this.clockHourTens = this._createClockTile(this.clockSection);
    this.clockHourOnes = this._createClockTile(this.clockSection);

    this.clockColon1 = document.createElement('span');
    this.clockColon1.className = 'clock-colon';
    this.clockColon1.textContent = ':';
    this.clockSection.appendChild(this.clockColon1);

    this.clockMinTens = this._createClockTile(this.clockSection);
    this.clockMinOnes = this._createClockTile(this.clockSection);

    // Seconds colon + digits (hidden by default)
    this.clockColon2 = document.createElement('span');
    this.clockColon2.className = 'clock-colon clock-seconds-part';
    this.clockColon2.textContent = ':';
    this.clockSection.appendChild(this.clockColon2);

    this.clockSecTens = this._createClockTile(this.clockSection, 'clock-seconds-part');
    this.clockSecOnes = this._createClockTile(this.clockSection, 'clock-seconds-part');

    this._updateSecondsVisibility();
    containerEl.appendChild(this.clockSection);

    // --- Departure Rows ---
    const rowsContainer = document.createElement('div');
    rowsContainer.className = 'departures-body';

    this.rows = [];
    for (let i = 0; i < DEPARTURE_ROWS; i++) {
      const row = this._createDepartureRow(rowsContainer);
      this.rows.push(row);
    }

    containerEl.appendChild(rowsContainer);

    // Start clock
    this._updateClock();
    this._clockInterval = setInterval(() => this._updateClock(), 1000);
  }

  _createClockTile(container, extraClass) {
    const wrapper = document.createElement('div');
    wrapper.className = 'clock-tile-wrapper';
    if (extraClass) wrapper.classList.add(extraClass);

    const tile = document.createElement('div');
    tile.className = 'clock-digit';

    const front = document.createElement('div');
    front.className = 'clock-digit-face';
    const span = document.createElement('span');
    front.appendChild(span);
    tile.appendChild(front);

    wrapper.appendChild(tile);
    container.appendChild(wrapper);

    return { el: tile, wrapper, span, currentChar: ' ' };
  }

  _setClockDigit(digitObj, char) {
    if (char !== digitObj.currentChar) {
      digitObj.el.classList.add('clock-flipping');
      setTimeout(() => {
        digitObj.span.textContent = char;
        digitObj.currentChar = char;
        setTimeout(() => digitObj.el.classList.remove('clock-flipping'), 300);
      }, 150);
    }
  }

  _updateClock() {
    const now = new Date();
    let hours = now.getHours();

    if (this.clockFormat === 12) {
      hours = hours % 12;
      if (hours === 0) hours = 12;
    }

    const hh = String(hours).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    this._setClockDigit(this.clockHourTens, hh[0]);
    this._setClockDigit(this.clockHourOnes, hh[1]);
    this._setClockDigit(this.clockMinTens, mm[0]);
    this._setClockDigit(this.clockMinOnes, mm[1]);

    if (this.showSeconds) {
      this._setClockDigit(this.clockSecTens, ss[0]);
      this._setClockDigit(this.clockSecOnes, ss[1]);
    }
  }

  _updateSecondsVisibility() {
    const parts = this.clockSection.querySelectorAll('.clock-seconds-part');
    parts.forEach(el => {
      el.style.display = this.showSeconds ? '' : 'none';
    });
  }

  setClockFormat(format) {
    this.clockFormat = format;
    this._updateClock();
  }

  setShowSeconds(show) {
    this.showSeconds = show;
    this._updateSecondsVisibility();
    this._updateClock();
  }

  _createDepartureRow(container) {
    const rowEl = document.createElement('div');
    rowEl.className = 'departure-row';

    // Time column: 5 tiles (HH:MM)
    const timeCell = document.createElement('div');
    timeCell.className = 'dep-cell dep-time';
    const timeRow = new TileRow(5, timeCell);
    timeRow.setStatic([2]); // colon never animates
    timeRow.tiles[2].setChar(':');
    rowEl.appendChild(timeCell);

    // Destination column
    const destCell = document.createElement('div');
    destCell.className = 'dep-cell dep-dest';
    const destRow = new TileRow(MAX_DEST_CHARS, destCell);
    rowEl.appendChild(destCell);

    // Platform column: 2 tiles
    const platCell = document.createElement('div');
    platCell.className = 'dep-cell dep-plat';
    const platRow = new TileRow(2, platCell);
    rowEl.appendChild(platCell);

    // Status column
    const statusCell = document.createElement('div');
    statusCell.className = 'dep-cell dep-status';
    const statusRow = new TileRow(MAX_STATUS_CHARS, statusCell);
    rowEl.appendChild(statusCell);

    container.appendChild(rowEl);

    return { el: rowEl, timeRow, destRow, platRow, statusRow };
  }

  // Display a set of departures with animation
  displayDepartures(departures) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.departures = departures;

    let hasChanges = false;

    for (let i = 0; i < this.rows.length; i++) {
      const dep = departures[i];
      const row = this.rows[i];
      const rowDelay = i * 200;

      if (dep) {
        hasChanges = row.timeRow.setText(dep.time, rowDelay) || hasChanges;
        hasChanges = row.destRow.setText(dep.destination, rowDelay + 50) || hasChanges;
        hasChanges = row.platRow.setText(dep.platform, rowDelay + 100) || hasChanges;
        hasChanges = row.statusRow.setText(dep.status, rowDelay + 120) || hasChanges;
        row.el.style.opacity = '1';
      } else {
        row.timeRow.setText('     ', rowDelay);
        row.destRow.setText('            ', rowDelay);
        row.platRow.setText('  ', rowDelay);
        row.statusRow.setText('       ', rowDelay);
        row.el.style.opacity = '0.3';
      }
    }

    if (hasChanges && this.soundEngine) {
      this.soundEngine.playTransition();
    }

    setTimeout(() => {
      this.isTransitioning = false;
    }, TOTAL_TRANSITION + DEPARTURE_ROWS * 200 + 200);
  }

  destroy() {
    if (this._clockInterval) clearInterval(this._clockInterval);
  }
}
