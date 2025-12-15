// Utility to generate PBR maps from a single image source
import * as THREE from 'three';

export const generatePBRMaps = (image) => {
  const canvas = document.createElement('canvas');
  const width = image.width;
  const height = image.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Buffers for new maps
  const normalData = new Uint8ClampedArray(data.length);
  const roughnessData = new Uint8ClampedArray(data.length);
  const aoData = new Uint8ClampedArray(data.length);

  // Helper to get grayscale value (0-255)
  const getGray = (x, y) => {
    if (x < 0) x = 0;
    if (x >= width) x = width - 1;
    if (y < 0) y = 0;
    if (y >= height) y = height - 1;
    const i = (y * width + x) * 4;
    return (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      
      // --- Normal Map Generation (Sobel Operator) ---
      const tl = getGray(x - 1, y - 1);
      const t  = getGray(x,     y - 1);
      const tr = getGray(x + 1, y - 1);
      const l  = getGray(x - 1, y);
      const r  = getGray(x + 1, y);
      const bl = getGray(x - 1, y + 1);
      const b  = getGray(x,     y + 1);
      const br = getGray(x + 1, y + 1);

      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);
      // const dZ = 1.0 / 2.0; // Strength factor (unused)

      const v = new THREE.Vector3(-dX, -dY, 1.0).normalize(); // Invert for tangent space

      // Convert -1..1 to 0..255
      normalData[i]     = (v.x * 0.5 + 0.5) * 255;
      normalData[i + 1] = (v.y * 0.5 + 0.5) * 255;
      normalData[i + 2] = (v.z * 0.5 + 0.5) * 255;
      normalData[i + 3] = 255;

      // --- Roughness Map (Inverted Brightness + High Pass) ---
      // Bright areas = smooth (low roughness), Dark areas = rough
      const gray = getGray(x, y);
      const roughVal = 255 - gray; 
      roughnessData[i] = roughVal;     // R
      roughnessData[i+1] = roughVal;   // G
      roughnessData[i+2] = roughVal;   // B
      roughnessData[i+3] = 255;        // A

      // --- AO Map (Simple contrast enhancement of inverted brightness) ---
      // Dark crevices stay dark, flat areas white
      const aoVal = Math.min(255, gray + 50); 
      aoData[i] = aoVal;
      aoData[i+1] = aoVal;
      aoData[i+2] = aoVal;
      aoData[i+3] = 255;
    }
  }

  const createTexture = (arrayData) => {
    const dataTexture = new ImageData(arrayData, width, height);
    // const tex = new THREE.CanvasTexture(canvas); // Placeholder setup (unused)
    // Actually we need to put data back to canvas to make a texture easily usable or use DataTexture
    // Using CanvasTexture via putImageData is safer for compatibility
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(dataTexture, 0, 0);
    const texture = new THREE.CanvasTexture(tempCanvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 16; // Max quality
    return texture;
  };

  return {
    normalMap: createTexture(normalData),
    roughnessMap: createTexture(roughnessData),
    aoMap: createTexture(aoData)
  };
};
