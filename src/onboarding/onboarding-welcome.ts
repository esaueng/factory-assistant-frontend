import "@home-assistant/webawesome/dist/components/divider/divider";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-button";
import "../components/ha-icon-next";
import "../components/item/ha-list-item-button";
import "../components/list/ha-list-base";
import type { HomeAssistant } from "../types";
import { onBoardingStyles } from "./styles";

@customElement("onboarding-welcome")
class OnboardingWelcome extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  protected render(): TemplateResult {
    return html`
      <h1>${this.localize("ui.panel.page-onboarding.welcome.header")}</h1>
      <p>${this.localize("ui.panel.page-onboarding.intro")}</p>

      <section
        class="industrial-readiness"
        aria-label=${this.localize(
          "ui.panel.page-onboarding.industrial_readiness.aria_label"
        )}
      >
        <h2>
          ${this.localize(
            "ui.panel.page-onboarding.industrial_readiness.title"
          )}
        </h2>
        <ul class="readiness-list">
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_readiness.site_line_cell"
            )}
          </li>
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_readiness.network_time"
            )}
          </li>
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_readiness.mqtt_broker"
            )}
          </li>
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_readiness.local_first"
            )}
          </li>
        </ul>
      </section>

      <ha-button @click=${this._start} class="start">
        ${this.localize("ui.panel.page-onboarding.welcome.start")}
      </ha-button>

      <div class="divider">
        <wa-divider></wa-divider>
        <div>
          <span
            >${this.localize(
              "ui.panel.page-onboarding.welcome.or_restore"
            )}</span
          >
        </div>
      </div>

      <ha-list-base>
        <ha-list-item-button @click=${this._restoreBackupUpload}>
          <div slot="headline">
            ${this.localize("ui.panel.page-onboarding.restore.upload_backup")}
          </div>
          <div slot="supporting-text">
            ${this.localize(
              "ui.panel.page-onboarding.restore.options.upload_description"
            )}
          </div>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
      </ha-list-base>
    `;
  }

  private _start(): void {
    fireEvent(this, "onboarding-step", {
      type: "init",
    });
  }

  private _restoreBackupUpload(): void {
    fireEvent(this, "onboarding-step", {
      type: "init",
      result: { restore: "upload" },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-bottom: calc(var(--ha-space-4) * -1);
        }
        h1 {
          margin-top: var(--ha-space-4);
          margin-bottom: var(--ha-space-2);
        }
        p {
          margin: 0;
        }
        .industrial-readiness {
          width: 100%;
          box-sizing: border-box;
          margin-top: var(--ha-space-6);
          padding-inline-start: var(--ha-space-4);
          border-inline-start: 3px solid var(--primary-color);
        }
        .industrial-readiness h2 {
          margin: 0 0 var(--ha-space-2);
          font-size: 1rem;
          font-weight: var(--ha-font-weight-medium);
          line-height: 1.4;
        }
        .readiness-list {
          margin: 0;
          padding-inline-start: var(--ha-space-5);
        }
        .readiness-list li {
          margin-bottom: var(--ha-space-2);
          line-height: 1.4;
        }
        .readiness-list li:last-child {
          margin-bottom: 0;
        }
        .start {
          margin: var(--ha-space-8) 0;
          width: 100%;
        }
        .divider {
          width: calc(100% + var(--ha-space-16));
          position: relative;
          margin-left: calc(var(--ha-space-8) * -1);
          margin-right: calc(var(--ha-space-8) * -1);
        }
        .divider div {
          position: absolute;
          display: flex;
          justify-content: center;
          align-items: center;
          top: 0;
          bottom: 0;
          width: 100%;
        }
        .divider div span {
          background-color: var(--card-background-color);
          padding: 0 var(--ha-space-4);
        }

        ha-list-base {
          width: 100%;
          padding-bottom: 0;
          --ha-row-item-padding-inline: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-welcome": OnboardingWelcome;
  }
}
