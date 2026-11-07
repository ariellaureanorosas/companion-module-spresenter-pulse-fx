import { describe, expect, it } from 'vitest';
import {
  buildStartPayload,
  buildStopPayload,
  colorToHex,
  type StartOptions,
  safetyLockRequest,
} from './payload.js';

const START: StartOptions = {
  mode: 'strobe',
  frequency: 2,
  color: 0x22d3ee,
  intensity: 85,
  target: 'full',
  output: '',
  layer: -1,
  flashWidth: 50,
  thickness: 35,
  softness: 50,
  decayMs: 320,
  safetyLock: 'keep',
};

describe('cor', () => {
  it('converte o número do colorpicker em hexadecimal', () => {
    expect(colorToHex(0x22d3ee)).toBe('#22d3ee');
    expect(colorToHex(0x000000)).toBe('#000000');
    expect(colorToHex(0xffffff)).toBe('#ffffff');
  });

  it('cai no branco quando o valor não é finito', () => {
    expect(colorToHex(Number.NaN)).toBe('#ffffff');
  });
});

describe('start', () => {
  it('omite output vazio e layer -1 para usar a seleção do painel', () => {
    const payload = buildStartPayload(START);

    expect(payload).not.toHaveProperty('output');
    expect(payload).not.toHaveProperty('layer');
    expect(payload).toMatchObject({ mode: 'strobe', frequency: 2, target: 'full' });
  });

  it('inclui a camada 0, que é válida', () => {
    const payload = buildStartPayload({ ...START, output: '1', layer: 0 });

    expect(payload).toMatchObject({ output: '1', layer: 0 });
  });

  it('remove espaços do output', () => {
    expect(buildStartPayload({ ...START, output: ' 2 ' })).toMatchObject({ output: '2' });
  });

  it('leva a cor como texto', () => {
    expect(buildStartPayload({ ...START, color: 0xff0000 })).toMatchObject({ color: '#ff0000' });
  });

  it('não mexe na trava por padrão', () => {
    expect(buildStartPayload(START)).not.toHaveProperty('ignoreSafetyLock');
    expect(buildStartPayload({ ...START, safetyLock: 'on' })).not.toHaveProperty(
      'ignoreSafetyLock',
    );
    expect(buildStartPayload({ ...START, safetyLock: 'off' })).not.toHaveProperty(
      'ignoreSafetyLock',
    );
  });

  it('manda ignoreSafetyLock só no modo ignorar', () => {
    expect(buildStartPayload({ ...START, safetyLock: 'bypass' })).toMatchObject({
      ignoreSafetyLock: true,
    });
  });

  it('inclui decayMs no payload', () => {
    expect(buildStartPayload({ ...START, mode: 'hit' })).toMatchObject({
      mode: 'hit',
      decayMs: 320,
    });
    expect(buildStartPayload({ ...START, mode: 'hit', decayMs: 500 })).toMatchObject({
      decayMs: 500,
    });
  });

  it('leva vinheta e moldura também no hit', () => {
    expect(
      buildStartPayload({
        ...START,
        mode: 'hit',
        target: 'vignette',
        thickness: 70,
        softness: 25,
      }),
    ).toMatchObject({
      mode: 'hit',
      target: 'vignette',
      thickness: 70,
      softness: 25,
      decayMs: 320,
    });

    expect(
      buildStartPayload({ ...START, mode: 'hit', target: 'frame', thickness: 12, softness: 90 }),
    ).toMatchObject({ mode: 'hit', target: 'frame', thickness: 12, softness: 90 });
  });
});

describe('trava', () => {
  it('traduz o modo em pedido explícito, sem alternância', () => {
    expect(safetyLockRequest('on')).toBe(true);
    expect(safetyLockRequest('off')).toBe(false);
    expect(safetyLockRequest('keep')).toBeNull();
    expect(safetyLockRequest('bypass')).toBeNull();
  });
});

describe('stop', () => {
  it('omite o alvo quando a seleção do painel é usada', () => {
    expect(buildStopPayload({ output: '', layer: -1, force: false })).toEqual({ force: false });
  });

  it('inclui o alvo e o force quando informados', () => {
    expect(buildStopPayload({ output: '1', layer: 3, force: true })).toEqual({
      output: '1',
      layer: 3,
      force: true,
    });
  });
});
