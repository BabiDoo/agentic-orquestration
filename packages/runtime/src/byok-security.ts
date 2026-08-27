/**
 * @adzhub/runtime - BYOK Security & Lifecycle Engine
 * Gerenciamento seguro de Bring Your Own Key (OpenRouter), retenção volátil e motor de redaction recursiva.
 */

export const REDACTED_API_KEY_SENTINEL = '[REDACTED_API_KEY]' as const;
export const REDACTED_SECRET_SENTINEL = '[REDACTED]' as const;

// Padrões de chaves de API conhecidas e headers de autorização
const OPENROUTER_KEY_PATTERN = /sk-or-v1-[a-f0-9]{16,128}/gi;
const GENERIC_SK_PATTERN = /sk-[a-zA-Z0-9_-]{20,128}/gi;
const BEARER_AUTH_PATTERN = /Bearer\s+([a-zA-Z0-9_.-]{15,})/gi;

const SENSITIVE_PROPERTY_NAMES = new Set([
  'apikey',
  'openrouterapikey',
  'openrouterkey',
  'authorization',
  'authheader',
  'secret',
  'secretkey',
  'token',
  'accesstoken',
  'password'
]);

/**
 * Sanitiza e mascara qualquer ocorrência de chave de API em uma string.
 */
export function redactApiKey(text: string, knownKey?: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let sanitized = text;

  // 1. Remove chave específica conhecida se fornecida
  if (knownKey && typeof knownKey === 'string' && knownKey.length >= 8) {
    const escaped = knownKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sanitized = sanitized.replace(new RegExp(escaped, 'g'), REDACTED_API_KEY_SENTINEL);
  }

  // 2. Remove padrões de chaves OpenRouter e genéricas
  sanitized = sanitized.replace(OPENROUTER_KEY_PATTERN, REDACTED_API_KEY_SENTINEL);
  sanitized = sanitized.replace(GENERIC_SK_PATTERN, REDACTED_API_KEY_SENTINEL);

  // 3. Remove tokens em headers Bearer
  sanitized = sanitized.replace(BEARER_AUTH_PATTERN, `Bearer ${REDACTED_API_KEY_SENTINEL}`);

  return sanitized;
}

/**
 * Varre recursivamente estruturas de dados (objetos, arrays e strings)
 * e substitui chaves e valores sensíveis pelo marcador de redaction.
 */
export function redactSecretsRecursively<T>(data: T, knownKey?: string): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return redactApiKey(data, knownKey) as unknown as T;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSecretsRecursively(item, knownKey)) as unknown as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');

    if (SENSITIVE_PROPERTY_NAMES.has(normalizedKey)) {
      result[key] = REDACTED_API_KEY_SENTINEL;
    } else {
      result[key] = redactSecretsRecursively(value, knownKey);
    }
  }

  return result as T;
}

/**
 * Retorna os cabeçalhos HTTP estritos de segurança para endpoints stateless que impedem cacheamento de respostas.
 */
export function getNoStoreHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store'
  };
}

/**
 * Máscara visual segura para apresentação da chave de API na UI (ex: sk-or...1234).
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
    return '••••••••';
  }
  const prefix = apiKey.slice(0, 7);
  const suffix = apiKey.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

export const BYOK_STORAGE_KEY = 'adzhub_byok_openrouter_key';

interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getGlobalSessionStorage(): SessionStorageLike | null {
  try {
    const g = globalThis as unknown as { sessionStorage?: SessionStorageLike };
    if (g && typeof g.sessionStorage?.getItem === 'function') {
      return g.sessionStorage;
    }
  } catch {
    // Ignora erro de acesso ao ambiente
  }
  return null;
}

/**
 * Gerenciador de sessão volátil de chave OpenRouter no browser (BYOK).
 * Utiliza sessionStorage ou memória volátil caso o ambiente não suporte Web Storage.
 * Garante que a chave nunca seja gravada em localStorage ou cookies persistentes.
 */
export class ByokSessionManager {
  private inMemoryKey: string | null = null;
  private readonly storageKey: string;

  constructor(storageKey = BYOK_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  public setKey(key: string): void {
    const trimmed = key ? key.trim() : '';
    if (!trimmed) {
      this.forgetKey();
      return;
    }

    this.inMemoryKey = trimmed;

    try {
      const storage = getGlobalSessionStorage();
      if (storage) {
        storage.setItem(this.storageKey, trimmed);
      }
    } catch {
      // Falha graciosa se sessionStorage estiver desabilitado (ex: modo anônimo restrito)
    }
  }

  public getKey(): string | null {
    if (this.inMemoryKey) {
      return this.inMemoryKey;
    }

    try {
      const storage = getGlobalSessionStorage();
      if (storage) {
        const stored = storage.getItem(this.storageKey);
        if (stored) {
          this.inMemoryKey = stored;
          return stored;
        }
      }
    } catch {
      // Ignora erro de acesso a storage
    }

    return null;
  }

  public hasKey(): boolean {
    const key = this.getKey();
    return Boolean(key && key.length > 0);
  }

  public getMaskedKey(): string | null {
    const key = this.getKey();
    if (!key) return null;
    return maskApiKey(key);
  }

  public forgetKey(): void {
    this.inMemoryKey = null;

    try {
      const storage = getGlobalSessionStorage();
      if (storage) {
        storage.removeItem(this.storageKey);
      }
    } catch {
      // Ignora erro
    }
  }

  public clearKey(): void {
    this.forgetKey();
  }
}
