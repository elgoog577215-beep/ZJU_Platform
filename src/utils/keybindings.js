export const ACTIONS = {
  MOVE_UP: 'move_up',
  MOVE_DOWN: 'move_down',
  MOVE_LEFT: 'move_left',
  MOVE_RIGHT: 'move_right',
  BOOST: 'boost',
  SHOOT: 'shoot'
};

export const DEFAULT_BINDINGS = {
  [ACTIONS.MOVE_UP]: ['KeyW', 'ArrowUp'],
  [ACTIONS.MOVE_DOWN]: ['KeyS', 'ArrowDown'],
  [ACTIONS.MOVE_LEFT]: ['KeyA', 'ArrowLeft'],
  [ACTIONS.MOVE_RIGHT]: ['KeyD', 'ArrowRight'],
  [ACTIONS.BOOST]: ['ShiftLeft', 'ShiftRight'],
  [ACTIONS.SHOOT]: ['Mouse0', 'Space']
};

const STORAGE_KEY = 'skyfall_keybindings';

export const getKeybindings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_BINDINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load keybindings', e);
  }
  return DEFAULT_BINDINGS;
};

export const saveKeybindings = (bindings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch (e) {
    console.error('Failed to save keybindings', e);
  }
};

export const resetKeybindings = () => {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_BINDINGS;
};

export const getActionLabel = (action) => {
  switch(action) {
    case ACTIONS.MOVE_UP: return "Move Up";
    case ACTIONS.MOVE_DOWN: return "Move Down";
    case ACTIONS.MOVE_LEFT: return "Move Left";
    case ACTIONS.MOVE_RIGHT: return "Move Right";
    case ACTIONS.BOOST: return "Boost / Accelerate";
    case ACTIONS.SHOOT: return "Shoot";
    default: return action;
  }
};

export const getKeyLabel = (code) => {
  if (!code) return '---';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5);
  if (code === 'Mouse0') return 'Left Click';
  if (code === 'Mouse1') return 'Middle Click';
  if (code === 'Mouse2') return 'Right Click';
  if (code === 'Space') return 'Space';
  if (code.includes('Shift')) return 'Shift';
  if (code.includes('Control')) return 'Ctrl';
  if (code.includes('Alt')) return 'Alt';
  return code;
};
