import {
  InstanceBase,
  InstanceStatus,
  type SomeCompanionConfigField,
} from '@companion-module/base';
import { type ActionsSchema, UpdateActions } from './actions.js';
import { type PluginState, PulseFxApi, PulseFxError } from './api.js';
import {
  GetConfigFields,
  type ModuleConfig,
  type ModuleSecrets,
  normalizeConfig,
  normalizeSecrets,
} from './config.js';
import { type FeedbacksSchema, UpdateFeedbacks } from './feedbacks.js';
import { UpdatePresets } from './presets.js';
import { describeTarget, summarizeEffects } from './state.js';
import { UpgradeScripts } from './upgrades.js';
import { errorMessage } from './util.js';
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js';

export type ModuleSchema = {
  config: ModuleConfig;
  secrets: ModuleSecrets;
  actions: ActionsSchema;
  feedbacks: FeedbacksSchema;
  variables: VariablesSchema;
};

export { UpgradeScripts };

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
  config!: ModuleConfig;
  secrets!: ModuleSecrets;
  api!: PulseFxApi;
  snapshot: PluginState | null = null;
  connected = false;

  private lastError = '';
  private lastPollError = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private polling = false;
  private destroyed = false;
  private listsSignature = '';

  async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets): Promise<void> {
    this.config = normalizeConfig(config);
    this.secrets = normalizeSecrets(secrets);
    this.rebuildApi();

    this.updateActions();
    this.updateFeedbacks();
    this.updateVariableDefinitions();
    this.updatePresets();
    this.publishVariables();

    if (!this.secrets.token) {
      this.updateStatus(InstanceStatus.BadConfig, 'Informe o token com escopo plugins:invoke.');
      return;
    }

    this.updateStatus(InstanceStatus.Connecting);
    this.startPolling();
    void this.pollNow();
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.stopPolling();
  }

  async configUpdated(config: ModuleConfig, secrets: ModuleSecrets): Promise<void> {
    this.stopPolling();
    this.config = normalizeConfig(config);
    this.secrets = normalizeSecrets(secrets);
    this.rebuildApi();

    this.snapshot = null;
    this.connected = false;
    this.lastError = '';
    this.lastPollError = '';
    this.listsSignature = '';

    this.updateActions();
    this.updateFeedbacks();
    this.publishVariables();

    if (!this.secrets.token) {
      this.updateStatus(InstanceStatus.BadConfig, 'Informe o token com escopo plugins:invoke.');
      return;
    }

    this.updateStatus(InstanceStatus.Connecting);
    this.startPolling();
    void this.pollNow();
  }

  getConfigFields(): SomeCompanionConfigField[] {
    return GetConfigFields();
  }

  /** Ações usam isto para executar, reportar erro e atualizar o estado. */
  async runAction(label: string, task: () => Promise<unknown>): Promise<void> {
    try {
      await task();
      this.lastError = '';
      await this.refreshNow();
    } catch (error) {
      const message = errorMessage(error);
      this.lastError = message;
      this.log('error', `${label}: ${message}`);

      if (error instanceof PulseFxError && error.isConnectionProblem) {
        this.connected = false;
        this.snapshot = null;
        this.updateStatus(InstanceStatus.ConnectionFailure, message);
      }

      this.publishVariables();
      this.checkAllFeedbacks();
    }
  }

  async pollNow(): Promise<void> {
    if (this.polling || this.destroyed || !this.secrets.token) return;
    this.polling = true;
    try {
      const state = await this.api.state();
      if (!this.destroyed) this.applyState(state);
    } catch (error) {
      if (!this.destroyed) this.handlePollError(error);
    } finally {
      this.polling = false;
    }
  }

  updateActions(): void {
    UpdateActions(this);
  }

  updateFeedbacks(): void {
    UpdateFeedbacks(this);
  }

  updatePresets(): void {
    UpdatePresets(this);
  }

  updateVariableDefinitions(): void {
    UpdateVariableDefinitions(this);
  }

  private rebuildApi(): void {
    this.api = new PulseFxApi({
      host: this.config.host,
      port: this.config.port,
      token: this.secrets.token ?? '',
    });
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      void this.pollNow();
    }, this.config.pollInterval * 1000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private applyState(state: PluginState): void {
    const recovered = !this.connected;
    this.snapshot = state;
    this.connected = true;
    this.lastPollError = '';
    if (recovered) this.lastError = '';

    if (recovered) this.updateStatus(InstanceStatus.Ok);

    this.refreshDefinitionsIfNeeded(state);
    this.publishVariables();
    this.checkAllFeedbacks();
  }

  private handlePollError(error: unknown): void {
    const message = errorMessage(error);
    this.connected = false;
    this.snapshot = null;
    this.lastError = message;

    if (message !== this.lastPollError) {
      this.lastPollError = message;
      this.log('warn', `Estado indisponível: ${message}`);
    }

    this.updateStatus(InstanceStatus.ConnectionFailure, message);
    this.publishVariables();
    this.checkAllFeedbacks();
  }

  private async refreshNow(): Promise<void> {
    try {
      const state = await this.api.state();
      if (!this.destroyed) this.applyState(state);
    } catch (error) {
      if (!this.destroyed) this.handlePollError(error);
    }
  }

  private refreshDefinitionsIfNeeded(state: PluginState): void {
    const signature = JSON.stringify({
      outputs: state.outputs.map((output) => [output.index, output.name, output.disabledLayers]),
      layers: state.layers.map((layer) => [layer.index, layer.name]),
    });
    if (signature === this.listsSignature) return;

    this.listsSignature = signature;
    this.updateActions();
    this.updateFeedbacks();
  }

  private publishVariables(): void {
    const state = this.snapshot;
    this.setVariableValues({
      connection: this.connected ? 'Conectado' : 'Desconectado',
      last_error: this.lastError,
      plugin_version: state?.version ?? '',
      safety_lock: state ? (state.safetyLock ? 'Ativa' : 'Desligada') : 'Sem dados',
      effect_count: String(state?.effects.length ?? 0),
      effect_summary: state ? summarizeEffects(state) : 'Sem dados',
      selection: state
        ? describeTarget(
            { output: state.selection.output, layer: state.selection.layer },
            state.outputs,
            state.layers,
          )
        : 'Sem dados',
      endpoint: this.api?.endpoint ?? '',
    });
  }
}
