import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ImageWithLoader = ({ src, alt, className, imageClassName, loading = "lazy", ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`} {...props}>
      {/* Blur Placeholder / Error State */}
      <motion.div
        className={`absolute inset-0 ${hasError ? 'bg-red-900/20' : 'bg-gray-800 animate-pulse'}`}
        initial={{ opacity: 1 }}
        animate={{ opacity: isLoaded ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
         {hasError && (
             <div className="flex items-center justify-center w-full h-full text-red-500 text-xs">
                 Failed to load
             </div>
         )}
      </motion.div>
      
      {/* Actual Image */}
      {!hasError && (
        <motion.img
            src={src}
            alt={alt}
            loading={loading}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ 
                opacity: isLoaded ? 1 : 0,
                scale: isLoaded ? 1 : 1.1
            }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onLoad={() => setIsLoaded(true)}
            onError={() => { setHasError(true); setIsLoaded(false); }}
            className={`block w-full ${imageClassName || ''}`}
        />
      )}
    </div>
  );
};

export default ImageWithLoader;