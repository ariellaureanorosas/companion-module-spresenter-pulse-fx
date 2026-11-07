import type { SomeCompanionActionInputField } from '@companion-module/base';
import type ModuleInstance from './main.js';
import {
  buildStartPayload,
  buildStopPayload,
  type StartOptions,
  type StopOptions,
  safetyLockRequest,
} from './payload.js';
import { resolveTarget } from './state.js';

export type SafetyLockAction = 'on' | 'off' | 'toggle';

export type ActionsSchema = {
  start: { options: StartOptions };
  stop: { options: StopOptions };
  toggle: { options: StartOptions };
  stop_all: { options: Record<string, never> };
  safety_lock: { options: { action: SafetyLockAction } };
};

function outputChoices(self: ModuleInstance): Array<{ id: string; label: string }> {
  return [
    { id: '', label: 'Seleção do painel' },
    ...(self.snapshot?.outputs ?? []).map((output) => ({
      id: String(output.index),
      label: `Saída ${output.index} — ${output.name || 'sem nome'}`,
    })),
  ];
}

function layerChoices(self: ModuleInstance): Array<{ id: number; label: string }> {
  return [
    { id: -1, label: 'Seleção do painel' },
    ...(self.snapshot?.layers ?? []).map((layer) => ({
      id: layer.index,
      label: `Camada ${layer.index} — ${layer.name || 'sem nome'}`,
    })),
  ];
}

function targetOptions(self: ModuleInstance): SomeCompanionActionInputField<'output' | 'layer'>[] {
  return [
    {
      type: 'dropdown',
      id: 'output',
      label: 'Saída',
      default: '',
      choices: outputChoices(self),
      disableAutoExpression: true,
      tooltip: 'Deixe em "Seleção do painel" para usar a saída escolhida no Pulse FX.',
    },
    {
      type: 'dropdown',
      id: 'layer',
      label: 'Camada',
      default: -1,
      choices: layerChoices(self),
      disableAutoExpression: true,
      tooltip: 'Deixe em "Seleção do painel" para usar a camada escolhida no Pulse FX.',
    },
  ];
}

function effectOptions(self: ModuleInstance): SomeCompanionActionInputField<keyof StartOptions>[] {
  return [
    {
      type: 'dropdown',
      id: 'mode',
      label: 'Efeito',
      default: 'strobe',
      choices: [
        { id: 'strobe', label: 'Strobe (pisca)' },
        { id: 'pulse', label: 'Pulse (pulso)' },
        { id: 'hit', label: 'Hit (disparo único)' },
      ],
      disableAutoExpression: true,
    },
    // Frequência só para Strobe/Pulse (Hit é disparo único)
    {
      type: 'number',
      id: 'frequency',
      label: 'Frequência (Hz)',
      default: 2,
      min: 0.5,
      max: 20,
      clampValues: true,
      isVisibleExpression: '$(options:mode) != "hit"',
      tooltip: 'A trava de segurança do Pulse FX limita a 3 Hz quando estiver ligada.',
    },
    {
      type: 'colorpicker',
      id: 'color',
      label: 'Cor',
      default: 0x22d3ee,
    },
    {
      type: 'number',
      id: 'intensity',
      label: 'Intensidade',
      default: 85,
      min: 0,
      max: 100,
      clampValues: true,
    },
    {
      type: 'dropdown',
      id: 'target',
      label: 'Área',
      default: 'full',
      choices: [
        { id: 'full', label: 'Tela cheia' },
        { id: 'vignette', label: 'Vinheta' },
        { id: 'frame', label: 'Moldura' },
      ],
      disableAutoExpression: true,
    },
    ...targetOptions(self),
    {
      type: 'dropdown',
      id: 'safetyLock',
      label: 'Trava de 3 Hz',
      default: 'keep',
      choices: [
        { id: 'keep', label: 'Não alterar (padrão)' },
        { id: 'off', label: 'Desligar antes de iniciar (acelera)' },
        { id: 'on', label: 'Ligar antes de iniciar' },
        { id: 'bypass', label: 'Ignorar a trava só neste efeito (risco)' },
      ],
      disableAutoExpression: true,
      tooltip:
        'Não alterar mantém a trava como está. Desligar/Ligar mudam a configuração global. Ignorar aplica a frequência pedida mesmo com a trava ligada, sem mudar a configuração — o teto de 20 Hz continua valendo.',
    },
    // Largura do flash só para Strobe
    {
      type: 'number',
      id: 'flashWidth',
      label: 'Largura do flash',
      default: 50,
      min: 5,
      max: 95,
      clampValues: true,
      isVisibleExpression: '$(options:mode) == "strobe"',
    },
    // Espessura/Suavização só para Vinheta/Moldura, em Strobe, Pulse e Hit
    {
      type: 'number',
      id: 'thickness',
      label: 'Espessura',
      default: 35,
      min: 0,
      max: 100,
      clampValues: true,
      isVisibleExpression: '$(options:target) != "full"',
    },
    {
      type: 'number',
      id: 'softness',
      label: 'Suavização',
      default: 50,
      min: 0,
      max: 100,
      clampValues: true,
      isVisibleExpression: '$(options:target) != "full"',
    },
    // Duração só para Hit
    {
      type: 'number',
      id: 'decayMs',
      label: 'Duração (ms)',
      default: 320,
      min: 30,
      max: 10000,
      clampValues: true,
      isVisibleExpression: '$(options:mode) == "hit"',
      tooltip: 'Tempo que o flash fica aceso no modo Hit. Após isso, o efeito para sozinho.',
    },
  ];
}

async function applySafetyLockMode(
  self: ModuleInstance,
  mode: StartOptions['safetyLock'],
): Promise<void> {
  // Sempre antes do start: se a trava cair depois, o efeito nasceria já limitado.
  const request = safetyLockRequest(mode);
  if (request !== null) await self.api.setSafetyLock(request);
}

export function UpdateActions(self: ModuleInstance): void {
  self.setActionDefinitions({
    start: {
      name: 'Ligar efeito contínuo',
      description: 'Liga Strobe ou Pulse até um comando de parar.',
      options: effectOptions(self),
      callback: async (event) => {
        await self.runAction('Ligar efeito', async () => {
          await applySafetyLockMode(self, event.options.safetyLock);
          return self.api.start(buildStartPayload(event.options));
        });
      },
    },
    stop: {
      name: 'Desligar efeito contínuo',
      description:
        'Desliga o efeito iniciado por este módulo. Sem "forçar", preserva o efeito do painel.',
      options: [
        ...targetOptions(self),
        {
          type: 'checkbox',
          id: 'force',
          label: 'Forçar (encerra qualquer dono)',
          default: false,
          tooltip: 'Ligado, também encerra um efeito iniciado pelo painel ou pela automação.',
        },
      ],
      callback: async (event) => {
        await self.runAction('Desligar efeito', () =>
          self.api.stop(buildStopPayload(event.options)),
        );
      },
    },
    toggle: {
      name: 'Alternar efeito contínuo',
      description: 'Liga se não houver efeito deste módulo na camada; desliga se houver.',
      options: effectOptions(self),
      callback: async (event) => {
        await self.runAction('Alternar efeito', async () => {
          const state = await self.api.state();
          const target = resolveTarget(state, event.options.output, event.options.layer);
          const active = state.effects.some(
            (effect) =>
              effect.output === target.output &&
              effect.layer === target.layer &&
              effect.owner === 'external',
          );

          if (active) {
            await self.api.stop({ output: target.output, layer: target.layer, force: false });
          } else {
            await applySafetyLockMode(self, event.options.safetyLock);
            await self.api.start(buildStartPayload(event.options));
          }
        });
      },
    },
    stop_all: {
      name: 'Parar todos os efeitos',
      description: 'Encerra todos os efeitos ativos, de qualquer dono, em todas as camadas.',
      options: [],
      callback: async () => {
        await self.runAction('Parar todos os efeitos', async () => {
          const state = await self.api.state();
          for (const effect of state.effects) {
            await self.api.stop({ output: effect.output, layer: effect.layer, force: true });
          }
        });
      },
    },
    safety_lock: {
      name: 'Trava de 3 Hz',
      description:
        'Liga, desliga ou alterna a trava de segurança do Pulse FX. Vale para o painel, a automação e este módulo.',
      options: [
        {
          type: 'dropdown',
          id: 'action',
          label: 'Ação',
          default: 'toggle',
          choices: [
            { id: 'toggle', label: 'Alternar (liga se estiver desligada)' },
            { id: 'on', label: 'Ligar a trava' },
            { id: 'off', label: 'Desligar a trava' },
          ],
          disableAutoExpression: true,
        },
      ],
      callback: async (event) => {
        await self.runAction('Trava de 3 Hz', async () => {
          if (event.options.action === 'toggle') {
            const state = await self.api.state();
            await self.api.setSafetyLock(!state.safetyLock);
            return;
          }
          await self.api.setSafetyLock(event.options.action === 'on');
        });
      },
    },
  });
}
