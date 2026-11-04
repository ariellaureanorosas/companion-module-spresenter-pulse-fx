import type {
  CompanionPresetDefinitions,
  CompanionPresetSection,
  CompanionSimplePresetDefinition,
} from '@companion-module/base';
import { combineRgb } from '@companion-module/base';
import type ModuleInstance from './main.js';
import type { ModuleSchema } from './main.js';
import type { StartOptions } from './payload.js';

const BASE: Omit<StartOptions, 'mode'> = {
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

const WHITE = combineRgb(255, 255, 255);
const DARK = combineRgb(31, 41, 55);
const GREEN = combineRgb(22, 163, 74);
const RED = combineRgb(220, 38, 38);
const AMBER = combineRgb(161, 98, 7);

function momentary(
  name: string,
  text: string,
  mode: StartOptions['mode'],
): CompanionSimplePresetDefinition<ModuleSchema> {
  return {
    type: 'simple',
    name,
    style: {
      text,
      size: 'auto',
      color: WHITE,
      bgcolor: DARK,
      show_topbar: false,
    },
    steps: [
      {
        down: [{ actionId: 'start', options: { ...BASE, mode } }],
        up: [{ actionId: 'stop', options: { output: '', layer: -1, force: false } }],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'effect_active',
        options: { output: '', layer: -1, owner: 'external', mode },
        style: { bgcolor: GREEN, color: WHITE },
      },
    ],
  };
}

function hitMomentary(name: string, text: string): CompanionSimplePresetDefinition<ModuleSchema> {
  return {
    type: 'simple',
    name,
    style: {
      text,
      size: 'auto',
      color: WHITE,
      bgcolor: DARK,
      show_topbar: false,
    },
    steps: [
      {
        // Hit para sozinho após decayMs — não manda stop no up
        down: [{ actionId: 'start', options: { ...BASE, mode: 'hit' } }],
        up: [],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'effect_active',
        options: { output: '', layer: -1, owner: 'external', mode: 'hit' },
        style: { bgcolor: GREEN, color: WHITE },
      },
    ],
  };
}

function togglePreset(
  name: string,
  text: string,
  mode: StartOptions['mode'],
): CompanionSimplePresetDefinition<ModuleSchema> {
  return {
    type: 'simple',
    name,
    style: {
      text,
      size: 'auto',
      color: WHITE,
      bgcolor: DARK,
      show_topbar: false,
    },
    steps: [
      {
        down: [{ actionId: 'toggle', options: { ...BASE, mode } }],
        up: [],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'effect_active',
        options: { output: '', layer: -1, owner: 'external', mode },
        style: { bgcolor: GREEN, color: WHITE },
      },
    ],
  };
}

export function UpdatePresets(self: ModuleInstance): void {
  const structure: CompanionPresetSection[] = [
    {
      id: 'pulse-fx',
      name: 'Pulse FX',
      description: 'Botões prontos para o plugin Pulse FX do Spresenter.',
      definitions: [
        {
          id: 'momentary',
          type: 'simple',
          name: 'Segurar para acender',
          description: 'Liga ao apertar e desliga ao soltar. A camada é a selecionada no painel.',
          presets: ['strobe_momentary', 'pulse_momentary', 'hit_momentary'],
        },
        {
          id: 'toggle',
          type: 'simple',
          name: 'Alternar',
          description: 'Um toque liga, outro desliga o efeito iniciado por este módulo.',
          presets: ['strobe_toggle', 'pulse_toggle'],
        },
        {
          id: 'control',
          type: 'simple',
          name: 'Controle',
          description: 'Encerra todos os efeitos, de qualquer dono.',
          presets: ['stop_all'],
        },
        {
          id: 'safety',
          type: 'simple',
          name: 'Segurança',
          description: 'Trava de 3 Hz: um toque liga, outro desliga.',
          presets: ['safety_lock_toggle'],
        },
      ],
    },
  ];

  const presets: CompanionPresetDefinitions<ModuleSchema> = {
    strobe_momentary: momentary('Strobe (segurar)', 'STROBE', 'strobe'),
    pulse_momentary: momentary('Pulse (segurar)', 'PULSE', 'pulse'),
    hit_momentary: hitMomentary('Hit (momentâneo)', 'HIT'),
    strobe_toggle: togglePreset('Strobe (alternar)', 'STROBE', 'strobe'),
    pulse_toggle: togglePreset('Pulse (alternar)', 'PULSE', 'pulse'),
    stop_all: {
      type: 'simple',
      name: 'Parar tudo',
      style: {
        text: 'PARAR',
        size: 'auto',
        color: WHITE,
        bgcolor: RED,
        show_topbar: false,
      },
      steps: [
        {
          down: [{ actionId: 'stop_all', options: {} }],
          up: [],
        },
      ],
      feedbacks: [],
    },
    safety_lock_toggle: {
      type: 'simple',
      name: 'Trava de 3 Hz',
      style: {
        text: 'TRAVA 3 Hz',
        size: 'auto',
        color: WHITE,
        bgcolor: AMBER,
        show_topbar: false,
      },
      steps: [
        {
          down: [{ actionId: 'safety_lock', options: { action: 'toggle' } }],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'safety_lock_on',
          options: {},
          style: { bgcolor: GREEN, color: WHITE },
        },
      ],
    },
  };

  self.setPresetDefinitions(structure, presets);
}
