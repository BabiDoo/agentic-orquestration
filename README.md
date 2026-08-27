# AdzHub Microkernel Agêntico (PEV-C)

[![CI Status](https://img.shields.io/badge/CI-Passing-brightgreen)](https://github.com/adzhub/microkernel-pev-c/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest-orange)](https://vitest.dev/)

> **Harness Runtime e Cognitive Microkernel com Governança Determinística para Agentes de Marketing e CRM.**

---

## 1. Tese Central e Motivação Científica

Modelos agênticos convencionais baseados no padrão **ReAct puro** sofrem do problema de **Optimistic Truth**: persistem fatos e executam ações operacionais antes de validar a consistência e proveniência dos dados, tornando-se vulneráveis a:

1. **Alucinação de reconciliações financeiras** quando APIs de terceiros falham (ex.: CRM timeout 503);
2. **Escrita não verificada em memória de longo prazo** (`unverified_memory_writes > 0`);
3. **Mutações externas destrutivas não autorizadas** (`external_writes > 0`);
4. **Vulnerabilidade a injeção indireta de prompt** em dados de terceiros.

O **Microkernel PEV-C** (_Propose → Execute → Verify → Commit_) resolve essas vulnerabilidades através de um pipeline determinístico com:

- **Capability Broker deny-by-default** com autoridade fora do prompt;
- **Verificação em 3 camadas independentes** (Estrutural Zod, Pós-condições determinísticas e Semântica auxiliar);
- **Evidence Scoring e Rastreabilidade Criptográfica** (`EvidenceRefs` com SHA-256);
- **Motor de Commit Atômico no SQLite** com proteção anti-TOCTOU;
- **Atribuição Causal de Falhas e REPLAN Adaptativo**.

```
┌─────────────────┐       ┌────────────────────┐       ┌────────────────────────┐
│  Task Contract  ├──────►│ PROPOSE (DAG Plan) ├──────►│ EXECUTE (Tool Sandbox) │
└─────────────────┘       └────────────────────┘       └───────────┬────────────┘
                                                                   │ Observations
                                                                   ▼
┌──────────────────┐      ┌────────────────────┐       ┌────────────────────────┐
│ COMMITTED MEMORY │◄─────┤ COMMIT (ACID SQLite│◄──────┤ VERIFY (Scorer & Post) │
└──────────────────┘      └────────────────────┘       └───────────┬────────────┘
                                                                   │ (Falha)
                                                                   ▼
                                                       ┌────────────────────────┐
                                                       │ ATTRIBUTE ──► REPLAN   │
                                                       └────────────────────────┘
```

---

## 2. Quickstart (Clone ao Run em < 5 minutos)

### Pré-requisitos

- **Node.js**: v20.x ou superior
- **npm**: v10.x ou superior

### Instalação e Execução Local

```bash
# 1. Clonar o repositório
git clone https://github.com/adzhub/microkernel-pev-c.git
cd microkernel-pev-c/mvp

# 2. Instalar dependências
npm install

# 3. Executar a suíte de testes de validação (100% verde)
npm test

# 4. Iniciar a UI Shell do Harness
npm run dev
```

Acesse no navegador: **`http://localhost:3000`**

---

## 3. Cenários Canônicos Demonstráveis (S0 a S5)

A UI do Harness disponibiliza os 6 cenários controlados baseados no dataset sintético da **Housewhey** (`housewhey-canonical-v1`):

| Cenário | Título                 | Desafio / Anomalia                       | Comportamento Governed PEV-C                                                                                     |
| ------- | ---------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **S0**  | **Golden Run**         | Dados íntegros (Meta + CRM).             | Executa fork/join, valida evidências (score 0.94) e realiza commit atômico (`COMMITTED`).                        |
| **S1**  | **CRM Offline**        | Falha 503 na API de CRM.                 | Detecta erro, atribui à integração (`ATTRIBUTE`), gera `REPLAN` e conclui com abstenção parcial sem alucinar.    |
| **S2**  | **UTMs Corrompidas**   | 58% das vendas sem UTM.                  | Score de cobertura insuficiente (42% < 80%), retenção em quarentena (`QUARANTINED`) e abstenção de recomendação. |
| **S3**  | **Período Divergente** | Dados de 2024 em contrato de 2026.       | Rejeição por violação de pós-condição temporal (`PERIOD_MISMATCH` / `FAILED`).                                   |
| **S4**  | **Prompt Injection**   | Tentativa de jailbreak em notas de CRM.  | Sanitização estrita (`<UNTRUSTED_EXTERNAL_DATA>`), zero ampliação de capabilities e contrato imutável.           |
| **S5**  | **Pausa de Anúncio**   | Tentativa de mutação externa destrutiva. | Bloqueio imediato pelo Capability Broker (`BLOCKED` / `APPROVAL_REQUIRED`), garantindo `external_writes == 0`.   |

---

## 4. Comparador Basic ReAct × Governed PEV-C

Na aba superior **Comparar Modos**, execute o mesmo cenário em paralelo para visualizar as diferenças:

- **Auditabilidade**: No modo Governed, cada métrica aponta diretamente para o hash SHA-256 da observação original;
- **Integridade**: No modo Basic, escritas não verificadas ocorrem livremente; no Governed, `unverified_memory_writes == 0`;
- **Segurança**: Tentativas de mutação externa são bloqueadas no Governed e executadas sem autorização no Basic.

---

## 5. Estrutura dos Workspaces

```text
mvp/
├── apps/
│   └── web/                            # UI Shell responsiva estilo Cursor e API REST (@adzhub/web)
├── packages/
│   ├── contracts/                      # Schemas Zod, tipos canônicos e TaskContracts (@adzhub/contracts)
│   ├── runtime/                        # Reducer da máquina PEV-C, scheduler e engine (@adzhub/runtime)
│   ├── policy/                         # Capability Broker deny-by-default (@adzhub/policy)
│   ├── verify/                         # Verificadores determinísticos, pós-condições e scoring (@adzhub/verify)
│   ├── apps/
│   │   └── creative-analysis/          # Metodologia empacotada de análise de criativos (@adzhub/creative-analysis)
│   ├── tools/                          # Ferramentas governadas tipadas (@adzhub/tools)
│   └── data/                           # Normalização de UTMs, SQLite e Commit Engine (@adzhub/data)
├── evals/                              # Runner e relatórios de avaliação empírica
├── docs/                               # Documentação de arquitetura, datasets, segurança e evals
└── tests/                              # Suítes de testes unitários, property-based, contrato, integração e e2e
```

---

## 6. Comandos de Validação e CI

```bash
npm run ci              # Executa lint, formatação, typecheck e testes
npm run test            # Executa vitest em todo o monorepo
npm run test:property   # Executa os property-based tests com fast-check
npm run test:security   # Executa suíte adversarial e secret scanning
npm run evals           # Executa suíte completa de avaliações empíricas
```

---

## 7. Documentação Completa

- [Arquitetura e Fronteiras](docs/architecture.md)
- [Dataset Card e Anomalias](docs/dataset-card.md)
- [Resultados e Metodologia de Avaliação](docs/evaluation.md)
- [Modelo de Ameaças e Segurança](docs/security.md)
- [Aviso de Dados Sintéticos](docs/synthetic-data-notice.md)
- [Runbook de Publicação](docs/publishing-runbook.md)
- [Roteiro de Demonstração (6-8 min)](docs/demo-script.md)

---

## 8. Licença

Este projeto é distribuído sob a licença [MIT](LICENSE).
