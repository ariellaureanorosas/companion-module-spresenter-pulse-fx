import type { SomeCompanionConfigField } from '@companion-module/base';
import { clampInt } from './util.js';

export type ModuleConfig = {
  host: string;
  port: number;
  /** Em segundos. O estado alimenta feedbacks e variáveis. */
  pollInterval: number;
};

/**
 * O token fica no cofre de segredos do Companion, não no config: o Companion
 * reporta as chaves do config para a interface web, e o valor do segredo não.
 */
export type ModuleSecrets = {
  token: string;
};

export const DEFAULT_CONFIG: ModuleConfig = {
  host: '127.0.0.1',
  port: 5050,
  pollInterval: 2,
};

export function normalizeConfig(raw: Partial<ModuleConfig> | undefined): ModuleConfig {
  const host =
    typeof raw?.host === 'string' && raw.host.trim() !== '' ? raw.host.trim() : DEFAULT_CONFIG.host;
  return {
    host,
    port: clampInt(raw?.port, 1, 65535, DEFAULT_CONFIG.port),
    pollInterval: clampInt(raw?.pollInterval, 1, 60, DEFAULT_CONFIG.pollInterval),
  };
}

export function normalizeSecrets(raw: Partial<ModuleSecrets> | undefined): ModuleSecrets {
  const token = typeof raw?.token === 'string' ? raw.token.trim() : '';
  return { token };
}

export function GetConfigFields(): SomeCompanionConfigField[] {
  return [
    {
      type: 'static-text',
      id: 'intro',
      label: 'Como conectar',
      width: 12,
      value:
        'Preencha o endereço e a porta da API do Spresenter (normalmente 5050) e informe um token com o escopo ' +
        '`plugins:invoke`. A API externa precisa estar ligada em Configurações do Spresenter. O Pulse FX 1.4.0 ou ' +
        'superior precisa estar instalado e ativo.',
    },
    {
      type: 'textinput',
      id: 'host',
      label: 'Endereço do Spresenter',
      width: 8,
      default: DEFAULT_CONFIG.host,
      tooltip: 'IP ou nome da máquina. Aceita "127.0.0.1:5050" e IPv6 entre colchetes.',
    },
    {
      type: 'number',
      id: 'port',
      label: 'Porta da API',
      width: 4,
      default: DEFAULT_CONFIG.port,
      min: 1,
      max: 65535,
      tooltip: 'A porta da API externa, não a do painel web (8080).',
    },
    {
      type: 'secret-text',
      id: 'token',
      label: 'Token (plugins:invoke)',
      width: 12,
      tooltip:
        'O mesmo token usado por outros clientes da API. O valor não é exibido depois de salvo.',
    },
    {
      type: 'number',
      id: 'pollInterval',
      label: 'Atualizar estado a cada (s)',
      width: 4,
      default: DEFAULT_CONFIG.pollInterval,
      min: 1,
      max: 60,
      tooltip: 'Intervalo da consulta de estado que alimenta feedbacks e variáveis.',
    },
  ];
}
