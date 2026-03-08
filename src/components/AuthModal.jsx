import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useBackClose } from '../hooks/useBackClose';

const AuthModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  useBackClose(isOpen, onClose);
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
        setError(t('auth.error_missing_fields', 'Please fill in all fields'));
        return;
    }

    setLoading(true);
    const success = isLogin 
      ? await login(username, password)
      : await register(username, password);
    
    setLoading(false);
    if (success) {
      onClose();
      setUsername('');
      setPassword('');
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-3xl"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-8 z-10"
        >
          {/* Glass Effect Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-50 pointer-events-none" />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-20 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-8 relative z-10">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
              {isLogin ? t('auth.welcome_back') : t('auth.join_lumos')}
            </h2>
            <p className="text-gray-400 text-sm">
              {isLogin ? t('auth.signin_desc') : t('auth.signup_desc')}
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="relative z-10 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3"
              >
                <AlertCircle className="text-red-400 shrink-0" size={18} />
                <p className="text-red-200 text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-bold text-indigo-400 uppercase mb-2 tracking-wider">{t('auth.username')}</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 sm:py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 min-h-[44px]"
                  placeholder={t('auth.username_placeholder')}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-400 uppercase mb-2 tracking-wider">{t('auth.password')}</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 sm:py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 min-h-[44px]"
                  placeholder={t('auth.password_placeholder')}
                  minLength={6}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 sm:py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-8 shadow-lg shadow-indigo-500/25 active:scale-[0.98] min-h-[44px]"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : (
                <>
                  {isLogin ? t('auth.sign_in') : t('auth.create_account')}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-400 relative z-10">
            {isLogin ? t('auth.no_account') : t('auth.has_account')}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-white hover:text-indigo-400 font-bold ml-1 transition-colors underline decoration-indigo-500/50 hover:decoration-indigo-500 py-2 px-1"
            >
              {isLogin ? t('auth.sign_up') : t('auth.log_in')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default AuthModal;
