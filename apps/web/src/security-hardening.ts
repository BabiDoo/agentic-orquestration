/**
 * @adzhub/web - Security Hardening Engine (M7-09)
 * Rate limiting in-memory, limite de payload, headers de segurança estritos (CSP, nosniff, frame-ancestors 'none'),
 * sanitização de logs e proteção de injeção de falhas controladas por DEMO_MODE.
 */

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

export interface SecurityHeadersOptions {
  isProduction?: boolean;
}

/**
 * Token-Bucket in-memory Rate Limiter por IP ou Session Identifier.
 */
export class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: RateLimiterOptions = { windowMs: 60000, maxRequests: 60 }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  public checkLimit(clientIdentifier: string): {
    allowed: boolean;
    remaining: number;
    resetInMs: number;
  } {
    const now = Date.now();
    const existing = this.requests.get(clientIdentifier);

    if (!existing || now > existing.resetAt) {
      this.requests.set(clientIdentifier, {
        count: 1,
        resetAt: now + this.windowMs
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetInMs: this.windowMs
      };
    }

    if (existing.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInMs: Math.max(0, existing.resetAt - now)
      };
    }

    existing.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - existing.count,
      resetInMs: Math.max(0, existing.resetAt - now)
    };
  }

  public reset(): void {
    this.requests.clear();
  }
}

/**
 * Retorna os headers de segurança HTTP recomendados para hardening (CSP, nosniff, frame-ancestors 'none').
 */
export function getSecurityHeaders(_options: SecurityHeadersOptions = {}): Record<string, string> {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' https://openrouter.ai",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ];

  return {
    'Content-Security-Policy': cspDirectives.join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  };
}

/**
 * Validador de tamanho de payload para prevenir Denial of Service (máx 1MB).
 */
export function validatePayloadSize(
  payload: unknown,
  maxSizeBytes: number = 1024 * 1024
): { valid: boolean; sizeBytes: number; error?: string } {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload ?? '');
  const sizeBytes = Buffer.byteLength(text, 'utf-8');

  if (sizeBytes > maxSizeBytes) {
    return {
      valid: false,
      sizeBytes,
      error: `Payload excede o tamanho máximo permitido de ${maxSizeBytes} bytes (recebido: ${sizeBytes} bytes)`
    };
  }

  return { valid: true, sizeBytes };
}

/**
 * Valida se injeção de falha é permitida apenas em DEMO_MODE e para cenários na allowlist (S0–S5).
 */
export function isFaultInjectionAllowed(scenario: string, demoMode: boolean = false): boolean {
  if (!demoMode) return false;
  const allowlist = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
  return allowlist.includes(scenario.toUpperCase());
}

/**
 * Sanitizador de logs para garantir que nenhuma API key ou Authorization header seja gravado.
 */
export function sanitizeLogOutput(message: string): string {
  return message
    .replace(/sk-or-v1-[a-zA-Z0-9_-]{16,}/g, 'sk-or-v1-***REDACTED***')
    .replace(/Bearer\s+[a-zA-Z0-9_.-]{16,}/gi, 'Bearer ***REDACTED***')
    .replace(/"apiKey":\s*"[^"]+"/g, '"apiKey":"***REDACTED***"')
    .replace(/"authorization":\s*"[^"]+"/gi, '"authorization":"***REDACTED***"');
}
