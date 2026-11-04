import { describe, expect, it } from 'vitest';
import type { PluginState } from './api.js';
import {
  describeTarget,
  isEffectActive,
  isModeActive,
  resolveTarget,
  summarizeEffects,
} from './state.js';

const STATE: PluginState = {
  ok: true,
  version: '1.4.0',
  safetyLock: true,
  selection: { output: '0', layer: 5 },
  effects: [
    { output: '1', layer: 3, mode: 'strobe', owner: 'external', startedAt: 10 },
    { output: '0', layer: 5, mode: 'pulse', owner: 'ui', startedAt: 20 },
  ],
  outputs: [
    { index: 0, name: 'Principal', disabledLayers: [] },
    { index: 1, name: 'Telão', disabledLayers: [4] },
  ],
  layers: [
    { index: 3, name: 'Sobreposição' },
    { index: 5, name: '' },
  ],
};

describe('alvo', () => {
  it('usa a seleção do painel quando output está vazio e layer é -1', () => {
    expect(resolveTarget(STATE, '', -1)).toEqual({ output: '0', layer: 5 });
  });

  it('respeita o alvo informado, inclusive a camada 0', () => {
    expect(resolveTarget(STATE, '1', 0)).toEqual({ output: '1', layer: 0 });
  });
});

describe('efeitos', () => {
  it('encontra efeito por camada e dono', () => {
    expect(isEffectActive(STATE, '1', 3)).toBe(true);
    expect(isEffectActive(STATE, '1', 3, 'external')).toBe(true);
    expect(isEffectActive(STATE, '1', 3, 'ui')).toBe(false);
    expect(isEffectActive(STATE, '0', 5, 'ui')).toBe(true);
  });

  it('filtra o efeito pelo modo, para cada botão acender só o seu', () => {
    expect(isEffectActive(STATE, '1', 3, 'external', 'strobe')).toBe(true);
    expect(isEffectActive(STATE, '1', 3, 'external', 'pulse')).toBe(false);
    expect(isEffectActive(STATE, '1', 3, 'external')).toBe(true);
  });

  it('confere o modo do efeito', () => {
    expect(isModeActive(STATE, '1', 3, 'strobe')).toBe(true);
    expect(isModeActive(STATE, '1', 3, 'pulse')).toBe(false);
  });
});

describe('descrição', () => {
  it('descreve a saída e a camada com nomes', () => {
    expect(describeTarget({ output: '1', layer: 3 }, STATE.outputs, STATE.layers)).toBe(
      'saída 1 (Telão), camada 3 (Sobreposição)',
    );
  });

  it('resume nenhum, um e vários efeitos', () => {
    expect(summarizeEffects({ ...STATE, effects: [] })).toBe('Nenhum efeito ativo');
    expect(summarizeEffects({ ...STATE, effects: [STATE.effects[0]] })).toBe(
      'Strobe em saída 1 (Telão), camada 3 (Sobreposição)',
    );
    expect(summarizeEffects(STATE)).toBe('2 efeitos ativos');
  });
});
