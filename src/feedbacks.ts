import type { SomeCompanionFeedbackInputField } from '@companion-module/base';
import type { EffectMode } from './api.js';
import type ModuleInstance from './main.js';
import { isEffectActive, isModeActive, type OwnerFilter } from './state.js';

export type FeedbacksSchema = {
  effect_active: {
    type: 'boolean';
    options: { output: string; layer: number; owner: OwnerFilter; mode: EffectMode | 'any' };
  };
  mode_is: {
    type: 'boolean';
    options: { output: string; layer: number; mode: 'strobe' | 'pulse' };
  };
  safety_lock_on: {
    type: 'boolean';
    options: Record<string, never>;
  };
  connection_failed: {
    type: 'boolean';
    options: Record<string, never>;
  };
};

function targetOptions(
  self: ModuleInstance,
): SomeCompanionFeedbackInputField<'output' | 'layer'>[] {
  return [
    {
      type: 'dropdown',
      id: 'output',
      label: 'Saída',
      default: '',
      choices: [
        { id: '', label: 'Seleção do painel' },
        ...(self.snapshot?.outputs ?? []).map((output) => ({
          id: String(output.index),
          label: `Saída ${output.index} — ${output.name || 'sem nome'}`,
        })),
      ],
      disableAutoExpression: true,
    },
    {
      type: 'dropdown',
      id: 'layer',
      label: 'Camada',
      default: -1,
      choices: [
        { id: -1, label: 'Seleção do painel' },
        ...(self.snapshot?.layers ?? []).map((layer) => ({
          id: layer.index,
          label: `Camada ${layer.index} — ${layer.name || 'sem nome'}`,
        })),
      ],
      disableAutoExpression: true,
    },
  ];
}

export function UpdateFeedbacks(self: ModuleInstance): void {
  self.setFeedbackDefinitions({
    effect_active: {
      type: 'boolean',
      name: 'Efeito ativo na camada',
      description:
        'Verdadeiro enquanto houver um efeito na saída e camada escolhidas. Use o modo para um botão só acender com o efeito dele.',
      defaultStyle: {
        bgcolor: 0x16a34a,
        color: 0xffffff,
      },
      options: [
        ...targetOptions(self),
        {
          type: 'dropdown',
          id: 'owner',
          label: 'Dono do efeito',
          default: 'external',
          choices: [
            { id: 'external', label: 'Companion (este módulo)' },
            { id: 'ui', label: 'Painel do Pulse FX' },
            { id: 'automation', label: 'Automação do Spresenter' },
            { id: 'any', label: 'Qualquer dono' },
          ],
          disableAutoExpression: true,
        },
        {
          type: 'dropdown',
          id: 'mode',
          label: 'Modo',
          default: 'any',
          choices: [
            { id: 'any', label: 'Qualquer modo' },
            { id: 'strobe', label: 'Strobe' },
            { id: 'pulse', label: 'Pulse' },
          ],
          disableAutoExpression: true,
        },
      ],
      callback: (feedback) => {
        if (!self.snapshot) return false;
        return isEffectActive(
          self.snapshot,
          feedback.options.output,
          feedback.options.layer,
          feedback.options.owner,
          feedback.options.mode === 'any' ? undefined : feedback.options.mode,
        );
      },
    },
    mode_is: {
      type: 'boolean',
      name: 'Efeito é Strobe/Pulse',
      description: 'Verdadeiro quando o efeito da camada está no modo escolhido.',
      defaultStyle: {
        bgcolor: 0x0ea5e9,
        color: 0xffffff,
      },
      options: [
        ...targetOptions(self),
        {
          type: 'dropdown',
          id: 'mode',
          label: 'Modo',
          default: 'strobe',
          choices: [
            { id: 'strobe', label: 'Strobe' },
            { id: 'pulse', label: 'Pulse' },
          ],
          disableAutoExpression: true,
        },
      ],
      callback: (feedback) => {
        if (!self.snapshot) return false;
        return isModeActive(
          self.snapshot,
          feedback.options.output,
          feedback.options.layer,
          feedback.options.mode,
        );
      },
    },
    safety_lock_on: {
      type: 'boolean',
      name: 'Trava de 3 Hz ligada',
      description: 'Verdadeiro quando a trava de frequência está ativa no Pulse FX.',
      defaultStyle: {
        bgcolor: 0x16a34a,
        color: 0xffffff,
      },
      options: [],
      callback: () => self.snapshot?.safetyLock === true,
    },
    connection_failed: {
      type: 'boolean',
      name: 'Sem conexão com o Spresenter',
      description: 'Verdadeiro quando a última consulta de estado falhou.',
      defaultStyle: {
        bgcolor: 0xdc2626,
        color: 0xffffff,
      },
      options: [],
      callback: () => !self.connected,
    },
  });
}
