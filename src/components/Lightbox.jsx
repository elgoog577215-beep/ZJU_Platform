import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Box, Download, Info, Camera, Aperture, Clock, Gauge } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import FavoriteButton from './FavoriteButton';

const Lightbox = ({ photo, onClose, onNext, onPrev, onView3D, onLikeToggle }) => {
  const [showInfo, setShowInfo] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'i') setShowInfo(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  const handleDownload = async () => {
      try {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = photo.title || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success('Download started');
      } catch (error) {
          console.error(error);
          toast.error('Download failed');
      }
  };

  // Mock Exif Data (since we don't have it in DB yet)
  const exif = {
      camera: 'Sony A7R IV',
      lens: 'FE 24-70mm GM',
      aperture: 'f/2.8',
      shutter: '1/250s',
      iso: '100'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
      onClick={onClose}
    >
      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex gap-4 z-50" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
            <button 
              onClick={onView3D}
              className="p-3 text-white/70 hover:text-cyan-400 hover:bg-white/10 rounded-full transition-all"
              title="3D View"
            >
              <Box size={20} />
            </button>
            <div className="w-px h-4 bg-white/20"></div>
            <FavoriteButton 
              itemId={photo.id}
              itemType="photo"
              className="p-3 hover:bg-white/10 rounded-full"
              onToggle={onLikeToggle}
              favorited={photo.favorited}
            />
            <button 
              onClick={handleDownload}
              className="p-3 text-white/70 hover:text-green-400 hover:bg-white/10 rounded-full transition-all"
              title="Download"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className={`p-3 rounded-full transition-all ${showInfo ? 'text-white bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              title="Info"
            >
              <Info size={20} />
            </button>
        </div>

        <button 
          onClick={onClose}
          className="p-3 bg-black/40 hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/10 rounded-full backdrop-blur-md transition-all"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Image */}
      <div 
        className="relative max-w-7xl max-h-[90vh] w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onPrev}
          className="absolute left-0 md:-left-16 p-4 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-full"
        >
          <ChevronLeft size={48} />
        </button>

        <motion.img
          key={photo.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          src={photo.url} 
          alt={photo.title}
          className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm"
        />

        <button 
          onClick={onNext}
          className="absolute right-0 md:-right-16 p-4 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-full"
        >
          <ChevronRight size={48} />
        </button>

        {/* Bottom Info Bar */}
        <div className="absolute -bottom-16 left-0 right-0 text-center">
          <h3 className="text-2xl font-serif font-bold text-white mb-1">{photo.title}</h3>
          <p className="text-sm text-gray-400 uppercase tracking-widest">{photo.category}</p>
        </div>
      </div>

      {/* Info Side Panel */}
      <AnimatePresence>
        {showInfo && (
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 right-0 bottom-0 w-80 bg-[#1a1a1a]/95 backdrop-blur-xl border-l border-white/10 p-6 z-[70] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-white">Info</h3>
                    <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Title</h4>
                        <p className="text-white text-lg font-serif">{photo.title}</p>
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Category</h4>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white">{photo.category}</span>
                    </div>

                    <div className="border-t border-white/10 pt-6">
                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">EXIF Data</h4>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-300">
                                <Camera size={18} className="text-indigo-400" />
                                <span>{exif.camera}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-300">
                                <Aperture size={18} className="text-pink-400" />
                                <span>{exif.lens}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-300">
                                <Gauge size={18} className="text-green-400" />
                                <span>ISO {exif.iso}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-300">
                                <Clock size={18} className="text-yellow-400" />
                                <span>{exif.shutter}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-300">
                                <div className="w-4 h-4 rounded-full border-2 border-blue-400 flex items-center justify-center text-[10px]">f</div>
                                <span>{exif.aperture}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-6">
                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Stats</h4>
                        <div className="flex justify-between text-gray-300 text-sm">
                            <span>Likes</span>
                            <span className="text-white font-bold">{photo.likes || 0}</span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm mt-2">
                            <span>Views</span>
                            <span className="text-white font-bold">{Math.floor(Math.random() * 1000) + 100}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Lightbox;
