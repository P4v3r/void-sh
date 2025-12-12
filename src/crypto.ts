// crypto.ts

// --- UTILS ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// --- KEY DERIVATION (PBKDF2) ---
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// --- GENERAZIONE RANDOM ---
async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export type EncryptResult = {
  encryptedBlob: Blob;
  keyString: string;
};

// --- ENCRYPT ---
export async function encryptFile(file: File, password?: string): Promise<EncryptResult> {
  let key: CryptoKey;
  let keyString = '';
  const iv = crypto.getRandomValues(new Uint8Array(12));

  if (password) {
    // MODALITÀ PASSWORD
    const salt = crypto.getRandomValues(new Uint8Array(16));
    key = await deriveKeyFromPassword(password, salt);
    
    keyString = password; // Ritorniamo la password all'UI
    
    const fileBuffer = await file.arrayBuffer();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );
    
    // Costruiamo il Blob finale: [SALT] + [IV] + [EncryptedData]
    // TypeScript Fix: Specifichiamo i tipi espliciti o castiamo se necessario, 
    // ma qui basta usare Uint8Array standard che è compatibile.
    const combinedBuffer = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
    combinedBuffer.set(salt, 0);
    combinedBuffer.set(iv, salt.byteLength);
    combinedBuffer.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);
    
    return { 
        encryptedBlob: new Blob([combinedBuffer], { type: 'application/octet-stream' }), 
        keyString 
    };

  } else {
    // MODALITÀ RANDOM KEY
    key = await generateKey();
    
    const fileBuffer = await file.arrayBuffer();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );

    const rawKey = await crypto.subtle.exportKey('raw', key);
    const keyB64 = arrayBufferToBase64(rawKey);
    const ivB64 = arrayBufferToBase64(iv.buffer);
    
    keyString = `${keyB64}:${ivB64}`;
    
    return { 
        encryptedBlob: new Blob([encrypted], { type: 'application/octet-stream' }), 
        keyString 
    };
  }
}

// --- DECRYPT ---
export async function decryptFile(
  encryptedBlob: Blob,
  keyOrPassword: string,
): Promise<Blob> {
  
  if (keyOrPassword.includes(':')) {
      // MODALITÀ 1: KEY:IV
      const [keyB64, ivB64] = keyOrPassword.split(':');
      if (!keyB64 || !ivB64) throw new Error('Invalid key format');

      const rawKeyBuffer = base64ToArrayBuffer(keyB64);
      const ivBuffer = base64ToArrayBuffer(ivB64);

      const key = await crypto.subtle.importKey(
        'raw',
        rawKeyBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
      );

      const encryptedBuffer = await encryptedBlob.arrayBuffer();
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
        key,
        encryptedBuffer,
      );

      return new Blob([decrypted]);

  } else {
      // MODALITÀ 2: PASSWORD
      const buffer = await encryptedBlob.arrayBuffer();
      const u8 = new Uint8Array(buffer);
      
      const salt = u8.slice(0, 16);
      const iv = u8.slice(16, 28);
      const data = u8.slice(28);
      
      const key = await deriveKeyFromPassword(keyOrPassword, salt);
      
      try {
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
          );
          return new Blob([decrypted]);
      } catch (e) {
          throw new Error("Decryption failed. Wrong password?");
      }
  }
}