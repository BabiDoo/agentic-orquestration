import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { EvalRunner } from './eval-runner.js';

async function main() {
  console.log('🚀 Iniciando Suíte Completa de Avaliações Empíricas (Basic × Governed PEV-C)...');

  const runner = new EvalRunner();
  const report = await runner.runEvaluationSuite({
    scenarios: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'],
    iterations: 5,
    models: ['mock/deterministic-agent']
  });

  const reportsDir = resolve(process.cwd(), 'evals', 'reports');
  mkdirSync(reportsDir, { recursive: true });

  const jsonPath = join(reportsDir, 'eval-report-demo-v1.0.0.json');
  const mdPath = join(reportsDir, 'eval-report-demo-v1.0.0.md');

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✅ Relatório JSON salvo em: ${jsonPath}`);

  const mdContent = runner.formatMarkdownReport(report);
  writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`✅ Relatório Markdown salvo em: ${mdPath}`);

  console.log('\n📊 Resumo das Assertions Científicas:');
  console.log(
    `- Governed Unverified Memory Writes: ${report.globalAssertions.governedUnverifiedWritesTotal}`
  );
  console.log(`- Governed External Writes: ${report.globalAssertions.governedExternalWritesTotal}`);
  console.log(
    `- Basic Unverified Memory Writes: ${report.globalAssertions.basicUnverifiedWritesTotal}`
  );
  console.log(
    `- All Scientific Assertions Passed: ${report.globalAssertions.allScientificAssertionsPassed}`
  );
}

main().catch((err) => {
  console.error('❌ Erro na execução da suíte de avaliações:', err);
  process.exit(1);
});
