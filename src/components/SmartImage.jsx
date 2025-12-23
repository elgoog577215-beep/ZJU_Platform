import React, { useState, useEffect } from 'react';
import { FileText, Film, Image as ImageIcon, Calendar, Music, AlertCircle } from 'lucide-react';

const getGradient = (text) => {
  if (!text) return 'from-gray-700 to-gray-900';
  
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    'from-red-500 to-orange-500',
    'from-orange-500 to-amber-500',
    'from-amber-500 to-yellow-500',
    'from-yellow-500 to-lime-500',
    'from-lime-500 to-green-500',
    'from-green-500 to-emerald-500',
    'from-emerald-500 to-teal-500',
    'from-teal-500 to-cyan-500',
    'from-cyan-500 to-sky-500',
    'from-sky-500 to-blue-500',
    'from-blue-500 to-indigo-500',
    'from-indigo-500 to-violet-500',
    'from-violet-500 to-purple-500',
    'from-purple-500 to-fuchsia-500',
    'from-fuchsia-500 to-pink-500',
    'from-pink-500 to-rose-500',
  ];

  return colors[Math.abs(hash) % colors.length];
};

const SmartImage = ({ 
  src, 
  alt, 
  className = "", 
  imageClassName = "", 
  iconSize = 24, 
  type = 'generic',
  ...props 
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    setError(false);
    setLoaded(false);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    if (retryCount < maxRetries) {
        setTimeout(() => {
            setRetryCount(prev => prev + 1);
        }, 1000 * (retryCount + 1));
    } else {
        setError(true);
    }
  };

  const icons = {
    generic: FileText,
    video: Film,
    image: ImageIcon,
    article: FileText,
    event: Calendar,
    music: Music,
    error: AlertCircle
  };

  const Icon = icons[type] || icons.generic;
  const gradient = getGradient(alt || type);

  // Fallback state (error or missing src)
  if (!src || error) {
    return (
      <div className={`${className} bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10" />
        <Icon size={iconSize} className="text-white/70 relative z-10" />
      </div>
    );
  }

  // Handle relative paths (prepend API_URL if needed, but standard img tag handles relative to domain)
  // If src starts with /uploads, it should be fine as long as backend serves it.
  
  return (
    <div className={`${className} relative overflow-hidden bg-gradient-to-br ${gradient}`}>
       <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${loaded ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-black/10" />
          <Icon size={iconSize} className="text-white/70 relative z-10 animate-pulse" />
       </div>

       <img 
          key={`${src}-${retryCount}`}
          src={src} 
          alt={alt} 
          className={`${imageClassName} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 relative z-20`}
          onError={handleError}
          onLoad={() => setLoaded(true)}
          loading="lazy"
          {...props}
      />
    </div>
  );
};

export default SmartImage;
