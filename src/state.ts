import type { EffectMode, PluginEffect, PluginLayer, PluginOutput, PluginState } from './api.js';

export type OwnerFilter = 'any' | 'external' | 'ui' | 'automation';

export interface Target {
  output: string;
  layer: number;
}

export function resolveTarget(state: PluginState, output: string, layer: number): Target {
  const normalized = String(output ?? '').trim();
  const numericLayer = Number(layer);
  return {
    output: normalized !== '' ? normalized : state.selection.output,
    layer:
      Number.isInteger(numericLayer) && numericLayer >= 0 ? numericLayer : state.selection.layer,
  };
}

export function effectsOnTarget(
  state: PluginState,
  target: Target,
  owner: OwnerFilter = 'any',
): PluginEffect[] {
  return state.effects.filter(
    (effect) =>
      effect.output === target.output &&
      effect.layer === target.layer &&
      (owner === 'any' || effect.owner === owner),
  );
}

export function isEffectActive(
  state: PluginState,
  output: string,
  layer: number,
  owner: OwnerFilter = 'any',
  mode?: EffectMode,
): boolean {
  return effectsOnTarget(state, resolveTarget(state, output, layer), owner).some(
    (effect) => mode === undefined || effect.mode === mode,
  );
}

export function isModeActive(
  state: PluginState,
  output: string,
  layer: number,
  mode: EffectMode,
): boolean {
  return effectsOnTarget(state, resolveTarget(state, output, layer)).some(
    (effect) => effect.mode === mode,
  );
}

export function describeTarget(
  target: Target,
  outputs: PluginOutput[],
  layers: PluginLayer[],
): string {
  const output = outputs.find((item) => String(item.index) === target.output);
  const layer = layers.find((item) => item.index === target.layer);

  const outputLabel = output ? `${target.output} (${output.name || 'sem nome'})` : target.output;
  const layerLabel = layer ? `${target.layer} (${layer.name || 'sem nome'})` : String(target.layer);

  return `saída ${outputLabel}, camada ${layerLabel}`;
}

const MODE_LABELS: Record<EffectMode, string> = {
  hit: 'Hit',
  strobe: 'Strobe',
  pulse: 'Pulse',
};

export function summarizeEffects(state: PluginState): string {
  if (state.effects.length === 0) return 'Nenhum efeito ativo';
  if (state.effects.length === 1) {
    const [effect] = state.effects;
    return `${MODE_LABELS[effect.mode]} em ${describeTarget(effect, state.outputs, state.layers)}`;
  }
  return `${state.effects.length} efeitos ativos`;
}
