/**
 * Steganography Module for void.sh
 * 
 * Hide encrypted data inside images using LSB (Least Significant Bit) encoding.
 * 
 * IMPLEMENTATION PLAN:
 * 1. Use LSB (Least Significant Bit) encoding
 * 2. Support PNG images (lossless compression required)
 * 3. Use canvas API for pixel manipulation
 * 4. Embed magic bytes to detect stego images
 * 
 * SECURITY NOTES:
 * - LSB steganography is detectable by statistical analysis
 * - For true steganography, consider adaptive steganography algorithms
 * - Image quality will degrade with larger payloads
 */

export interface StegoResult {
  imageBlob: Blob;
  originalSize: number;
  capacity: number;
  dataHidden: number;
}

// Magic bytes to identify void.sh stego images (ASCII: "VOID")
const STEGO_MAGIC = new Uint8Array([0x56, 0x4F, 0x49, 0x44]);
const STEGO_VERSION = 1;

/**
 * Calculate maximum data capacity for an image
 * Assumes RGBA (4 bytes per pixel), using LSB of each byte
 */
export function calculateCapacity(imageWidth: number, imageHeight: number): number {
  // Total bytes available: pixels * 4 channels (RGBA) * 1 bit per channel (LSB)
  // Subtract header size for magic + version + data length
  const totalBits = imageWidth * imageHeight * 4;
  const headerBits = (STEGO_MAGIC.length + 1 + 4) * 8; // magic + version + length (4 bytes)
  const availableBits = totalBits - headerBits;
  return Math.floor(availableBits / 8); // Convert to bytes
}

/**
 * Check if an image has void.sh stego data
 */
export async function detectStegoImage(imageFile: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Read first bytes to check magic
        const extractedMagic = new Uint8Array(STEGO_MAGIC.length);
        let bitIndex = 0;
        
        for (let i = 0; i < STEGO_MAGIC.length; i++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            byte |= ((data[bitIndex++] & 1) << bit);
          }
          extractedMagic[i] = byte;
        }
        
        URL.revokeObjectURL(url);
        
        // Check if magic matches
        resolve(extractedMagic.toString() === STEGO_MAGIC.toString());
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Hide data inside an image using LSB steganography
 * 
 * @param imageFile - The carrier image (should be PNG for lossless)
 * @param data - The data to hide
 * @param onProgress - Optional progress callback
 */
export async function hideDataInImage(
  imageFile: File,
  data: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<StegoResult> {
  // This is a stub implementation - full implementation requires:
  // 1. Load image to canvas
  // 2. Embed header (magic + version + data length)
  // 3. Embed data using LSB
  // 4. Export canvas to blob
  
  onProgress?.(10);
  
  // Load image
  const img = await loadImage(imageFile);
  onProgress?.(30);
  
  // Calculate capacity
  const capacity = calculateCapacity(img.width, img.height);
  const headerSize = STEGO_MAGIC.length + 1 + 4; // magic + version + length
  const requiredSpace = headerSize + data.byteLength;
  
  if (capacity < requiredSpace) {
    throw new Error(
      `Image capacity (${capacity} bytes) is insufficient. ` +
      `Need ${requiredSpace} bytes (including ${headerSize} byte header). ` +
      `Minimum recommended image size: ${Math.ceil(Math.sqrt(requiredSpace * 8 / 4))}x${Math.ceil(Math.sqrt(requiredSpace * 8 / 4))} pixels.`
    );
  }
  
  onProgress?.(50);
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas context');
  }
  
  ctx.drawImage(img, 0, 0);
  onProgress?.(60);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixelData = imageData.data;
  
  // Embed header + data using LSB
  let bitIndex = 0;
  
  // Helper to set LSB (always bit 0 for simplicity)
  const setBit = (byteIndex: number, value: number) => {
    if (value) {
      pixelData[byteIndex] |= 1;
    } else {
      pixelData[byteIndex] &= 0xFE;
    }
  };
  
  // Embed magic bytes
  for (let i = 0; i < STEGO_MAGIC.length; i++) {
    for (let bit = 0; bit < 8; bit++) {
      setBit(bitIndex++, (STEGO_MAGIC[i] >> bit) & 1);
    }
  }
  onProgress?.(70);
  
  // Embed version
  for (let bit = 0; bit < 8; bit++) {
    setBit(bitIndex++, (STEGO_VERSION >> bit) & 1);
  }
  
  // Embed data length (4 bytes, big endian)
  const dataLengthView = new DataView(data);
  for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
    const byte = dataLengthView.getUint8(byteIdx);
    for (let bit = 0; bit < 8; bit++) {
      setBit(bitIndex++, (byte >> bit) & 1);
    }
  }
  
  // Embed actual data
  const dataBytes = new Uint8Array(data);
  for (let i = 0; i < dataBytes.length; i++) {
    for (let bit = 0; bit < 8; bit++) {
      setBit(bitIndex++, (dataBytes[i] >> bit) & 1);
    }
    if (i % 1000 === 0) {
      onProgress?.(70 + Math.floor((i / dataBytes.length) * 25));
    }
  }
  
  onProgress?.(95);
  
  // Put modified image data back
  ctx.putImageData(imageData, 0, 0);
  
  // Export to blob (PNG for lossless)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      },
      'image/png',
      1.0
    );
  });
  
  onProgress?.(100);
  
  return {
    imageBlob: blob,
    originalSize: imageFile.size,
    capacity,
    dataHidden: data.byteLength,
  };
}

/**
 * Extract hidden data from a stego image
 */
export async function extractDataFromImage(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<ArrayBuffer> {
  const img = await loadImage(imageFile);
  onProgress?.(30);
  
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas context');
  }
  
  ctx.drawImage(img, 0, 0);
  onProgress?.(40);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixelData = imageData.data;
  
  let bitIndex = 0;
  
  // Helper to read a single bit
  const readBit = (): number => {
    return pixelData[bitIndex++] & 1;
  };
  
  // Read and verify magic bytes
  const extractedMagic = new Uint8Array(STEGO_MAGIC.length);
  for (let i = 0; i < STEGO_MAGIC.length; i++) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit++) {
      byte |= (readBit() << bit);
    }
    extractedMagic[i] = byte;
  }
  
  if (extractedMagic.toString() !== STEGO_MAGIC.toString()) {
    throw new Error('No void.sh steganography data found in this image');
  }
  onProgress?.(50);
  
  // Read version
  let version = 0;
  for (let bit = 0; bit < 8; bit++) {
    version |= (readBit() << bit);
  }
  
  if (version !== STEGO_VERSION) {
    throw new Error(`Unsupported steganography version: ${version}`);
  }
  
  // Read data length (4 bytes, big endian)
  const dataLengthBuffer = new ArrayBuffer(4);
  const dataLengthView = new DataView(dataLengthBuffer);
  for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit++) {
      byte |= (readBit() << bit);
    }
    dataLengthView.setUint8(byteIdx, byte);
  }
  const dataLength = dataLengthView.getUint32(0, false); // big endian
  onProgress?.(60);
  
  // Validate data length
  const capacity = calculateCapacity(img.width, img.height);
  const headerSize = STEGO_MAGIC.length + 1 + 4;
  if (dataLength > capacity - headerSize) {
    throw new Error('Invalid data length in stego header');
  }
  
  // Read data
  const resultBuffer = new ArrayBuffer(dataLength);
  const resultView = new Uint8Array(resultBuffer);
  for (let i = 0; i < dataLength; i++) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit++) {
      byte |= (readBit() << bit);
    }
    resultView[i] = byte;
    
    if (i % 1000 === 0) {
      onProgress?.(60 + Math.floor((i / dataLength) * 35));
    }
  }
  
  onProgress?.(100);
  
  return resultBuffer;
}

// Helper function to load an image file
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}
