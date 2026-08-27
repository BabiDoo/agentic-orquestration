import { describe, it, expect } from 'vitest';
import {
  InMemoryRateLimiter,
  getSecurityHeaders,
  validatePayloadSize,
  isFaultInjectionAllowed,
  sanitizeLogOutput
} from '../../apps/web/src/security-hardening.js';
import { handleFetchRequest } from '../../apps/web/src/api.js';
import { runSecretScan } from '../../scripts/secret-scan.js';

describe('M7-09 — Testes de Hardening da Aplicação e Segurança', () => {
  describe('1. Rate Limiting In-Memory', () => {
    it('permite requisições dentro do limite e bloqueia com status 429 ao atingir a cota', () => {
      const limiter = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 3 });
      const ip = '192.168.1.100';

      expect(limiter.checkLimit(ip).allowed).toBe(true);
      expect(limiter.checkLimit(ip).allowed).toBe(true);
      expect(limiter.checkLimit(ip).allowed).toBe(true);

      const fourth = limiter.checkLimit(ip);
      expect(fourth.allowed).toBe(false);
      expect(fourth.remaining).toBe(0);
      expect(fourth.resetInMs).toBeGreaterThan(0);
    });
  });

  describe('2. Headers de Segurança HTTP (CSP, nosniff, frame-ancestors)', () => {
    it('deve emitir Content-Security-Policy restritiva e proteções de framing', () => {
      const headers = getSecurityHeaders();

      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Referrer-Policy']).toBe('no-referrer');
    });

    it('API HTTP aplica os security headers em todas as respostas', async () => {
      const req = new Request('http://localhost:3000/api/health', { method: 'GET' });
      const res = await handleFetchRequest(req);

      expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });

  describe('3. Validação de Tamanho Máximo de Payload (1MB)', () => {
    it('aceita payloads normais e rejeita payloads maiores que 1MB com erro descritivo', () => {
      const smallPayload = { task: 'Análise simples', count: 10 };
      expect(validatePayloadSize(smallPayload).valid).toBe(true);

      const hugePayload = { bigData: 'X'.repeat(1024 * 1024 + 50) };
      const check = validatePayloadSize(hugePayload);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('Payload excede o tamanho máximo');
    });
  });

  describe('4. Proteção de Injeção de Falhas (Apenas em DEMO_MODE e Cenários Allowlisted)', () => {
    it('bloqueia injeção de falhas se demoMode for falso', () => {
      expect(isFaultInjectionAllowed('S1', false)).toBe(false);
      expect(isFaultInjectionAllowed('S3', false)).toBe(false);
    });

    it('permite injeção de falhas apenas para cenários S0–S5 com demoMode=true', () => {
      expect(isFaultInjectionAllowed('S1', true)).toBe(true);
      expect(isFaultInjectionAllowed('S5', true)).toBe(true);
      expect(isFaultInjectionAllowed('S99_UNKNOWN', true)).toBe(false);
    });
  });

  describe('5. Sanitização de Logs e Prevenção de Vazamento de Segredos', () => {
    it('remove e mascara chaves OpenRouter e Bearer tokens em mensagens de log', () => {
      const rawLog =
        'Requisicao com apiKey: sk-or-v1-abcdef0123456789abcdef0123456789 e Bearer my_secret_token_1234567890123456';
      const sanitized = sanitizeLogOutput(rawLog);

      expect(sanitized).not.toContain('abcdef0123456789abcdef0123456789');
      expect(sanitized).not.toContain('my_secret_token_1234567890123456');
      expect(sanitized).toContain('***REDACTED***');
    });
  });

  describe('6. Secret Scan Integrado', () => {
    it('executa secret scan na árvore do monorepo e valida conformidade', () => {
      const scanResult = runSecretScan();
      expect(scanResult.passed).toBe(true);
      expect(scanResult.violations).toHaveLength(0);
    });
  });
});
