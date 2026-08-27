import { describe, expect, it } from 'vitest';
import {
  redactApiKey,
  redactSecretsRecursively,
  getNoStoreHeaders,
  maskApiKey,
  ByokSessionManager,
  REDACTED_API_KEY_SENTINEL
} from './index.js';

describe('BYOK Lifecycle & Security (M2-06)', () => {
  const sampleKey = 'sk-or-v1-9876543210abcdef9876543210abcdef';

  describe('redactApiKey', () => {
    it('mascara chaves OpenRouter padrão sk-or-v1-... em textos', () => {
      const logMessage = `Falha ao autenticar com ${sampleKey} no endpoint openrouter.ai`;
      const sanitized = redactApiKey(logMessage);

      expect(sanitized).not.toContain(sampleKey);
      expect(sanitized).toContain(REDACTED_API_KEY_SENTINEL);
      expect(sanitized).toBe(
        `Falha ao autenticar com ${REDACTED_API_KEY_SENTINEL} no endpoint openrouter.ai`
      );
    });

    it('mascara chave específica conhecida mesmo com formato customizado', () => {
      const customKey = 'my_custom_secret_key_12345678';
      const text = `Enviando requisição com ${customKey} para provedor de IA`;
      const sanitized = redactApiKey(text, customKey);

      expect(sanitized).not.toContain(customKey);
      expect(sanitized).toContain(REDACTED_API_KEY_SENTINEL);
    });

    it('mascara tokens em cabeçalhos de autorização Bearer', () => {
      const authHeader = `Authorization: Bearer sk-11223344556677889900aabbccddeeff`;
      const sanitized = redactApiKey(authHeader);

      expect(sanitized).not.toContain('sk-11223344556677889900aabbccddeeff');
      expect(sanitized).toBe(`Authorization: Bearer ${REDACTED_API_KEY_SENTINEL}`);
    });

    it('preserva strings inofensivas inalteradas', () => {
      const normalText = 'Campanha Whey Baunilha com CPA de R$ 81,70 e ROAS de 2.69';
      expect(redactApiKey(normalText)).toBe(normalText);
    });
  });

  describe('redactSecretsRecursively', () => {
    it('varre e mascara chaves de propriedades sensíveis em objetos aninhados', () => {
      const requestPayload = {
        taskId: 'tsk_001',
        runId: 'run_001',
        config: {
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: sampleKey,
          openrouter_api_key: sampleKey,
          temperature: 0.2
        },
        metadata: {
          authorization: `Bearer ${sampleKey}`,
          description: 'Execução agêntica Housewhey'
        }
      };

      const sanitized = redactSecretsRecursively(requestPayload, sampleKey);

      expect(sanitized.config.apiKey).toBe(REDACTED_API_KEY_SENTINEL);
      expect(sanitized.config.openrouter_api_key).toBe(REDACTED_API_KEY_SENTINEL);
      expect(sanitized.metadata.authorization).toBe(REDACTED_API_KEY_SENTINEL);
      expect(sanitized.config.model).toBe('anthropic/claude-3.5-sonnet');
      expect(sanitized.metadata.description).toBe('Execução agêntica Housewhey');

      // Garante que o objeto original não foi mutado
      expect(requestPayload.config.apiKey).toBe(sampleKey);
    });

    it('varre arrays de eventos de trace e sanitiza dados internos', () => {
      const traceEvents = [
        {
          seq: 1,
          type: 'TOOL_CALL_STARTED',
          payload: {
            tool: 'list_ads',
            auth_header: `Bearer ${sampleKey}`
          }
        },
        {
          seq: 2,
          type: 'TOOL_CALL_COMPLETED',
          payload: {
            result: `Dados coletados com chave ${sampleKey}`
          }
        }
      ];

      const sanitized = redactSecretsRecursively(traceEvents, sampleKey);

      expect(sanitized[0]?.payload.auth_header).toBe(REDACTED_API_KEY_SENTINEL);
      expect(sanitized[1]?.payload.result).not.toContain(sampleKey);
      expect(sanitized[1]?.payload.result).toContain(REDACTED_API_KEY_SENTINEL);
    });
  });

  describe('getNoStoreHeaders', () => {
    it('retorna cabeçalhos HTTP rigorosos para impedir cacheamento de respostas', () => {
      const headers = getNoStoreHeaders();

      expect(headers['Cache-Control']).toContain('no-store');
      expect(headers['Cache-Control']).toContain('no-cache');
      expect(headers['Cache-Control']).toContain('must-revalidate');
      expect(headers['Pragma']).toBe('no-cache');
      expect(headers['Expires']).toBe('0');
    });
  });

  describe('maskApiKey', () => {
    it('gera máscara visual para exibição na UI sem expor o segredo completo', () => {
      const masked = maskApiKey('sk-or-v1-abcdef1234567890abcdef1234567890');
      expect(masked).toBe('sk-or-v••••••••7890');
      expect(masked).not.toContain('abcdef123456');
    });

    it('retorna valor padrão para chaves curtas ou vazias', () => {
      expect(maskApiKey('')).toBe('••••••••');
      expect(maskApiKey('short')).toBe('••••••••');
    });
  });

  describe('ByokSessionManager', () => {
    it('armazena, recupera e esquece chave volátil com forgetKey()', () => {
      const manager = new ByokSessionManager('test_byok_key');

      expect(manager.hasKey()).toBe(false);
      expect(manager.getKey()).toBeNull();
      expect(manager.getMaskedKey()).toBeNull();

      // Define chave
      manager.setKey(sampleKey);
      expect(manager.hasKey()).toBe(true);
      expect(manager.getKey()).toBe(sampleKey);
      expect(manager.getMaskedKey()).toContain('sk-or-v');

      // Ação "Esquecer chave"
      manager.forgetKey();
      expect(manager.hasKey()).toBe(false);
      expect(manager.getKey()).toBeNull();
      expect(manager.getMaskedKey()).toBeNull();
    });

    it('limpa chave quando setKey é chamado com string vazia', () => {
      const manager = new ByokSessionManager('test_byok_key_2');
      manager.setKey(sampleKey);
      expect(manager.hasKey()).toBe(true);

      manager.setKey('   ');
      expect(manager.hasKey()).toBe(false);
      expect(manager.getKey()).toBeNull();
    });
  });
});
