import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, AlertTriangle, Keyboard, Mouse } from 'lucide-react';
import { ACTIONS, DEFAULT_BINDINGS, getKeybindings, saveKeybindings, resetKeybindings, getActionLabel, getKeyLabel } from '../utils/keybindings';

const KeybindingSettings = ({ isOpen, onClose, onSave }) => {
  const [bindings, setBindings] = useState(getKeybindings());
  const [editingAction, setEditingAction] = useState(null);
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setBindings(getKeybindings());
      setConflict(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!editingAction) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      bindKey(editingAction, e.code);
    };

    const handleMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      bindKey(editingAction, `Mouse${e.button}`);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [editingAction]);

  const bindKey = (action, code) => {
    // Check conflict
    let foundConflict = null;
    Object.entries(bindings).forEach(([act, keys]) => {
      if (act !== action && keys.includes(code)) {
        foundConflict = act;
      }
    });

    if (foundConflict) {
      setConflict(`Key '${getKeyLabel(code)}' is already bound to ${getActionLabel(foundConflict)}`);
      return; // Don't bind if conflict (or could overwrite?) Let's warn.
      // For now, let's allow overwrite if user insists? Or just block.
      // Blocking is safer for this implementation.
    }

    setBindings(prev => ({
      ...prev,
      [action]: [code] // Single binding for simplicity in UI edit mode, or append? 
                       // Requirement says "Modify", usually implies replace.
                       // But we support multiple keys in data structure.
                       // Let's replace the primary key for now.
    }));
    setEditingAction(null);
    setConflict(null);
  };

  const handleReset = () => {
    const defaults = resetKeybindings();
    setBindings(defaults);
    saveKeybindings(defaults);
    onSave(defaults); // Notify parent
  };

  const handleClose = () => {
    saveKeybindings(bindings);
    onSave(bindings);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
                <Keyboard className="w-6 h-6" /> Controls Configuration
              </h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {Object.values(ACTIONS).map((action) => (
                <div key={action} className="flex items-center justify-between bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-gray-200 font-medium">{getActionLabel(action)}</span>
                  
                  <div className="flex gap-2">
                    {bindings[action]?.map((code, idx) => (
                      <button
                        key={`${action}-${idx}`}
                        onClick={() => setEditingAction(action)}
                        className={`px-4 py-2 rounded font-mono text-sm font-bold min-w-[80px] border transition-all
                          ${editingAction === action 
                            ? 'bg-cyan-500 text-black border-cyan-400 animate-pulse' 
                            : 'bg-black/40 border-white/20 text-cyan-400 hover:border-white/50'
                          }`}
                      >
                        {editingAction === action ? 'PRESS KEY' : getKeyLabel(code)}
                      </button>
                    ))}
                    {/* Add button placeholder if needed, but we just replace for now */}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2 text-yellow-500 h-6">
                {conflict && (
                  <>
                    <AlertTriangle size={16} />
                    <span className="text-sm font-bold">{conflict}</span>
                  </>
                )}
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <RotateCcw size={16} /> Reset Defaults
                </button>
                <button 
                  onClick={handleClose}
                  className="px-6 py-2 rounded bg-white text-black font-bold hover:bg-gray-200 transition-colors"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KeybindingSettings;
