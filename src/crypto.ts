// crypto.ts

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

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export type EncryptResult = {
  encryptedBlob: Blob;
  keyString: string; // contiene chiave + IV in base64
};

export async function encryptFile(file: File): Promise<EncryptResult> {
  const key = await generateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // IV per GCM

  const fileBuffer = await file.arrayBuffer();

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer,
  );

  const rawKey = await crypto.subtle.exportKey('raw', key);
  const keyB64 = arrayBufferToBase64(rawKey);
  const ivB64 = arrayBufferToBase64(iv.buffer);

  const keyString = `${keyB64}:${ivB64}`;
  const encryptedBlob = new Blob([encrypted], { type: 'application/octet-stream' });

  return { encryptedBlob, keyString };
}

export async function decryptFile(
  encryptedBlob: Blob,
  keyString: string,
): Promise<Blob> {
  const [keyB64, ivB64] = keyString.split(':');
  if (!keyB64 || !ivB64) {
    throw new Error('Chiave non valida');
  }

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
}
