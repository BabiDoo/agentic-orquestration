import { handleFetchRequest } from '../apps/web/src/api.js';

export async function runSmokeDeployCheck(
  baseUrl: string = 'http://localhost:3000'
): Promise<{ success: boolean; details: Record<string, unknown> }> {
  console.log(`🔍 Executando Smoke Test pós-deploy contra: ${baseUrl}...`);

  try {
    // 1. Healthcheck
    const healthReq = new Request(`${baseUrl}/api/health`, { method: 'GET' });
    const healthRes = await handleFetchRequest(healthReq);

    if (healthRes.status !== 200) {
      console.error(`❌ Healthcheck falhou com status ${healthRes.status}`);
      return { success: false, details: { error: `Healthcheck status ${healthRes.status}` } };
    }

    const healthJson = await healthRes.json();
    console.log('✅ Healthcheck 200 OK:', healthJson);

    // 2. Scenarios list
    const scenariosReq = new Request(`${baseUrl}/api/scenarios`, { method: 'GET' });
    const scenariosRes = await handleFetchRequest(scenariosReq);
    const scenariosJson = await scenariosRes.json();

    if (
      scenariosRes.status !== 200 ||
      !Array.isArray(scenariosJson) ||
      scenariosJson.length !== 6
    ) {
      console.error('❌ Endpoint /api/scenarios inválido');
      return { success: false, details: { error: 'Invalid scenarios response' } };
    }
    console.log(`✅ Cenários canônicos carregados com sucesso: ${scenariosJson.length} cenários`);

    // 3. UI Shell
    const uiReq = new Request(`${baseUrl}/`, { method: 'GET' });
    const uiRes = await handleFetchRequest(uiReq);
    const uiHtml = await uiRes.text();

    if (uiRes.status !== 200 || !uiHtml.includes('AdzHub Harness')) {
      console.error('❌ UI Shell não retornou HTML válido');
      return { success: false, details: { error: 'Invalid UI HTML' } };
    }
    console.log('✅ UI Shell renderizada com sucesso.');

    console.log('🎉 Deploy verificado com sucesso! Todos os checks de fumaça passaram.');
    return { success: true, details: { health: healthJson, scenariosCount: scenariosJson.length } };
  } catch (err: any) {
    console.error('❌ Falha na execução do smoke deploy check:', err);
    return { success: false, details: { error: err?.message || String(err) } };
  }
}

if (process.argv[1]?.includes('smoke-deploy')) {
  runSmokeDeployCheck().then((res) => {
    if (!res.success) process.exit(1);
  });
}
