/**
 * @adzhub/data - UTM Alias Tables
 * Tabela explícita e versionada de aliases/sinônimos de UTM para normalização determinística.
 */

export interface UtmAliasTable {
  /** Versão semântica imutável da tabela de aliases */
  version: string;
  /** Identificador opcional do tenant/cliente ao qual a tabela se aplica */
  clientId?: string;
  /** Descrição do propósito desta versão da tabela */
  description: string;
  /** Data ISO-8601 da criação/atualização da tabela */
  updatedAt: string;
  /**
   * Mapeamento explícito de alias normalizado -> UTM canônica de destino.
   * Chaves e valores são strings determinísticas.
   */
  aliases: Record<string, string>;
}

/**
 * Tabela de aliases padrão v1.0.0
 * Inclui mapeamentos conhecidos de canais de mídia, convenções legadas e aliases de criativos.
 */
export const DEFAULT_UTM_ALIAS_TABLE_V1: UtmAliasTable = {
  version: '1.0.0',
  clientId: 'cli_housewhey',
  description: 'Tabela canônica de aliases para a conta Housewhey / SPOT',
  updatedAt: '2026-08-23T06:00:00.000Z',
  aliases: {
    // Aliases de origem / canais (utm_source)
    facebook: 'meta_ads',
    fb: 'meta_ads',
    facebook_ads: 'meta_ads',
    instagram: 'meta_ads',
    ig: 'meta_ads',
    instagram_ads: 'meta_ads',
    meta: 'meta_ads',
    face: 'meta_ads',
    insta: 'meta_ads',

    // Aliases de criativos conhecidos (utm_content)
    ad_whey_baunilha_v1: 'ad_whey_baunilha_01',
    whey_baunilha_video: 'ad_whey_baunilha_01',
    video_whey_baunilha_900g: 'ad_whey_baunilha_01',
    whey_baunilha_hook: 'ad_whey_baunilha_01',

    ad_omega3_alta_conc_v1: 'ad_omega3_alta_conc_02',
    omega3_estatico_ifos: 'ad_omega3_alta_conc_02',
    estatico_omega3_pureza: 'ad_omega3_alta_conc_02',
    omega3_ultra_ifos: 'ad_omega3_alta_conc_02',

    ad_namorados_casal_v1: 'ad_namorados_casal_03',
    combo_namorados_casal: 'ad_namorados_casal_03',
    video_namorados_casal: 'ad_namorados_casal_03',
    namorados_promo_casal: 'ad_namorados_casal_03',

    ad_whey_sabores_v1: 'ad_whey_sabores_04',
    carrossel_whey_sabores: 'ad_whey_sabores_04',
    whey_sabores_premium: 'ad_whey_sabores_04'
  }
};

/**
 * Cria uma tabela customizada de aliases com validação estrutural mínima.
 */
export function createUtmAliasTable(
  table: Omit<UtmAliasTable, 'updatedAt'> & { updatedAt?: string }
): UtmAliasTable {
  return {
    version: table.version,
    clientId: table.clientId,
    description: table.description,
    updatedAt: table.updatedAt ?? new Date().toISOString(),
    aliases: { ...table.aliases }
  };
}
