import { Tile } from './Tile.js';
import { STAGGER_DELAY } from './config.js';

// A horizontal row of tiles that displays a string
export class TileRow {
  constructor(count, containerEl, options = {}) {
    this.count = count;
    this.tiles = [];
    this.currentText = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'tile-row';
    if (options.className) wrapper.classList.add(options.className);

    for (let i = 0; i < count; i++) {
      const tile = new Tile(0, i);
      tile.setChar(' ');
      wrapper.appendChild(tile.el);
      this.tiles.push(tile);
    }

    containerEl.appendChild(wrapper);
    this.el = wrapper;
  }

  // Mark specific tile positions as static (no animation)
  setStatic(indices) {
    for (const i of indices) {
      if (i < this.count) this.tiles[i].isStatic = true;
    }
  }

  // Set text with animation — casing preserved as-is from caller
  setText(text, baseDelay = 0) {
    const padded = text.padEnd(this.count, ' ').substring(0, this.count);
    let hasChanges = false;

    for (let i = 0; i < this.count; i++) {
      const newChar = padded[i];
      if (newChar !== this.tiles[i].currentChar) {
        if (this.tiles[i].isStatic) {
          this.tiles[i].setChar(newChar);
        } else {
          const delay = baseDelay + i * STAGGER_DELAY;
          this.tiles[i].scrambleTo(newChar, delay);
        }
        hasChanges = true;
      }
    }

    this.currentText = padded;
    return hasChanges;
  }

  // Set text immediately without animation
  setTextImmediate(text) {
    const padded = text.padEnd(this.count, ' ').substring(0, this.count);
    for (let i = 0; i < this.count; i++) {
      this.tiles[i].setChar(padded[i]);
    }
    this.currentText = padded;
  }
}
