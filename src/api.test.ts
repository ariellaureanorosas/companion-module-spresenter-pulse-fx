import { describe, expect, it } from 'vitest';
import { buildBaseUrl, type FetchLike, PulseFxApi, PulseFxError, resolveHostPort } from './api.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const STATE = {
  ok: true,
  version: '1.4.0',
  safetyLock: true,
  selection: { output: '0', layer: 5 },
  effects: [{ output: '1', layer: 3, mode: 'strobe', owner: 'external', startedAt: 10 }],
  outputs: [{ index: 0, name: 'Principal', disabledLayers: [] }],
  layers: [{ index: 5, name: 'Sobreposição' }],
};

/** Resposta real da API do Spresenter: o retorno do plugin vem dentro de `data`. */
const ENVELOPE = {
  pluginId: 'com.spresenter.pulse-fx',
  action: 'state',
  data: STATE,
};

function apiWith(fetchImpl: FetchLike, host = '127.0.0.1', port = 5050): PulseFxApi {
  return new PulseFxApi({ host, port, token: 'segredo', timeoutMs: 1000 }, fetchImpl);
}

describe('endereço', () => {
  it('aceita host simples', () => {
    expect(resolveHostPort('127.0.0.1', 5050)).toEqual({ hostname: '127.0.0.1', port: 5050 });
  });

  it('aceita host:porta e ignora a porta do config', () => {
    expect(resolveHostPort('192.168.0.10:6000', 5050)).toEqual({
      hostname: '192.168.0.10',
      port: 6000,
    });
  });

  it('aceita esquema e barra no fim', () => {
    expect(resolveHostPort('http://spresenter.local:5050/', 5050)).toEqual({
      hostname: 'spresenter.local',
      port: 5050,
    });
  });

  it('preserva IPv6 entre colchetes', () => {
    expect(resolveHostPort('[::1]:5050', 5050)).toEqual({ hostname: '[::1]', port: 5050 });
  });

  it('monta a URL da ação', () => {
    expect(buildBaseUrl('127.0.0.1', 5050)).toBe(
      'http://127.0.0.1:5050/api/v1/plugins/com.spresenter.pulse-fx/requests',
    );
  });
});

describe('cliente', () => {
  it('chama state com GET e Bearer', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const api = apiWith(async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(ENVELOPE);
    });

    const state = await api.state();

    expect(state.version).toBe('1.4.0');
    expect(state.effects).toHaveLength(1);
    expect(calls[0].url).toContain('/requests/state');
    expect(calls[0].init?.method).toBe('GET');
    expect(new Headers(calls[0].init?.headers).get('authorization')).toBe('Bearer segredo');
  });

  it('lê o estado de dentro do envelope data', async () => {
    const api = apiWith(async () => jsonResponse(ENVELOPE));

    const state = await api.state();

    expect(state.outputs).toHaveLength(1);
    expect(state.layers[0].name).toBe('Sobreposição');
    expect(state.selection).toEqual({ output: '0', layer: 5 });
  });

  it('aceita o payload direto, sem envelope', async () => {
    const api = apiWith(async () => jsonResponse(STATE));

    await expect(api.state()).resolves.toMatchObject({ version: '1.4.0' });
  });

  it('chama start com POST e JSON', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const api = apiWith(async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({
        pluginId: 'com.spresenter.pulse-fx',
        action: 'start',
        data: { ok: true },
      });
    });

    const result = await api.start({ mode: 'strobe', frequency: 2 });

    expect(result).toEqual({ ok: true });
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.body).toBe('{"mode":"strobe","frequency":2}');
    expect(new Headers(calls[0].init?.headers).get('content-type')).toBe('application/json');
  });

  it('explica token recusado', async () => {
    const api = apiWith(async () => jsonResponse({ message: 'sem permissão' }, 401));

    const error = await api.state().catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(PulseFxError);
    expect((error as PulseFxError).status).toBe(401);
    expect((error as PulseFxError).isConnectionProblem).toBe(true);
    expect((error as Error).message).toContain('plugins:invoke');
  });

  it('explica plugin antigo no 404', async () => {
    const api = apiWith(async () => jsonResponse({}, 404));

    const error = await api.state().catch((failure: unknown) => failure);

    expect((error as Error).message).toContain('1.4.1');
  });

  it('repassa a mensagem do plugin no 409', async () => {
    const api = apiWith(async () =>
      jsonResponse({ message: 'Não foi possível aplicar o overlay.' }, 409),
    );

    const error = await api.start({}).catch((failure: unknown) => failure);

    expect((error as PulseFxError).status).toBe(409);
    expect((error as PulseFxError).isConnectionProblem).toBe(false);
    expect((error as Error).message).toBe('Não foi possível aplicar o overlay.');
  });

  it('traduz falha de rede', async () => {
    const api = apiWith(async () => {
      throw new Error('ECONNREFUSED');
    });

    const error = await api.state().catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(PulseFxError);
    expect((error as Error).message).toContain('Não foi possível conectar');
    expect((error as PulseFxError).isConnectionProblem).toBe(true);
  });

  it('chama safetyLock com o pedido explícito', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const api = apiWith(async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({
        pluginId: 'com.spresenter.pulse-fx',
        action: 'safetyLock',
        data: { ok: true, safetyLock: false },
      });
    });

    const result = await api.setSafetyLock(false);

    expect(result).toEqual({ ok: true, safetyLock: false });
    expect(calls[0].url).toContain('/requests/safetyLock');
    expect(calls[0].init?.body).toBe('{"enabled":false}');
  });

  it('recusa resposta que não é JSON', async () => {
    const api = apiWith(async () => new Response('<html>painel</html>', { status: 200 }));

    const error = await api.state().catch((failure: unknown) => failure);

    expect((error as Error).message).toContain('5050');
  });

  it('recusa estado sem as listas', async () => {
    const api = apiWith(async () => jsonResponse({ ok: true, effects: [] }));

    const error = await api.state().catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(PulseFxError);
    expect((error as Error).message).toContain('estado incompleta');
  });
});
