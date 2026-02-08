const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Image processing configuration
const IMAGE_CONFIG = {
  // Thumbnail sizes
  sizes: {
    thumbnail: { width: 150, height: 150, fit: 'cover' },
    small: { width: 400, height: 400, fit: 'inside' },
    medium: { width: 800, height: 800, fit: 'inside' },
    large: { width: 1200, height: 1200, fit: 'inside' },
    hero: { width: 1920, height: 1080, fit: 'cover' }
  },
  // Quality settings
  quality: {
    webp: 85,
    jpeg: 90,
    png: 90,
    avif: 80
  },
  // Output formats to generate
  formats: ['webp', 'jpeg'],
  // Maximum input file size (50MB)
  maxInputSize: 50 * 1024 * 1024
};

/**
 * Generate unique filename
 */
const generateFilename = (originalName, suffix = '') => {
  const hash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const baseName = path.parse(originalName).name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .substring(0, 30);
  return `${baseName}-${timestamp}-${hash}${suffix}`;
};

/**
 * Process image and generate multiple sizes and formats
 * @param {string} inputPath - Path to input image
 * @param {string} outputDir - Directory for output files
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing results
 */
const processImage = async (inputPath, outputDir, options = {}) => {
  const config = { ...IMAGE_CONFIG, ...options };
  
  try {
    // Check if file exists
    await fs.access(inputPath);
    
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    
    // Validate image
    if (!['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff', 'avif'].includes(metadata.format)) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }
    
    const results = {
      original: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: (await fs.stat(inputPath)).size
      },
      variants: {}
    };
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate base filename
    const baseFilename = generateFilename(path.basename(inputPath));
    
    // Process each size
    for (const [sizeName, dimensions] of Object.entries(config.sizes)) {
      results.variants[sizeName] = {};
      
      // Generate each format
      for (const format of config.formats) {
        const filename = `${baseFilename}-${sizeName}.${format}`;
        const outputPath = path.join(outputDir, filename);
        
        // Skip if image is smaller than target size
        if (metadata.width <= dimensions.width && metadata.height <= dimensions.height && sizeName !== 'thumbnail') {
          // Just convert format, don't resize
          await sharp(inputPath)
            .toFormat(format, { quality: config.quality[format] })
            .toFile(outputPath);
        } else {
          // Resize and convert
          await sharp(inputPath)
            .resize(dimensions.width, dimensions.height, {
              fit: dimensions.fit,
              withoutEnlargement: true
            })
            .toFormat(format, { quality: config.quality[format] })
            .toFile(outputPath);
        }
        
        // Get file stats
        const stats = await fs.stat(outputPath);
        
        results.variants[sizeName][format] = {
          filename,
          path: outputPath,
          width: dimensions.width,
          height: dimensions.height,
          format,
          size: stats.size,
          url: `/uploads/images/${filename}`
        };
      }
    }
    
    // Generate blur placeholder (LQIP - Low Quality Image Placeholder)
    const blurPlaceholder = await generateBlurPlaceholder(inputPath);
    results.blurPlaceholder = blurPlaceholder;
    
    return results;
    
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
};

/**
 * Generate blur placeholder for lazy loading
 */
const generateBlurPlaceholder = async (inputPath) => {
  try {
    const buffer = await sharp(inputPath)
      .resize(20, 20, { fit: 'inside' })
      .blur()
      .toBuffer();
    
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Blur placeholder generation error:', error);
    return null;
  }
};

/**
 * Generate responsive srcset for an image
 */
const generateSrcSet = (variants, format = 'webp') => {
  const srcSet = [];
  
  for (const [sizeName, formats] of Object.entries(variants)) {
    if (formats[format]) {
      const { url, width } = formats[format];
      srcSet.push(`${url} ${width}w`);
    }
  }
  
  return srcSet.join(', ');
};

/**
 * Get optimal image variant based on display size
 */
const getOptimalVariant = (variants, targetWidth, format = 'webp') => {
  const availableSizes = Object.entries(variants)
    .filter(([_, f]) => f[format])
    .map(([name, f]) => ({ name, width: f[format].width, url: f[format].url }))
    .sort((a, b) => a.width - b.width);
  
  // Find smallest size that is >= target width
  const optimal = availableSizes.find(s => s.width >= targetWidth);
  
  // If no larger size found, use the largest available
  return optimal || availableSizes[availableSizes.length - 1];
};

/**
 * Batch process multiple images
 */
const batchProcess = async (imagePaths, outputDir, options = {}) => {
  const results = [];
  const errors = [];
  
  for (const imagePath of imagePaths) {
    try {
      const result = await processImage(imagePath, outputDir, options);
      results.push({ path: imagePath, success: true, result });
    } catch (error) {
      errors.push({ path: imagePath, success: false, error: error.message });
    }
  }
  
  return { results, errors };
};

/**
 * Cleanup processed images
 */
const cleanupProcessedImages = async (filename, outputDir) => {
  try {
    const files = await fs.readdir(outputDir);
    const baseName = path.parse(filename).name;
    
    for (const file of files) {
      if (file.startsWith(baseName)) {
        await fs.unlink(path.join(outputDir, file));
        console.log(`🗑️ Cleaned up: ${file}`);
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

/**
 * Get image dimensions without loading full image
 */
const getImageDimensions = async (inputPath) => {
  try {
    const metadata = await sharp(inputPath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      aspectRatio: metadata.width / metadata.height,
      format: metadata.format
    };
  } catch (error) {
    console.error('Get dimensions error:', error);
    return null;
  }
};

/**
 * Optimize existing image (in-place optimization)
 */
const optimizeImage = async (inputPath, options = {}) => {
  const config = { ...IMAGE_CONFIG, ...options };
  const tempPath = `${inputPath}.tmp`;
  
  try {
    const metadata = await sharp(inputPath).metadata();
    const format = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
    
    await sharp(inputPath)
      .toFormat(format, { 
        quality: config.quality[format] || config.quality.jpeg,
        progressive: true,
        optimizeCoding: true,
        mozjpeg: true
      })
      .toFile(tempPath);
    
    // Replace original with optimized version
    await fs.rename(tempPath, inputPath);
    
    const newStats = await fs.stat(inputPath);
    
    return {
      success: true,
      path: inputPath,
      originalFormat: metadata.format,
      newSize: newStats.size
    };
  } catch (error) {
    // Clean up temp file if exists
    try {
      await fs.unlink(tempPath);
    } catch {}
    
    throw error;
  }
};

module.exports = {
  processImage,
  generateBlurPlaceholder,
  generateSrcSet,
  getOptimalVariant,
  batchProcess,
  cleanupProcessedImages,
  getImageDimensions,
  optimizeImage,
  IMAGE_CONFIG
};
