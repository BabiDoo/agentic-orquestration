# Microkernel Agêntico

[![CI Status](https://img.shields.io/badge/CI-Passing-brightgreen)](https://github.com/adzhub/microkernel-pev-c/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tests-580%2B%20Passing-orange)](https://vitest.dev/)
[![SQLite Native](https://img.shields.io/badge/Database-SQLite%20(node%3Asqlite)-lightgrey)](https://nodejs.org/api/sqlite.html)

> **Harness Runtime e Cognitive Microkernel com Governança Determinística para Agentes Autônomos de Marketing e CRM.**

---

## 1. Visão Geral

Agentes convencionais baseados em **ReAct puro** confiam cegamente nos dados observados (*Optimistic Truth*), ficando sujeitos a alucinar métricas de CRM, gravar memórias incorretas ou executar ações destrutivas sem autorização.

O **Microkernel PEV-C** (*Propose → Execute → Verify → Commit*) introduz governança determinística e auditável ao ciclo agêntico:

- **Capability Broker (deny-by-default):** Nenhuma mutação externa é executada sem alçada e autorização prévia;
- **Verificação Formal:** Checagem estrita de schemas (Zod), pós-condições e integridade temporal de datas;
- **Rastreabilidade Criptográfica:** Evidências auditadas com hashes SHA-256 e score de confiança;
- **Commit Atômico no SQLite:** Persistência imutável ACID com suporte a rollback e proteção anti-TOCTOU.

```text
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

## 2. Quickstart

### Pré-requisitos
- **Node.js**: `v20.x` ou `v22.x` (recomendado Node 22 para SQLite nativo)
- **npm**: `v10.x` ou superior

### Opção A: Execução Local Direta (Recomendado para Desenvolvimento)

O banco SQLite roda de forma embutida e local na memória do Node.js, não sendo necessário nenhum serviço externo:

```bash
# 1. Clonar o repositório
git clone https://github.com/adzhub/microkernel-pev-c.git
cd microkernel-pev-c/mvp

# 2. Instalar dependências
npm install

# 3. Executar a suíte de testes de validação (100% verde)
npm test

# 4. Iniciar o servidor e UI Shell
npm run dev
```

Acesse no navegador: **`http://localhost:3000`**

### Opção B: Execução via Docker Compose (Ambiente Isolado)

```bash
docker compose up --build -d
```

Acesse no navegador: **`http://localhost:3030`** (ou porta configurada no `.env`).

---

## 3. Configuração de Modelos e Chaves (BYOK)

O AdzHub adota a política **BYOK (*Bring Your Own Key*)**: as chaves de API transitam de forma efêmera na sessão do usuário, sendo sanitizadas com `[REDACTED_SECRET]` em todos os logs, traces e no banco SQLite.

Você pode usar o sistema de 3 formas:

| Provedor | Como Obter | Custo | Prefixo da Chave | Detecção no AdzHub |
| :--- | :--- | :--- | :--- | :--- |
| **Google AI Studio (Recomendado)** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | **100% Gratuito** (1.500 req/dia) | `AIzaSy...` | `✓ Gemini 2.5 Flash` |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | Conforme créditos / modelos | `sk-or-v1-...` | `✓ Claude 3.5 Sonnet` |
| **Modo Local / Mocks** | *Nenhuma chave necessária* | **Gratuito** (Offline) | *(Deixar em branco)* | `Modo Demonstração` |

> **Dica:** Para testar a aplicação com IA real sem nenhum custo e sem cadastrar cartão de crédito, crie uma chave gratuita no **Google AI Studio** e cole diretamente no campo de API Key da interface.

---

## 4. Funcionalidades Principais do Harness

### 💬 Chat Agêntico com Raciocínio em Tempo Real
- **Streaming de Fases:** Exibição detalhada de cada etapa (*Plano → Execução de Ferramentas → Verificação de Evidências → Commit*).
- **Propostas e Alçadas:** Geração de cards de ação para aprovação formal de operadores humanos antes de qualquer execução destrutiva.

### ⚖️ Comparador Basic (ReAct) × Governed (PEV-C)
- Dispara o **mesmo prompt** em paralelo nos dois motores sob as mesmas condições.
- Compara latência real, consumo de tokens, chamadas de ferramentas, evidências validadas por SHA-256 e prevenção de violações.
- Exibe os dois diagnósticos lado a lado e permite exportação do relatório em **JSON** e **Markdown**.

### 🧠 Supercérebro & Governança Multiusuário
- **Perfis de Operadores:** Alterne entre diferentes papéis (Aline - Gestora de Tráfego, Marcos - Head de Marketing, Sofia - SAC/E-commerce, Lucas - Diretor Financeiro).
- **Central de Documentos & Timeline:** Registro imutável de briefings, relatórios de auditoria e decisões tomadas no SQLite.
- **Grafo de Memória Dinâmico:** Visualização interativa das conexões entre operadores, metas, canais e commits.

### 🔍 Inspector de Auditoria Técnica
- Painel para inspecionar o JSON Schema do `TaskContract`, scores de evidência, hashes SHA-256 dos dados brutos e pós-condições avaliadas.

---

## 5. Cenários Canônicos Demonstráveis (S0 a S5)

A interface disponibiliza 6 cenários controlados baseados no dataset sintético auditado da **Housewhey** (`housewhey-canonical-v1`):

| Cenário | Título | Desafio / Anomalia Injetada | Comportamento Governed PEV-C |
| :---: | :--- | :--- | :--- |
| **S0** | **Golden Run** | Dados íntegros (Meta Ads + CRM). | Executa Fork/Join paralelo, valida cobertura de evidências (score 0.94) e persiste com commit atômico (`COMMITTED`). |
| **S1** | **CRM Offline** | Falha 503 na API de CRM. | Detecta indisponibilidade, atribui a falha à integração (`ATTRIBUTE`), aciona `REPLAN` e conclui com abstenção parcial sem alucinar números. |
| **S2** | **UTMs Corrompidas** | 58% das vendas sem tracking de UTM. | Detecta baixa cobertura (42% < 80%), retém os dados em quarentena (`QUARANTINED`) e bloqueia conclusões precipitadas. |
| **S3** | **Período Divergente** | Dados de 2024 retornados em contrato de 2026. | Rejeição formal por violação de pós-condição temporal (`PERIOD_MISMATCH` / `FAILED`), prevenindo relatórios incorretos. |
| **S4** | **Prompt Injection** | Tentativa de jailbreak em notas de clientes. | Isolamento em sandbox com tag `<UNTRUSTED_EXTERNAL_DATA>`, mantendo o contrato imutável e zero ampliação de permissões. |
| **S5** | **Pausa de Anúncio** | Tentativa de mutação externa sem aprovação. | Bloqueio imediato pelo Capability Broker (`BLOCKED` / `APPROVAL_REQUIRED`), garantindo que `external_writes == 0`. |

---

## 6. Estrutura do Monorepo

```text
mvp/
├── apps/
│   └── web/                            # Servidor HTTP, API REST e UI Shell responsiva (@adzhub/web)
├── packages/
│   ├── contracts/                      # Schemas Zod, tipos canônicos e TaskContracts (@adzhub/contracts)
│   ├── runtime/                        # Reducer da máquina PEV-C, scheduler DAG e engine (@adzhub/runtime)
│   ├── policy/                         # Capability Broker deny-by-default (@adzhub/policy)
│   ├── verify/                         # Verificadores determinísticos, pós-condições e scoring (@adzhub/verify)
│   ├── tools/                          # Ferramentas governadas de Meta Ads, CRM e memória (@adzhub/tools)
│   ├── data/                           # SQLite nativo, normalização de UTMs e Commit Engine (@adzhub/data)
│   └── apps/
│       └── creative-analysis/          # Metodologia empacotada de análise de criativos (@adzhub/creative-analysis)
├── evals/                              # Runner e relatórios de avaliação empírica
├── docs/                               # Documentação detalhada de arquitetura, segurança e datasets
└── tests/                              # Suítes de testes unitários, property-based, contrato e integração
```

---

## 7. Comandos de Validação e Testes

O projeto possui **mais de 580 testes automatizados** cobrindo todas as invariantes científicas e de segurança:

```bash
# Executa a suíte de testes completa com Vitest
npm test

# Executa testes baseados em propriedades com fast-check
npm run test:property

# Executa testes adversariais e secret scan de chaves
npm run test:security

# Executa pipeline completo de CI (lint, format, typecheck e testes)
npm run ci

# Executa a suíte empírica de avaliações comparativas
npm run evals
```

---

## 8. Licença

Distribuído sob a licença [MIT](LICENSE).