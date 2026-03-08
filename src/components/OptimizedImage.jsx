import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Optimized Image Component
 * Features:
 * - Lazy loading with Intersection Observer
 * - Blur placeholder (LQIP)
 * - Responsive srcset
 * - WebP support with fallback
 * - Smooth fade-in animation
 * - Error handling
 */

const OptimizedImage = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  width,
  height,
  sizes = '100vw',
  priority = false,
  blurPlaceholder,
  onLoad,
  onError,
  objectFit = 'cover',
  objectPosition = 'center',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Generate srcset if variants provided
  const generateSrcSet = useCallback(() => {
    if (!src || typeof src !== 'object') return null;
    
    // If src is an object with variants
    if (src.variants) {
      const webpVariants = [];
      Object.entries(src.variants).forEach(([size, formats]) => {
        if (formats.webp) {
          webpVariants.push(`${formats.webp.url} ${formats.webp.width}w`);
        }
      });
      return webpVariants.join(', ');
    }
    
    return null;
  }, [src]);

  // Get optimal image URL based on container width
  const getOptimalSrc = useCallback(() => {
    if (!src) return null;
    
    // If src is a string, return as-is
    if (typeof src === 'string') return src;
    
    // If src has variants, choose appropriate size
    if (src.variants) {
      const containerWidth = containerRef.current?.clientWidth || 800;
      
      // Find best matching size
      const sizes = Object.entries(src.variants)
        .filter(([_, formats]) => formats.webp || formats.jpeg)
        .map(([name, formats]) => ({
          name,
          width: formats.webp?.width || formats.jpeg?.width || 800,
          url: formats.webp?.url || formats.jpeg?.url
        }))
        .sort((a, b) => a.width - b.width);
      
      // Find smallest size that is >= container width
      const optimal = sizes.find(s => s.width >= containerWidth);
      return optimal?.url || sizes[sizes.length - 1]?.url;
    }
    
    return src.url || src;
  }, [src]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Set image source when in view
  useEffect(() => {
    if (isInView) {
      const optimalSrc = getOptimalSrc();
      setCurrentSrc(optimalSrc);
    }
  }, [isInView, getOptimalSrc]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Calculate aspect ratio for placeholder
  const aspectRatio = width && height ? (height / width) * 100 : null;

  // Get blur placeholder
  const placeholderSrc = blurPlaceholder || 
    (typeof src === 'object' && src.blurPlaceholder) || 
    null;

  return (
    <div
      ref={containerRef}
      className={`
        relative overflow-hidden
        ${aspectRatio ? 'w-full' : ''}
        ${containerClassName}
      `}
      style={{
        aspectRatio: width && height ? `${width}/${height}` : undefined,
        paddingBottom: aspectRatio && !width ? `${aspectRatio}%` : undefined
      }}
    >
      {/* Blur Placeholder */}
      <AnimatePresence>
        {!isLoaded && placeholderSrc && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <img
              src={placeholderSrc}
              alt=""
              className="w-full h-full blur-xl scale-110"
              style={{ objectFit, objectPosition }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color Placeholder (if no blur) */}
      {!isLoaded && !placeholderSrc && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}

      {/* Main Image */}
      {isInView && currentSrc && !hasError && (
        <motion.img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          srcSet={generateSrcSet()}
          sizes={sizes}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            w-full h-full
            transition-transform duration-700
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            ${className}
          `}
          style={{ objectFit, objectPosition }}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          {...props}
        />
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-xl">
          <div className="text-center text-white/50">
            <svg 
              className="w-12 h-12 mx-auto mb-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <span className="text-sm">Failed to load</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Responsive Image with Art Direction
 * Supports different images for different screen sizes
 */
export const ResponsiveImage = ({
  mobile,
  tablet,
  desktop,
  alt,
  className = '',
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(desktop || tablet || mobile);

  useEffect(() => {
    const updateSrc = () => {
      const width = window.innerWidth;
      if (width < 768 && mobile) {
        setCurrentSrc(mobile);
      } else if (width < 1024 && tablet) {
        setCurrentSrc(tablet);
      } else {
        setCurrentSrc(desktop || tablet || mobile);
      }
    };

    updateSrc();
    window.addEventListener('resize', updateSrc);
    return () => window.removeEventListener('resize', updateSrc);
  }, [mobile, tablet, desktop]);

  return (
    <OptimizedImage
      src={currentSrc}
      alt={alt}
      className={className}
      {...props}
    />
  );
};

/**
 * Background Image Component
 * Optimized for use as background images
 */
export const BackgroundImage = ({
  src,
  children,
  className = '',
  overlay = false,
  overlayClassName = '',
  priority = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative ${className}`} {...props}>
      {/* Background Image */}
      <div className="absolute inset-0 overflow-hidden">
        <OptimizedImage
          src={src}
          alt=""
          priority={priority}
          onLoad={() => setIsLoaded(true)}
          className="w-full h-full"
          objectFit="cover"
        />
      </div>

      {/* Overlay */}
      {overlay && (
        <div className={`absolute inset-0 ${overlayClassName}`} />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

/**
 * Avatar Image Component
 * Optimized for user avatars with fallback
 */
export const Avatar = ({
  src,
  alt,
  size = 40,
  className = '',
  fallback,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  const initials = alt
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className={`
        relative rounded-full overflow-hidden
        bg-gradient-to-br from-indigo-500 to-purple-600
        flex items-center justify-center
        text-white font-medium
        ${className}
      `}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      {...props}
    >
      {src && !hasError ? (
        <OptimizedImage
          src={src}
          alt={alt}
          className="w-full h-full"
          objectFit="cover"
          onError={() => setHasError(true)}
        />
      ) : fallback ? (
        fallback
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default OptimizedImage;
