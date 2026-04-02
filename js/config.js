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
export const MAX_DEST_CHARS = 13;
export const MAX_STATUS_CHARS = 8; // "ELECTRIC" = 8

// Phases that should never get suffixes (multi-syllable words)
export const NO_SUFFIX_PHASES = ['phase6a', 'phase6b', 'phase6c'];

// Default settings (overridable from phone)
export const DEFAULT_SETTINGS = {
  clockFormat: 24,       // 12 or 24
  showSeconds: false,    // show seconds on clock
  titleCase: false,      // false = ALL CAPS, true = Title Case
  suffixChance: 0.4,     // chance of adding a suffix word
  activeDigraphs: ['ch', 'sh', 'th', 'ng', 'ai', 'ee', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'er'],
  activeTrigraphs: ['igh', 'air', 'ear', 'ure'],
  autoRefreshSeconds: 0,
  maxPlatform: 10,       // max platform number (1–99)
  activePhases: ['phase2', 'phase3', 'phase4'],
  statusMode: 'status',  // 'status' (ON TIME/DELAYED) or 'type' (train types)
};

// Phase-gated word bank
// Words from UK phonics curriculum, progressing from Phase 2 (Reception) to Phase 6 (Year 2).
// Each group is strictly decodable at or before its stated phase level.
// Words chosen for plausibility as components of fictional UK place/station names.
export const PHASE_WORDS = {
  // Group 1: Phase 2 CVC — single-letter GPCs (Sets 1-5), VC and CVC only
  phase2: [
    'PIT', 'DEN', 'BOG', 'FEN', 'MUD', 'DAM', 'RIM', 'DIP', 'LOG', 'GAP',
    'HUT', 'PEN', 'TOP', 'DOCK', 'MILL', 'HILL', 'DELL', 'MOSS', 'BECK',
    'COB', 'HOG', 'BUD', 'FIG', 'RIG', 'DUN', 'GULL', 'RED', 'DULL', 'CUT', 'LOCK'
  ],

  // Group 2: Phase 3 — digraphs/trigraphs (ch, sh, th, ng, ai, ee, igh, oa, oo, ar, or, ur, ow, oi, ear, air, er)
  phase3: [
    'MARSH', 'MOOR', 'WOOD', 'ARCH', 'BARN', 'THORN', 'FORD', 'OAK', 'POOL',
    'NOOK', 'REEF', 'MOON', 'RAIN', 'ROAD', 'LAIR', 'YARD', 'CHURCH', 'PARK',
    'RING', 'LONG', 'DARK', 'HIGH', 'DEEP', 'FAIR', 'NORTH', 'DEER', 'SHARP',
    'FERN', 'FORT', 'CHART'
  ],

  // Group 3: Phase 4 — consonant clusters (CCVC, CVCC, CCVCC), no new GPCs
  phase4: [
    'GLEN', 'CREST', 'DRIFT', 'POND', 'FROST', 'FLINT', 'CLIFF', 'SAND',
    'BANK', 'LAND', 'CAMP', 'CROFT', 'BLUFF', 'CRAG', 'MIST', 'DUSK',
    'WEST', 'BRINK', 'TRACK', 'TRUNK', 'SWAMP', 'NEST', 'STUMP', 'SHELF',
    'BRAND', 'GRAND', 'SWIFT', 'GUST', 'SPRING', 'STREAM'
  ],

  // Group 4: Phase 5a — split digraphs (a-e, i-e, o-e, u-e) + ay, aw, ew, ou, etc.
  phase5a: [
    'LAKE', 'VALE', 'STONE', 'GROVE', 'PINE', 'COVE', 'DALE', 'GLADE',
    'CAPE', 'DUNE', 'TIDE', 'HAZE', 'BAY', 'CLAY', 'FAWN', 'DAWN',
    'HAWK', 'BRINE', 'SLOPE', 'SHADE', 'SPIRE', 'YEW', 'GALE', 'VINE',
    'CLAW', 'SPRAY', 'BLAZE', 'CRANE', 'WHITE', 'FLUME'
  ],

  // Group 5: Phase 5b — alternative pronunciations (o=/əʊ/, i=/aɪ/, dge, kn, ow=/əʊ/, etc.)
  phase5b: [
    'BRIDGE', 'RIDGE', 'LEDGE', 'EDGE', 'GORGE', 'HEDGE', 'FIELD', 'KNOLL',
    'WREN', 'SNOW', 'BOLD', 'WILD', 'COLD', 'GOLD', 'CROW', 'LOW',
    'SKY', 'DRY', 'HEAD', 'OLD', 'FOLD', 'MILD', 'POST', 'STOW',
    'BROW', 'SHIELD', 'THATCH', 'CELL', 'GRANGE', 'FORCE'
  ],

  // Group 6: Two-syllable words using Phase 2-5 knowledge
  phase6a: [
    'HOLLOW', 'MEADOW', 'BRAMBLE', 'TEMPLE', 'BEACON', 'FALCON', 'RIVER',
    'TIMBER', 'SILVER', 'WINTER', 'MARKET', 'GARDEN', 'SUMMIT', 'HAMLET',
    'PEBBLE', 'COPPER', 'SHELTER', 'COBBLE', 'WILLOW', 'SPARROW', 'FOREST',
    'THISTLE', 'TOWER', 'BORDER', 'VALLEY', 'QUARRY', 'TUNNEL', 'CHAPEL',
    'OTTER', 'BARLEY'
  ],

  // Group 7: Compound two-syllable words from earlier elements
  phase6b: [
    'HILLTOP', 'WOODLAND', 'MOORLAND', 'DRIFTWOOD', 'MARSHLAND', 'LIMESTONE',
    'SANDSTONE', 'STARLIGHT', 'MOONBEAM', 'TREETOP', 'LAKESIDE', 'SEASHORE',
    'SNOWDRIFT', 'GOLDFINCH', 'HEATHLAND', 'CORNFIELD', 'WINDMILL', 'CLIFFSIDE',
    'FOXGLOVE', 'NIGHTFALL', 'DAYBREAK', 'PINEWOOD', 'LONGBOW', 'BLACKTHORN',
    'GREENWOOD', 'MILLPOND', 'SPRINGWELL', 'RIDGEWAY', 'OAKWOOD', 'FARMSTEAD'
  ],

  // Group 8: Multi-syllabic Phase 6 words with affixes
  phase6c: [
    'WATERFALL', 'EVERGREEN', 'SETTLEMENT', 'WILDERNESS', 'WANDERING',
    'WHISPERING', 'THUNDERING', 'FLOWERING', 'SHIMMERING', 'GLITTERING',
    'PEACEFUL', 'RESTLESS', 'BOUNDLESS', 'ENDLESS', 'PLENTIFUL', 'SHELTERED',
    'WEATHERED', 'SCATTERED', 'FORGOTTEN', 'GHOSTLY', 'NORTHERLY', 'UNCHARTED',
    'UNTRODDEN', 'BUTTERCUP', 'DRAGONFLY', 'NIGHTINGALE', 'EMBANKMENT',
    'DARKNESS', 'RIVERSIDE', 'COLOURFUL'
  ]
};

// Suffix words — appended to make compound station names
// All strictly decodable, no silent letters
// Only applied to single-syllable words (Phases 2-5)
export const SUFFIXES = [
  'TOWN', 'STOP', 'LAND', 'END', 'HALT',
  'PARK', 'HILL', 'DOCK', 'LOCK', 'WELL',
  'FELL', 'GLEN', 'MILL', 'FORD', 'WICK',
  'BANK', 'DEN', 'HUT', 'PIT', 'TOP',
];

// Toggleable Phase 3 consonant digraphs, vowel digraphs, and trigraphs
// Trigraphs listed first so matching checks longer patterns before shorter ones
export const TRIGRAPH_PATTERNS = ['igh', 'air', 'ear', 'ure'];
export const DIGRAPH_PATTERNS = ['ch', 'sh', 'th', 'ng', 'ai', 'ee', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'er'];

// Status options with relative weights
export const STATUSES = [
  { text: 'ON TIME', weight: 7, color: '#4ade80' },
  { text: 'DELAYED', weight: 3, color: '#fbbf24' },
];

// Train type options (used when statusMode === 'type')
export const TRAIN_TYPES = [
  { text: 'CARGO', color: '#fbbf24' },
  { text: 'DIESEL', color: '#fb923c' },
  { text: 'ELECTRIC', color: '#60a5fa' },
  { text: 'STEAM', color: '#a1a1aa' },
];
