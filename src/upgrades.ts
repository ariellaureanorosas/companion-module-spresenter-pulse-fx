import type { CompanionStaticUpgradeScript } from '@companion-module/base';
import type { ModuleConfig, ModuleSecrets } from './config.js';

/**
 * Ainda não há versões publicadas. Quando o formato do config mudar, o script
 * de migração entra aqui para não quebrar instalações existentes.
 */
export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig, ModuleSecrets>[] = [];
