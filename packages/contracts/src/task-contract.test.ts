import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  validateTaskContract,
  calculateContractHash,
  freezeTaskContract,
  TaskContract
} from './task-contract.js';

function loadFixture(filename: string): unknown {
  const filePath = resolve(__dirname, '../fixtures', filename);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

describe('TaskContract v1 — Validação e Invariantes', () => {
  it('deve validar com sucesso um contrato canônico bem formado (valid-contract.json)', () => {
    const data = loadFixture('valid-contract.json');
    const contract = validateTaskContract(data);

    expect(contract.schemaVersion).toBe('1.0.0');
    expect(contract.taskId).toBe('task_s0_housewhey_analysis');
    expect(contract.clientId).toBe('cli_housewhey');
    expect(contract.effects.allowed).toContain('read:meta');
  });

  it('deve rejeitar contrato com período invertido (since > until)', () => {
    const data = loadFixture('invalid-period-inverted.json');
    expect(() => validateTaskContract(data)).toThrowError(/Período invertido/);
  });

  it('deve rejeitar contrato com budgets negativos', () => {
    const data = loadFixture('invalid-negative-budget.json');
    expect(() => validateTaskContract(data)).toThrow();
  });

  it('deve rejeitar contrato com effects desconhecidos ou não autorizados', () => {
    const data = loadFixture('invalid-unknown-effect.json');
    expect(() => validateTaskContract(data)).toThrow();
  });

  it('deve rejeitar contrato com campos obrigatórios ausentes', () => {
    const incompleteData = {
      schemaVersion: '1.0.0',
      taskId: 'task_123'
      // faltando clientId, goal, timeframe, etc.
    };
    expect(() => validateTaskContract(incompleteData)).toThrow();
  });

  it('deve gerar hash determinístico SHA-256 independente da ordem das chaves', () => {
    const baseContract = validateTaskContract(loadFixture('valid-contract.json'));

    // Cria cópia com ordem invertida de propriedades
    const permutedContract: TaskContract = {
      metadata: baseContract.metadata,
      approvalPolicy: { ...baseContract.approvalPolicy },
      successCriteria: { ...baseContract.successCriteria },
      budgets: { ...baseContract.budgets },
      effects: { ...baseContract.effects },
      timeframe: { ...baseContract.timeframe },
      goal: baseContract.goal,
      tenantId: baseContract.tenantId,
      clientId: baseContract.clientId,
      taskId: baseContract.taskId,
      schemaVersion: '1.0.0'
    };

    const hash1 = calculateContractHash(baseContract);
    const hash2 = calculateContractHash(permutedContract);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string
  });

  it('deve congelar o contrato após TASK_ACCEPTED tornando-o imutável (freezeTaskContract)', () => {
    const baseContract = validateTaskContract(loadFixture('valid-contract.json'));
    const frozen = freezeTaskContract(baseContract);

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.timeframe)).toBe(true);
    expect(Object.isFrozen(frozen.budgets)).toBe(true);

    // Tentativa de mutação deve lançar erro em strict mode
    expect(() => {
      (frozen as unknown as { goal: string }).goal = 'Meta alterada maliciosamente';
    }).toThrow();

    expect(() => {
      (frozen.budgets as unknown as { maxTokens: number }).maxTokens = 999999;
    }).toThrow();
  });
});
