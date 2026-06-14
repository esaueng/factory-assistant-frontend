import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../../common/dom/fire_event";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";

const SAFETY_DISCLAIMER =
  "Factory Assistant is a monitoring tool, not a safety device.";

const DEFAULT_EXPECTED_UPDATE_INTERVAL = 60;
const DEFAULT_STALE_AFTER_INTERVALS = 3;
const DEFAULT_OFFLINE_AFTER_INTERVALS = 10;

type MachineFreshness = "fresh" | "stale" | "offline" | "unknown";

interface FactoryAssistantMachineCardConfig extends LovelaceCardConfig {
  status_entity: string;
  oee_entity?: string;
  job_entity?: string;
  maintenance_entity?: string;
  title?: string;
  line?: string;
  cell?: string;
  machine?: string;
  expected_update_interval?: number;
  stale_after_intervals?: number;
  offline_after_intervals?: number;
}

const STATUS_STATES: Record<string, { icon: string; label: string }> = {
  running: { icon: "mdi:play-circle", label: "Running" },
  idle: { icon: "mdi:pause-circle", label: "Idle" },
  blocked: { icon: "mdi:timer-sand", label: "Blocked" },
  down: { icon: "mdi:alert-octagon", label: "Down" },
  maintenance: { icon: "mdi:wrench", label: "Maintenance" },
  offline: { icon: "mdi:lan-disconnect", label: "Offline" },
  stale: { icon: "mdi:clock-alert-outline", label: "Stale" },
  unknown: { icon: "mdi:help-circle-outline", label: "Unknown" },
};

@customElement("fa-machine-card")
class FactoryAssistantMachineCard extends LitElement implements LovelaceCard {
  public static getStubConfig(): FactoryAssistantMachineCardConfig {
    return {
      type: "custom:fa-machine-card",
      title: "Press 03",
      line: "Line 1",
      cell: "Stamping",
      machine: "Press 03",
      status_entity: "sensor.line1_press03_status",
      oee_entity: "sensor.line1_press03_oee",
      job_entity: "sensor.line1_press03_job",
      maintenance_entity: "binary_sensor.line1_press03_service_due",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: FactoryAssistantMachineCardConfig;

  public setConfig(config: FactoryAssistantMachineCardConfig): void {
    if (!config.status_entity) {
      throw new Error("status_entity must be specified");
    }

    for (const entityId of [
      config.status_entity,
      config.oee_entity,
      config.job_entity,
      config.maintenance_entity,
    ]) {
      if (entityId && !isValidEntityId(entityId)) {
        throw new Error(`Invalid entity: ${entityId}`);
      }
    }

    this._config = {
      expected_update_interval: DEFAULT_EXPECTED_UPDATE_INTERVAL,
      stale_after_intervals: DEFAULT_STALE_AFTER_INTERVALS,
      offline_after_intervals: DEFAULT_OFFLINE_AFTER_INTERVALS,
      ...config,
    };
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 6,
      rows: 4,
      min_columns: 4,
    };
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const statusObj = this._stateObj(this._config.status_entity);
    const freshness = this._freshness(statusObj);
    const normalizedStatus =
      freshness === "offline"
        ? "offline"
        : freshness === "stale"
          ? "stale"
          : this._normalizeStatus(statusObj);
    const status = STATUS_STATES[normalizedStatus] ?? STATUS_STATES.unknown;
    const title =
      this._config.title || this._config.machine || this._config.status_entity;
    const subtitle = [this._config.line, this._config.cell]
      .filter(Boolean)
      .join(" / ");

    return html`
      <ha-card
        tabindex="0"
        role="button"
        aria-label=${ifDefined(`Show details for ${title}`)}
        @click=${this._showDetails}
        @keydown=${this._showDetailsFromKeyboard}
      >
        <div class="card">
          <div class="header">
            <div>
              <div class="title">${title}</div>
              ${subtitle ? html`<div class="subtitle">${subtitle}</div>` : ""}
            </div>
            <div class="status ${normalizedStatus}">
              <ha-icon .icon=${status.icon}></ha-icon>
              <span>${status.label}</span>
            </div>
          </div>

          <div class="metrics">
            ${this._renderMetric(
              "Status",
              this._config.status_entity,
              "mdi:state-machine",
              statusObj ? status.label : "Unavailable"
            )}
            ${this._renderMetric("OEE", this._config.oee_entity, "mdi:gauge")}
            ${this._renderMetric(
              "Current job",
              this._config.job_entity,
              "mdi:clipboard-text-clock-outline"
            )}
            ${this._renderMetric(
              "Maintenance",
              this._config.maintenance_entity,
              "mdi:wrench-clock",
              undefined,
              true
            )}
          </div>

          <div class="freshness ${freshness}">
            <span>${this._freshnessLabel(freshness, statusObj)}</span>
          </div>

          <div class="disclaimer">${SAFETY_DISCLAIMER}</div>
        </div>
      </ha-card>
    `;
  }

  private _renderMetric(
    label: string,
    entityId: string | undefined,
    icon: string,
    fallback?: string,
    maintenance = false
  ) {
    return html`
      <div class="metric">
        <ha-icon .icon=${icon}></ha-icon>
        <div>
          <div class="metric-label">${label}</div>
          <div class="metric-value">
            ${maintenance
              ? this._maintenanceValue(entityId)
              : fallback || this._entityValue(entityId)}
          </div>
        </div>
      </div>
    `;
  }

  private _stateObj(entityId?: string): HassEntity | undefined {
    if (!entityId || !this.hass) {
      return undefined;
    }
    return this.hass.states[entityId];
  }

  private _entityValue(entityId?: string): string {
    const stateObj = this._stateObj(entityId);
    if (!entityId) {
      return "Not configured";
    }
    if (!stateObj) {
      return "Unavailable";
    }
    return this.hass?.formatEntityState(stateObj) ?? stateObj.state;
  }

  private _maintenanceValue(entityId?: string): string {
    const stateObj = this._stateObj(entityId);
    if (!entityId) {
      return "Not configured";
    }
    if (!stateObj) {
      return "Unavailable";
    }
    if (stateObj.state === "on") {
      return "Due";
    }
    if (stateObj.state === "off") {
      return "Clear";
    }
    return this.hass?.formatEntityState(stateObj) ?? stateObj.state;
  }

  private _normalizeStatus(stateObj?: HassEntity): string {
    if (!stateObj) {
      return "offline";
    }
    const statusState = stateObj.state.toLowerCase().replace(/[\s_-]+/g, "_");
    if (statusState in STATUS_STATES) {
      return statusState;
    }
    if (statusState === "on") {
      return "running";
    }
    if (statusState === "off") {
      return "idle";
    }
    return "unknown";
  }

  private _freshness(stateObj?: HassEntity): MachineFreshness {
    if (!stateObj) {
      return "offline";
    }

    const updatedAt = Date.parse(
      stateObj.last_updated || stateObj.last_changed
    );
    if (!Number.isFinite(updatedAt)) {
      return "unknown";
    }

    const ageSeconds = (Date.now() - updatedAt) / 1000;
    const expectedInterval =
      this._config?.expected_update_interval ??
      DEFAULT_EXPECTED_UPDATE_INTERVAL;
    const staleAfter =
      this._config?.stale_after_intervals ?? DEFAULT_STALE_AFTER_INTERVALS;
    const offlineAfter =
      this._config?.offline_after_intervals ?? DEFAULT_OFFLINE_AFTER_INTERVALS;

    if (ageSeconds >= expectedInterval * offlineAfter) {
      return "offline";
    }
    if (ageSeconds >= expectedInterval * staleAfter) {
      return "stale";
    }
    return "fresh";
  }

  private _freshnessLabel(
    freshness: MachineFreshness,
    stateObj?: HassEntity
  ): string {
    if (freshness === "offline") {
      return stateObj ? "Status offline threshold exceeded" : "Status missing";
    }
    if (freshness === "stale") {
      return "Status stale";
    }
    if (freshness === "unknown") {
      return "Status freshness unknown";
    }
    return "Status fresh";
  }

  private _showDetails(): void {
    if (!this._config?.status_entity) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId: this._config.status_entity });
  }

  private _showDetailsFromKeyboard(ev: KeyboardEvent): void {
    if (ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();
    this._showDetails();
  }

  static styles = css`
    ha-card {
      height: 100%;
      cursor: pointer;
    }

    .card {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 100%;
      padding: 20px;
    }

    .header {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }

    .title {
      color: var(--primary-text-color);
      font-size: 18px;
      font-weight: 600;
      line-height: 1.25;
    }

    .subtitle {
      color: var(--secondary-text-color);
      font-size: 13px;
      line-height: 1.4;
      margin-top: 4px;
    }

    .status {
      align-items: center;
      border-radius: 999px;
      display: inline-flex;
      flex: 0 0 auto;
      gap: 6px;
      min-height: 32px;
      padding: 0 10px;
      background: var(--state-inactive-color);
      color: var(--text-primary-color);
      font-size: 13px;
      font-weight: 600;
      line-height: 1;
    }

    .status ha-icon {
      --mdc-icon-size: 18px;
    }

    .status.running {
      background: var(--success-color);
    }

    .status.idle,
    .status.maintenance {
      background: var(--warning-color);
      color: var(--primary-text-color);
    }

    .status.blocked,
    .status.down,
    .status.offline,
    .status.stale {
      background: var(--error-color);
    }

    .metrics {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .metric {
      align-items: flex-start;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      display: flex;
      gap: 10px;
      min-width: 0;
      padding: 12px;
    }

    .metric ha-icon {
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
      flex: 0 0 auto;
    }

    .metric-label {
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.3;
    }

    .metric-value {
      color: var(--primary-text-color);
      font-size: 15px;
      font-weight: 600;
      line-height: 1.35;
      margin-top: 2px;
      overflow-wrap: anywhere;
    }

    .freshness {
      border-radius: 6px;
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.4;
      padding: 8px 10px;
      background: var(--secondary-background-color);
    }

    .freshness.stale,
    .freshness.offline {
      color: var(--error-color);
      font-weight: 600;
    }

    .disclaimer {
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.4;
      margin-top: auto;
    }

    @media (max-width: 600px) {
      .header {
        flex-direction: column;
      }

      .metrics {
        grid-template-columns: 1fr;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "fa-machine-card": FactoryAssistantMachineCard;
  }
}
