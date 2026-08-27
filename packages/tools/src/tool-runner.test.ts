import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createTool, executeTool, zodToJsonSchema, ToolDefinition } from './index.js';

describe('Tool Interface & Runner (M2-01)', () => {
  const SampleInputSchema = z.object({
    clientId: z.string().min(1, { message: 'clientId é obrigatório' }),
    limit: z.number().int().min(1).max(50).default(10),
    filterTag: z.string().optional()
  });

  const SampleOutputSchema = z.object({
    records: z.array(z.object({ id: z.string(), value: z.number() })),
    total: z.number().int().nonnegative()
  });

  type SampleInput = z.infer<typeof SampleInputSchema>;
  type SampleOutput = z.infer<typeof SampleOutputSchema>;

  const validDefinition: ToolDefinition<SampleInput, SampleOutput> = {
    name: 'test_sample_tool',
    description: 'Ferramenta de teste para validação de interface e runtime',
    effect: 'read:memory',
    inputSchema: SampleInputSchema,
    outputSchema: SampleOutputSchema,
    postconditions: [
      {
        name: 'total_equals_records_length',
        description: 'Garante que total seja igual ao tamanho do array de registros',
        check: (_input, output) => output.total === output.records.length
      }
    ],
    handler: async (params) => {
      return {
        records: [{ id: `rec_${params.clientId}`, value: 42 }],
        total: 1
      };
    }
  };

  it('declara nome, descrição, inputSchema, outputSchema, effect e pós-condições', () => {
    const tool = createTool(validDefinition);

    expect(tool.name).toBe('test_sample_tool');
    expect(tool.description).toContain('Ferramenta de teste');
    expect(tool.effect).toBe('read:memory');
    expect(tool.definition.postconditions).toHaveLength(1);
    expect(tool.definition.postconditions?.[0]?.name).toBe('total_equals_records_length');
  });

  it('executa com sucesso para parâmetros válidos e retorna envelope ToolCallResult padronizado', async () => {
    const tool = createTool(validDefinition);

    const result = await tool.execute(
      { clientId: 'housewhey', limit: 5 },
      { toolCallId: 'tcall_custom_1', correlationId: 'corr_custom_1' }
    );

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.toolCallId).toBe('tcall_custom_1');
    expect(result.correlationId).toBe('corr_custom_1');
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.timestamp).toBe('string');
    expect(result.data).toEqual({
      records: [{ id: 'rec_housewhey', value: 42 }],
      total: 1
    });
  });

  it('gera toolCallId e correlationId automáticos quando omitidos no contexto', async () => {
    const tool = createTool(validDefinition);
    const result = await tool.execute({ clientId: 'housewhey' });

    expect(result.ok).toBe(true);
    expect(result.toolCallId).toMatch(/^tcall_/);
    expect(result.correlationId).toMatch(/^corr_/);
  });

  it('rejeita input inválido com INVALID_SCHEMA e mensagem segura sem executar handler', async () => {
    let handlerCalled = false;
    const def: ToolDefinition<SampleInput, SampleOutput> = {
      ...validDefinition,
      handler: async () => {
        handlerCalled = true;
        return { records: [], total: 0 };
      }
    };

    const result = await executeTool(def, { clientId: '', limit: 100 });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('INVALID_SCHEMA');
    expect(result.error).toContain("Parâmetros inválidos para a ferramenta 'test_sample_tool'");
    expect(result.error).toContain('clientId');
    expect(result.data).toBeUndefined();
    expect(handlerCalled).toBe(false);
  });

  it('rejeita output inválido com INVALID_SCHEMA quando o handler gera dados incompatíveis com o schema', async () => {
    const def: ToolDefinition<SampleInput, SampleOutput> = {
      ...validDefinition,
      // @ts-expect-error simula retorno corrompido em tempo de execução
      handler: async () => {
        return { records: 'invalid_array', total: -5 };
      }
    };

    const result = await executeTool(def, { clientId: 'housewhey' });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('INVALID_SCHEMA');
    expect(result.error).toContain('violou o contrato de saída');
    expect(result.data).toBeUndefined();
  });

  it('falha com POSTCONDITION_FAILED quando uma pós-condição declarada é violada', async () => {
    const def: ToolDefinition<SampleInput, SampleOutput> = {
      ...validDefinition,
      postconditions: [
        {
          name: 'total_consistency',
          check: () => ({ valid: false, message: 'O total diverge da contagem real de registros' })
        }
      ],
      handler: async () => ({ records: [], total: 0 })
    };

    const result = await executeTool(def, { clientId: 'housewhey' });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('POSTCONDITION_FAILED');
    expect(result.error).toContain("Pós-condição 'total_consistency' falhou");
    expect(result.error).toContain('O total diverge da contagem real de registros');
  });

  it('captura timeout com TOOL_TIMEOUT quando a execução excede o limite configurado', async () => {
    const def: ToolDefinition<SampleInput, SampleOutput> = {
      ...validDefinition,
      handler: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { records: [], total: 0 };
      }
    };

    const result = await executeTool(def, { clientId: 'housewhey' }, { timeoutMs: 50 });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('TOOL_TIMEOUT');
    expect(result.error).toContain('excedeu o tempo limite de 50ms');
  });

  it('mascara caminhos sensíveis e não inclui stack trace no erro quando exceção é lançada', async () => {
    const def: ToolDefinition<SampleInput, SampleOutput> = {
      ...validDefinition,
      handler: async () => {
        throw new Error(
          'Falha crítica de conexão no arquivo C:\\Users\\barba\\Documents\\secrets\\db.sqlite ao abrir /var/log/private.log'
        );
      }
    };

    const result = await executeTool(def, { clientId: 'housewhey' });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('TOOL_ERROR');
    expect(result.error).toBeDefined();
    // Verifica que caminhos sensíveis foram mascarados
    expect(result.error).not.toContain('C:\\Users\\barba\\Documents\\secrets\\db.sqlite');
    expect(result.error).not.toContain('/var/log/private.log');
    expect(result.error).toContain('[REDACTED_PATH]');
    // Verifica que o envelope não possui stack trace em nenhum campo
    expect((result as unknown as Record<string, unknown>).stack).toBeUndefined();
  });

  it('converte definição de Tool para schema de Function Calling do OpenAI / OpenRouter', () => {
    const tool = createTool(validDefinition);
    const schema = tool.toOpenAISchema();

    expect(schema.type).toBe('function');
    expect(schema.function.name).toBe('test_sample_tool');
    expect(schema.function.description).toContain('Ferramenta de teste');

    const params = schema.function.parameters as {
      type: string;
      properties: Record<string, { type: string }>;
      required: string[];
    };
    expect(params.type).toBe('object');
    expect(params.properties?.clientId).toBeDefined();
    expect(params.properties?.clientId?.type).toBe('string');
    expect(params.properties?.limit).toBeDefined();
    expect(params.properties?.limit?.type).toBe('number');
    expect(params.required).toContain('clientId');
    expect(params.required).not.toContain('limit'); // default/optional
    expect(params.required).not.toContain('filterTag'); // optional
  });

  it('converte schemas Zod arbitrários diretamente com zodToJsonSchema', () => {
    const complexSchema = z.object({
      category: z.enum(['A', 'B', 'C']),
      items: z.array(z.string()),
      active: z.boolean().default(true)
    });

    const jsonSchema = zodToJsonSchema(complexSchema) as {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.properties.category).toEqual({
      type: 'string',
      enum: ['A', 'B', 'C'],
      description: undefined
    });
    expect(jsonSchema.properties.items).toEqual({
      type: 'array',
      items: { type: 'string' },
      description: undefined
    });
    expect(jsonSchema.required).toContain('category');
    expect(jsonSchema.required).toContain('items');
    expect(jsonSchema.required).not.toContain('active');
  });
});
