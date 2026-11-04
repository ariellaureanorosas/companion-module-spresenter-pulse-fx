import type ModuleInstance from './main.js';

export type VariablesSchema = {
  connection: string;
  last_error: string;
  plugin_version: string;
  safety_lock: string;
  effect_count: string;
  effect_summary: string;
  selection: string;
  endpoint: string;
};

export function UpdateVariableDefinitions(self: ModuleInstance): void {
  self.setVariableDefinitions({
    connection: { name: 'Estado da conexão (Conectado/Desconectado)' },
    last_error: { name: 'Último erro' },
    plugin_version: { name: 'Versão do plugin Pulse FX' },
    safety_lock: { name: 'Trava de 3 Hz (Ativa/Desligada)' },
    effect_count: { name: 'Quantidade de efeitos ativos' },
    effect_summary: { name: 'Resumo dos efeitos ativos' },
    selection: { name: 'Seleção do painel do Pulse FX' },
    endpoint: { name: 'Endereço da API em uso' },
  });
}
