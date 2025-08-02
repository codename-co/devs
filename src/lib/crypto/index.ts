export class CryptoService {
  private static encoder = new TextEncoder()
  private static decoder = new TextDecoder()

  private static async deriveKey(
    password: string,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  static async encrypt(
    plaintext: string,
    password: string,
  ): Promise<{
    ciphertext: string
    iv: string
    salt: string
  }> {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await this.deriveKey(password, salt)

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      this.encoder.encode(plaintext),
    )

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...salt)),
    }
  }

  static async decrypt(
    ciphertext: string,
    password: string,
    iv: string,
    salt: string,
  ): Promise<string> {
    const saltArray = new Uint8Array(
      atob(salt)
        .split('')
        .map((c) => c.charCodeAt(0)),
    )
    const ivArray = new Uint8Array(
      atob(iv)
        .split('')
        .map((c) => c.charCodeAt(0)),
    )
    const ciphertextArray = new Uint8Array(
      atob(ciphertext)
        .split('')
        .map((c) => c.charCodeAt(0)),
    )

    const key = await this.deriveKey(password, saltArray)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      key,
      ciphertextArray,
    )

    return this.decoder.decode(decrypted)
  }

  static async generateMasterKey(): Promise<string> {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
  }

  static async hashPassword(password: string): Promise<string> {
    const msgBuffer = this.encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
}

export class SecureStorage {
  private static MASTER_KEY_KEY = 'devs_master_key'
  private static masterKey: string | null = null

  static async init(): Promise<void> {
    const stored = localStorage.getItem(this.MASTER_KEY_KEY)
    if (!stored) {
      this.masterKey = await CryptoService.generateMasterKey()
      localStorage.setItem(this.MASTER_KEY_KEY, this.masterKey)
    } else {
      this.masterKey = stored
    }
  }

  static async encryptCredential(
    credential: string,
  ): Promise<{ encrypted: string; iv: string; salt: string }> {
    if (!this.masterKey) {
      throw new Error('SecureStorage not initialized')
    }

    const { ciphertext, iv, salt } = await CryptoService.encrypt(
      credential,
      this.masterKey,
    )

    return { encrypted: ciphertext, iv, salt }
  }

  static async decryptCredential(
    encrypted: string,
    iv: string,
    salt: string,
  ): Promise<string> {
    if (!this.masterKey) {
      throw new Error('SecureStorage not initialized')
    }

    return CryptoService.decrypt(encrypted, this.masterKey, iv, salt)
  }

  static lock(): void {
    this.masterKey = null
  }

  static unlock(masterKey: string): void {
    this.masterKey = masterKey
  }

  static isLocked(): boolean {
    return this.masterKey === null
  }
}
