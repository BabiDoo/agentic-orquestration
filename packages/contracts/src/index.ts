/**
 * @adzhub/contracts
 * Definições canônicas de contratos, schemas Zod, eventos e invariantes do Microkernel PEV-C.
 */

export const CONTRACTS_VERSION = '1.1';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

export type ExecutionMode = 'BASIC_REACT' | 'GOVERNED_PEVC';

export type TaskStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PLANNING'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMMITTING'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'FAILED';

export * from './task-contract.js';
export * from './operational-contracts.js';
export * from './events-and-errors.js';
