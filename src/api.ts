import { errorMessage, isRecord } from './util.js';

export type EffectMode = 'hit' | 'strobe' | 'pulse';
export type EffectOwner = 'ui' | 'automation' | 'external';

export interface PluginOutput {
  index: number;
  name: string;
  disabledLayers: number[];
}

export interface PluginLayer {
  index: number;
  name: string;
}

export interface PluginEffect {
  output: string;
  layer: number;
  mode: EffectMode;
  owner: EffectOwner;
  startedAt: number;
}

export interface PluginSelection {
  output: string;
  layer: number;
}

export interface PluginState {
  ok: boolean;
  version: string;
  safetyLock: boolean;
  selection: PluginSelection;
  effects: PluginEffect[];
  outputs: PluginOutput[];
  layers: PluginLayer[];
}

export interface ApiOptions {
  host: string;
  port: number;
  token: string;
  timeoutMs?: number;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class PulseFxError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'PulseFxError';
    this.status = status;
  }

  /** Vale a pena marcar a conexão como caída (rede, token ou plugin ausente). */
  get isConnectionProblem(): boolean {
    return (
      this.status === null || this.status === 401 || this.status === 403 || this.status === 404
    );
  }
}

/**
 * Separa endereço e porta sem exigir que o usuário saiba a diferença. Aceita
 * `127.0.0.1`, `127.0.0.1:5050`, `http://host:5050/`, `[::1]` e `[::1]:5050`.
 */
export function resolveHostPort(
  host: string,
  fallbackPort: number,
): { hostname: string; port: number } {
  const trimmed = host
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');

  if (trimmed === '') return { hostname: '127.0.0.1', port: fallbackPort };

  const ipv6 = trimmed.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (ipv6) {
    return { hostname: `[${ipv6[1]}]`, port: ipv6[2] ? Number(ipv6[2]) : fallbackPort };
  }

  const withPort = trimmed.match(/^([^:]+):(\d+)$/);
  if (withPort) {
    return { hostname: withPort[1], port: Number(withPort[2]) };
  }

  return { hostname: trimmed, port: fallbackPort };
}

export function buildBaseUrl(host: string, port: number): string {
  const target = resolveHostPort(host, port);
  return `http://${target.hostname}:${target.port}/api/v1/plugins/com.spresenter.pulse-fx/requests`;
}

function parseJson(text: string): unknown {
  if (text.trim() === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractMessage(data: unknown): string | null {
  if (typeof data === 'string' && data.trim() !== '') return data.trim();
  if (!isRecord(data)) return null;

  const error = data.error;
  if (typeof error === 'string' && error.trim() !== '') return error.trim();
  if (isRecord(error) && typeof error.message === 'string' && error.message.trim() !== '') {
    return error.message.trim();
  }
  if (typeof data.message === 'string' && data.message.trim() !== '') return data.message.trim();
  return null;
}

function describeStatus(status: number, data: unknown, raw: string): string {
  const detail = extractMessage(data) ?? raw.trim().slice(0, 240);

  if (status === 401 || status === 403) {
    return (
      'Token recusado ou API externa desligada. Confira o token com escopo plugins:invoke e a API externa no Spresenter.' +
      (detail ? ` (${detail})` : '')
    );
  }
  if (status === 404) {
    return 'Ação não encontrada. Confira se o Pulse FX 1.4.1 ou superior está instalado e ativo no Spresenter.';
  }
  return detail !== '' ? detail : `O Spresenter respondeu com o código ${status}.`;
}

function toMode(value: unknown): EffectMode {
  return value === 'hit' || value === 'pulse' || value === 'strobe' ? value : 'strobe';
}

function toOwner(value: unknown): EffectOwner {
  return value === 'automation' || value === 'external' || value === 'ui' ? value : 'ui';
}

function toEffect(raw: Record<string, unknown>): PluginEffect {
  return {
    output: String(raw.output ?? ''),
    layer: Number(raw.layer ?? 0),
    mode: toMode(raw.mode),
    owner: toOwner(raw.owner),
    startedAt: Number(raw.startedAt ?? 0),
  };
}

function toOutput(raw: Record<string, unknown>): PluginOutput {
  return {
    index: Number(raw.index ?? 0),
    name: typeof raw.name === 'string' ? raw.name : '',
    disabledLayers: Array.isArray(raw.disabledLayers)
      ? raw.disabledLayers.map((layer) => Number(layer)).filter((layer) => Number.isFinite(layer))
      : [],
  };
}

function toLayer(raw: Record<string, unknown>): PluginLayer {
  return {
    index: Number(raw.index ?? 0),
    name: typeof raw.name === 'string' ? raw.name : '',
  };
}

function readSelection(raw: unknown): PluginSelection {
  if (!isRecord(raw)) return { output: '0', layer: 0 };
  return {
    output: String(raw.output ?? '0'),
    layer: Number(raw.layer ?? 0),
  };
}

/**
 * A API do Spresenter embrulha o retorno do plugin em
 * `{ pluginId, action, data }`. Aceitamos também o payload direto para não
 * quebrar se o envelope mudar.
 */
export function unwrapPayload(data: Record<string, unknown>): Record<string, unknown> {
  if (isRecord(data.data)) return data.data;
  if (isRecord(data.result)) return data.result;
  return data;
}

/** Converte a resposta de `state` sem confiar cegamente no formato. */
export function toState(data: Record<string, unknown>): PluginState {
  if (!Array.isArray(data.effects) || !Array.isArray(data.outputs) || !Array.isArray(data.layers)) {
    throw new PulseFxError(
      `Resposta de estado incompleta (chaves: ${Object.keys(data).join(', ') || 'nenhuma'}). ` +
        'Confira se a porta é a da API do Spresenter (normalmente 5050).',
    );
  }

  return {
    ok: data.ok === true,
    version: typeof data.version === 'string' ? data.version : '',
    safetyLock: data.safetyLock === true,
    selection: readSelection(data.selection),
    effects: data.effects.filter(isRecord).map(toEffect),
    outputs: data.outputs.filter(isRecord).map(toOutput),
    layers: data.layers.filter(isRecord).map(toLayer),
  };
}

export class PulseFxApi {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly options: ApiOptions,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
  ) {
    this.baseUrl = buildBaseUrl(options.host, options.port);
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  get endpoint(): string {
    return this.baseUrl;
  }

  async state(): Promise<PluginState> {
    return toState(unwrapPayload(await this.call('state')));
  }

  async start(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return unwrapPayload(await this.call('start', payload));
  }

  async stop(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return unwrapPayload(await this.call('stop', payload));
  }

  /** Exige Pulse FX 1.4.1+. A trava é global: vale para painel, automação e API. */
  async setSafetyLock(enabled: boolean): Promise<Record<string, unknown>> {
    return unwrapPayload(await this.call('safetyLock', { enabled }));
  }

  private async call(
    action: string,
    payload?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/${action}`, {
        method: payload === undefined ? 'GET' : 'POST',
        headers: {
          Authorization: `Bearer ${this.options.token}`,
          ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: payload === undefined ? undefined : JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new PulseFxError(
          `O Spresenter não respondeu em ${Math.round(this.timeoutMs / 1000)} s. Confira o endereço e a porta.`,
        );
      }
      throw new PulseFxError(`Não foi possível conectar ao Spresenter. ${errorMessage(error)}`);
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    const data = parseJson(text);

    if (!response.ok) {
      throw new PulseFxError(describeStatus(response.status, data, text), response.status);
    }
    if (!isRecord(data)) {
      throw new PulseFxError(
        'O Spresenter respondeu algo que não é JSON. Confira se a porta é a da API (normalmente 5050).',
      );
    }

    return data;
  }
}
