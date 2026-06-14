import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";

const SAFETY_DISCLAIMER =
  "Factory Assistant is a monitoring tool, not a safety device.";
const ACK_DISCLAIMER =
  "Acknowledge is bookkeeping only and does not make any machine safe.";

const SEVERITY_ORDER = ["critical", "warning", "info"] as const;

type AndonSeverity = (typeof SEVERITY_ORDER)[number];
type AlertStatus = "active" | "clear" | "missing";

interface FactoryAssistantAndonAlertConfig {
  entity: string;
  name?: string;
  severity?: AndonSeverity;
  ack_entity?: string;
}

interface FactoryAssistantAndonViewConfig extends LovelaceCardConfig {
  alerts: FactoryAssistantAndonAlertConfig[];
  title?: string;
  show_cleared?: boolean;
  acknowledge_is_bookkeeping?: true;
  safety_alarm_claim_allowed?: boolean;
}

const SEVERITY_LABELS: Record<
  AndonSeverity,
  { label: string; icon: string; empty: string }
> = {
  critical: {
    label: "Critical",
    icon: "mdi:alert-octagon",
    empty: "No critical alerts",
  },
  warning: {
    label: "Warning",
    icon: "mdi:alert",
    empty: "No warning alerts",
  },
  info: {
    label: "Info",
    icon: "mdi:information",
    empty: "No info alerts",
  },
};

@customElement("fa-andon-view")
class FactoryAssistantAndonView extends LitElement implements LovelaceCard {
  public static getStubConfig(): FactoryAssistantAndonViewConfig {
    return {
      type: "custom:fa-andon-view",
      title: "Andon board",
      alerts: [
        {
          entity: "binary_sensor.line1_press03_overtemp_alert",
          name: "Press 03 motor overtemperature",
          severity: "critical",
          ack_entity: "input_boolean.line1_press03_overtemp_ack",
        },
        {
          entity: "binary_sensor.line2_extr01_pressure_alert",
          name: "Extruder 01 pressure high",
          severity: "warning",
          ack_entity: "input_boolean.line2_extr01_pressure_ack",
        },
        {
          entity: "binary_sensor.line1_press03_service_due",
          name: "Press 03 service due",
          severity: "info",
        },
      ],
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: FactoryAssistantAndonViewConfig;

  public setConfig(config: FactoryAssistantAndonViewConfig): void {
    if (!Array.isArray(config.alerts)) {
      throw new Error("alerts must be specified");
    }

    if (config.safety_alarm_claim_allowed === true) {
      throw new Error("safety_alarm_claim_allowed must remain false");
    }

    for (const alert of config.alerts) {
      if (!alert.entity) {
        throw new Error("alert entity must be specified");
      }
      if (!isValidEntityId(alert.entity)) {
        throw new Error(`Invalid entity: ${alert.entity}`);
      }
      if (alert.ack_entity && !isValidEntityId(alert.ack_entity)) {
        throw new Error(`Invalid entity: ${alert.ack_entity}`);
      }
      if (alert.severity && !SEVERITY_ORDER.includes(alert.severity)) {
        throw new Error(`Invalid severity: ${alert.severity}`);
      }
    }

    this._config = {
      ...config,
      acknowledge_is_bookkeeping: true,
      safety_alarm_claim_allowed: false,
    };
  }

  public getCardSize(): number {
    return 6;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: "full",
      rows: "auto",
      min_columns: 8,
    };
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-card .header=${this._config.title || "Andon board"}>
        <div class="content">
          <div class="summary">
            <span>${this._activeCount()} active</span>
            <span>${SAFETY_DISCLAIMER}</span>
          </div>
          <div class="sections">
            ${SEVERITY_ORDER.map((severity) => this._renderSection(severity))}
          </div>
          <div class="disclaimer">
            <strong>${SAFETY_DISCLAIMER}</strong>
            <span>${ACK_DISCLAIMER}</span>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderSection(severity: AndonSeverity) {
    const severityInfo = SEVERITY_LABELS[severity];
    const alerts = this._alertsBySeverity(severity);

    return html`
      <section class="severity ${severity}">
        <div class="severity-header">
          <ha-icon .icon=${severityInfo.icon}></ha-icon>
          <span>${severityInfo.label}</span>
          <span class="count">${alerts.length}</span>
        </div>
        <div class="alerts">
          ${alerts.length
            ? alerts.map((alert) => this._renderAlert(alert))
            : html`<div class="empty">${severityInfo.empty}</div>`}
        </div>
      </section>
    `;
  }

  private _renderAlert(alert: FactoryAssistantAndonAlertConfig) {
    const alertState = this._stateObj(alert.entity);
    const status = this._alertStatus(alertState);
    const ackLabel = this._ackLabel(alert.ack_entity);
    const name =
      alert.name || alertState?.attributes.friendly_name || alert.entity;
    const changed = this._changedLabel(alertState);

    return html`
      <div
        class="alert-row ${status}"
        data-entity-id=${alert.entity}
        role="button"
        tabindex="0"
        @click=${this._handleAlertClick}
        @keydown=${this._handleAlertKeydown}
      >
        <div class="alert-main">
          <div class="alert-name">${name}</div>
          <div class="alert-meta">${changed}</div>
        </div>
        <div class="alert-state">
          <span>${this._statusLabel(status)}</span>
          <span>${ackLabel}</span>
        </div>
      </div>
    `;
  }

  private _alertsBySeverity(
    severity: AndonSeverity
  ): FactoryAssistantAndonAlertConfig[] {
    return (this._config?.alerts ?? [])
      .filter((alert) => (alert.severity || "info") === severity)
      .filter((alert) => {
        const status = this._alertStatus(this._stateObj(alert.entity));
        return status !== "clear" || this._config?.show_cleared;
      })
      .sort((left, right) => {
        const leftTime = Date.parse(
          this._stateObj(left.entity)?.last_changed || ""
        );
        const rightTime = Date.parse(
          this._stateObj(right.entity)?.last_changed || ""
        );
        return (
          (leftTime || Number.MAX_SAFE_INTEGER) -
          (rightTime || Number.MAX_SAFE_INTEGER)
        );
      });
  }

  private _activeCount(): number {
    return (this._config?.alerts ?? []).filter(
      (alert) => this._alertStatus(this._stateObj(alert.entity)) === "active"
    ).length;
  }

  private _stateObj(entityId?: string): HassEntity | undefined {
    if (!entityId || !this.hass) {
      return undefined;
    }
    return this.hass.states[entityId];
  }

  private _alertStatus(stateObj?: HassEntity): AlertStatus {
    if (!stateObj) {
      return "missing";
    }
    const stateValue = stateObj.state.toLowerCase();
    if (
      stateValue === "off" ||
      stateValue === "clear" ||
      stateValue === "unavailable" ||
      stateValue === "unknown"
    ) {
      return "clear";
    }
    return "active";
  }

  private _statusLabel(status: AlertStatus): string {
    if (status === "missing") {
      return "Signal unavailable";
    }
    if (status === "clear") {
      return "Clear";
    }
    return "Active";
  }

  private _ackLabel(entityId?: string): string {
    if (!entityId) {
      return "No acknowledge helper";
    }
    const stateObj = this._stateObj(entityId);
    if (!stateObj) {
      return "Acknowledge helper unavailable";
    }
    return stateObj.state === "on" ? "Acknowledged" : "Needs acknowledgement";
  }

  private _changedLabel(stateObj?: HassEntity): string {
    if (!stateObj) {
      return "No signal";
    }
    const timestamp = Date.parse(stateObj.last_changed);
    if (!Number.isFinite(timestamp)) {
      return "Changed time unavailable";
    }
    return `Changed ${new Date(timestamp).toLocaleString()}`;
  }

  private _handleAlertClick(ev: Event): void {
    const entityId = (ev.currentTarget as HTMLElement).dataset.entityId;
    if (!entityId) {
      return;
    }
    this._showDetails(entityId);
  }

  private _handleAlertKeydown(ev: KeyboardEvent): void {
    const entityId = (ev.currentTarget as HTMLElement).dataset.entityId;
    if (!entityId) {
      return;
    }
    this._showDetailsFromKeyboard(ev, entityId);
  }

  private _showDetails(entityId: string): void {
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _showDetailsFromKeyboard(ev: KeyboardEvent, entityId: string): void {
    if (ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();
    this._showDetails(entityId);
  }

  static styles = css`
    .content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0 16px 16px;
    }

    .summary {
      align-items: center;
      color: var(--secondary-text-color);
      display: flex;
      flex-wrap: wrap;
      font-size: 13px;
      gap: 8px 16px;
      justify-content: space-between;
      line-height: 1.4;
    }

    .sections {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .severity {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      min-width: 0;
      overflow: hidden;
    }

    .severity-header {
      align-items: center;
      display: flex;
      font-size: 14px;
      font-weight: 600;
      gap: 8px;
      min-height: 40px;
      padding: 0 12px;
    }

    .severity-header ha-icon {
      --mdc-icon-size: 20px;
    }

    .severity.critical .severity-header {
      background: var(--error-color);
      color: var(--text-primary-color);
    }

    .severity.warning .severity-header {
      background: var(--warning-color);
      color: var(--primary-text-color);
    }

    .severity.info .severity-header {
      background: var(--info-color);
      color: var(--text-primary-color);
    }

    .count {
      margin-inline-start: auto;
    }

    .alerts {
      display: flex;
      flex-direction: column;
    }

    .alert-row {
      border-top: 1px solid var(--divider-color);
      cursor: pointer;
      display: grid;
      gap: 10px;
      grid-template-columns: minmax(0, 1fr) auto;
      min-height: 64px;
      padding: 10px 12px;
    }

    .alert-row:focus {
      outline: 2px solid var(--primary-color);
      outline-offset: -2px;
    }

    .alert-name {
      color: var(--primary-text-color);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .alert-meta,
    .alert-state {
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.4;
    }

    .alert-state {
      align-items: flex-end;
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: end;
      white-space: nowrap;
    }

    .alert-row.active .alert-state span:first-child,
    .alert-row.missing .alert-state span:first-child {
      color: var(--error-color);
      font-weight: 600;
    }

    .empty {
      border-top: 1px solid var(--divider-color);
      color: var(--secondary-text-color);
      font-size: 13px;
      line-height: 1.4;
      padding: 16px 12px;
    }

    .disclaimer {
      background: var(--secondary-background-color);
      border-radius: 6px;
      color: var(--secondary-text-color);
      display: flex;
      flex-direction: column;
      font-size: 12px;
      gap: 4px;
      line-height: 1.4;
      padding: 10px 12px;
    }

    .disclaimer strong {
      color: var(--primary-text-color);
    }

    @media (max-width: 900px) {
      .sections {
        grid-template-columns: 1fr;
      }

      .alert-row {
        grid-template-columns: 1fr;
      }

      .alert-state {
        align-items: flex-start;
        text-align: start;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "fa-andon-view": FactoryAssistantAndonView;
  }
}
