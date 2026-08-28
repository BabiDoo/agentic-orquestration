import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SECRET_PATTERNS = [
  { name: 'OpenRouter API Key', regex: /sk-or-v1-[a-zA-Z0-9_-]{20,}/ },
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,}/ },
  {
    name: 'Generic Secret Token',
    regex: /(api_key|apiKey|secret_key|private_key)\s*[:=]\s*["'][a-zA-Z0-9_-]{24,}["']/i
  },
  { name: 'Hardcoded Bearer Token', regex: /Bearer\s+[a-zA-Z0-9_.-]{32,}/i }
];

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '.gemini']);

// Arquivos excluídos: lock files, templates de exemplo e arquivos de teste live
// (contêm padrões documentais/de exemplo, não chaves reais)
const EXCLUDED_FILES = new Set(['package-lock.json', '.env.example']);

// Sufixos de arquivo excluídos da varredura de segredos
const EXCLUDED_SUFFIXES = ['.env.example', '.live.test.ts'];

function scanDirectory(dirPath: string): { path: string; line: number; rule: string }[] {
  const violations: { path: string; line: number; rule: string }[] = [];
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry) || EXCLUDED_FILES.has(entry)) continue;
    // Pula arquivos com sufixos excluídos (ex: .env.example, .live.test.ts)
    if (EXCLUDED_SUFFIXES.some(suffix => entry.endsWith(suffix))) continue;

    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      violations.push(...scanDirectory(fullPath));
    } else if (
      stat.isFile() &&
      !entry.endsWith('.png') &&
      !entry.endsWith('.ico') &&
      !entry.endsWith('.docx')
    ) {
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;

          // Ignora testes que explicitamente testam padrões de regex de segredos
          if (
            fullPath.includes('.test.ts') ||
            fullPath.includes('security-hardening.ts') ||
            fullPath.includes('secret-scan.ts')
          ) {
            continue;
          }

          for (const pattern of SECRET_PATTERNS) {
            if (pattern.regex.test(line)) {
              violations.push({
                path: fullPath,
                line: i + 1,
                rule: pattern.name
              });
            }
          }
        }
      } catch {
        // Ignora arquivos binários ou ilegíveis
      }
    }
  }

  return violations;
}

export function runSecretScan(rootDir: string = process.cwd()): {
  passed: boolean;
  violations: { path: string; line: number; rule: string }[];
} {
  console.log(`🔍 Iniciando Secret Scan em: ${rootDir}...`);
  const violations = scanDirectory(rootDir);

  if (violations.length === 0) {
    console.log('✅ Nenhum segredo ou chave de API vazada detectada!');
    return { passed: true, violations: [] };
  } else {
    console.error(`❌ ${violations.length} potenciais segredos encontrados:`);
    for (const v of violations) {
      console.error(`  - ${v.path}:${v.line} (${v.rule})`);
    }
    return { passed: false, violations };
  }
}

if (process.argv[1]?.includes('secret-scan')) {
  const result = runSecretScan();
  if (!result.passed) {
    process.exit(1);
  }
}
