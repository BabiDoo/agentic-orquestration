import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createTool } from './index.js';

describe('@adzhub/tools index exports', () => {
  it('instancia e executa ferramenta governada através da exportação raiz', async () => {
    const mathTool = createTool({
      name: 'double_tool',
      description: 'Calcula o dobro do valor numérico fornecido',
      effect: 'read:memory',
      inputSchema: z.object({ val: z.number() }),
      outputSchema: z.object({ doubled: z.number() }),
      async handler(params) {
        return { doubled: params.val * 2 };
      }
    });

    const result = await mathTool.execute({ val: 21 });
    expect(result.ok).toBe(true);
    expect(result.data?.doubled).toBe(42);
    expect(result.errorCode).toBeUndefined();
    expect(result.toolCallId).toBeDefined();
    expect(result.correlationId).toBeDefined();
  });
});
