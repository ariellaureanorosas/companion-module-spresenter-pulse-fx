/** O que o botão faz com a trava de 3 Hz antes de iniciar o efeito. */
export type SafetyLockMode = 'keep' | 'on' | 'off' | 'bypass';

export type StartOptions = {
  mode: 'strobe' | 'pulse' | 'hit';
  frequency: number;
  color: number;
  intensity: number;
  target: 'full' | 'vignette' | 'frame';
  output: string;
  layer: number;
  flashWidth: number;
  thickness: number;
  softness: number;
  decayMs: number;
  safetyLock: SafetyLockMode;
};

export type StopOptions = {
  output: string;
  layer: number;
  force: boolean;
};

export function colorToHex(color: number): string {
  const numeric = Number(color);
  const value = Number.isFinite(numeric)
    ? Math.max(0, Math.min(0xffffff, Math.trunc(numeric)))
    : 0xffffff;
  return `#${value.toString(16).padStart(6, '0')}`;
}

/**
 * Traduz o modo do campo em um pedido explícito de trava.
 *
 * `null` significa "não mexer": nem `keep` nem `bypass` alteram a configuração
 * global — o `bypass` só manda `ignoreSafetyLock` no `start`.
 */
export function safetyLockRequest(mode: SafetyLockMode): boolean | null {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return null;
}

/**
 * Sem `output` e com `layer: -1`, o pedido usa a seleção do painel do Pulse FX —
 * o mesmo comportamento da automação. É o que os presets usam para funcionar
 * sem exigir que o operador digite índices.
 */
export function buildStartPayload(options: StartOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    mode: options.mode,
    frequency: options.frequency,
    color: colorToHex(options.color),
    intensity: options.intensity,
    target: options.target,
    flashWidth: options.flashWidth,
    thickness: options.thickness,
    softness: options.softness,
    decayMs: options.decayMs,
  };

  // Só envia o campo quando ele é diferente do padrão: assim o pedido continua
  // legível e o plugin antigo (sem `ignoreSafetyLock`) não recebe lixo.
  if (options.safetyLock === 'bypass') payload.ignoreSafetyLock = true;

  const output = String(options.output ?? '').trim();
  if (output !== '') payload.output = output;

  const layer = Number(options.layer);
  if (Number.isInteger(layer) && layer >= 0) payload.layer = layer;

  return payload;
}

export function buildStopPayload(options: StopOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = { force: options.force === true };

  const output = String(options.output ?? '').trim();
  if (output !== '') payload.output = output;

  const layer = Number(options.layer);
  if (Number.isInteger(layer) && layer >= 0) payload.layer = layer;

  return payload;
}
