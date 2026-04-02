// Tile animation settings (from flipoff)
export const SCRAMBLE_DURATION = 800;
export const FLIP_DURATION = 300;
export const STAGGER_DELAY = 25;
export const TOTAL_TRANSITION = 3800;

export const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:. ';

export const SCRAMBLE_COLORS = [
  '#00AAFF', '#00FFCC', '#AA00FF',
  '#FF2D00', '#FFCC00', '#FFFFFF'
];

// Departure board layout
export const DEPARTURE_ROWS = 4;
export const MAX_DEST_CHARS = 13;  // enough for "Cloth Hill" etc.
export const MAX_STATUS_CHARS = 7; // "ON TIME" = 7, "DELAYED" = 7

// Default settings (overridable from phone)
export const DEFAULT_SETTINGS = {
  clockFormat: 24,       // 12 or 24
  showSeconds: false,    // show seconds on clock
  titleCase: false,      // false = ALL CAPS, true = Title Case
  maxWordLength: 5,
  digraphFrequency: 0.25, // 1 in 4 departures
  suffixChance: 0.4,    // chance of adding a suffix word
  activeDigraphs: ['sh', 'ch', 'th', 'oo', 'ee'],
  autoRefreshSeconds: 0,
  maxPlatform: 10,        // max platform number (1–99)
};

// Word bank — strictly decodable, no silent letters, no exceptions
export const WORD_BANK = {
  // CVC and simple words — the bulk of departures
  core: [
    'PEN', 'HAM', 'RYE', 'ELM', 'ASH', 'DEN', 'HOP',
    'HULL', 'FORD', 'DALE', 'GLEN', 'BECK', 'BANK',
    'FELL', 'WICK', 'MILL', 'WADE', 'HOLT', 'BUDE',
    'HYDE', 'RIM', 'DIP', 'HUT', 'BOG', 'FEN',
    'YAM', 'BUS', 'JAM', 'KIT', 'LOG', 'MUD',
    'NUT', 'PIG', 'RAG', 'SUN', 'TIN', 'VAN',
    'WIG', 'ZAP', 'BED', 'CUP', 'DOG', 'FOX',
    'GUM', 'HEN', 'INK', 'JET', 'KEG',
  ],

  // Digraph words — used sparingly
  digraphs: {
    sh: ['SHAW', 'SHAP', 'SHOP', 'SHIN', 'SHED', 'SHIP', 'GUSH', 'RASH', 'RUSH', 'MESH', 'FISH', 'WISH', 'BASH', 'CASH', 'DASH'],
    ch: ['CHIP', 'CHOP', 'CHIN', 'CHAT', 'MUCH', 'RICH', 'SUCH'],
    th: ['BATH', 'PATH', 'MOTH', 'THUD', 'CLOTH'],
    oo: ['POOL', 'COOL', 'MOON', 'ROOM', 'ZOOM', 'BOOT', 'HOOP', 'ROOF', 'MOOD', 'FOOD'],
    ee: ['BEEK', 'FEED', 'HEEL', 'KEEN', 'PEEL', 'SEED', 'WEEK', 'BEEF', 'DEEP', 'DEER'],
  },

  // Suffix words — appended to make compound station names
  // All strictly decodable, no silent letters
  suffixes: [
    'TOWN', 'STOP', 'LAND', 'END', 'HALT',
    'PARK', 'HILL', 'DOCK', 'LOCK', 'WELL',
    'FELL', 'GLEN', 'MILL', 'FORD', 'WICK',
    'BANK', 'DEN', 'HUT', 'PIT', 'TOP',
  ],
};

// Status options with relative weights
export const STATUSES = [
  { text: 'ON TIME', weight: 7, color: '#4ade80' },
  { text: 'DELAYED', weight: 3, color: '#fbbf24' },
];
