import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-button";
import { onBoardingStyles } from "./styles";

@customElement("onboarding-industrial-setup")
class OnboardingIndustrialSetup extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  protected render(): TemplateResult {
    return html`
      <section
        class="industrial-setup"
        aria-label=${this.localize(
          "ui.panel.page-onboarding.industrial_setup.title"
        )}
      >
        <h1>
          ${this.localize("ui.panel.page-onboarding.industrial_setup.title")}
        </h1>
        <p>
          ${this.localize("ui.panel.page-onboarding.industrial_setup.intro")}
        </p>

        <ul class="setup-list">
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_setup.site_identity"
            )}
          </li>
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_setup.line_cell_setup"
            )}
          </li>
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_setup.network_posture"
            )}
          </li>
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_setup.ntp_static_ip"
            )}
          </li>
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_setup.mosquitto_offer"
            )}
          </li>
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_setup.local_first"
            )}
          </li>
          <li>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_setup.dashboards"
            )}
          </li>
        </ul>

        <p class="disclaimer">
          Factory Assistant is a monitoring tool, not a safety device.
        </p>

        <div class="footer">
          <ha-button @click=${this._continue}>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_setup.continue"
            )}
          </ha-button>
        </div>
      </section>
    `;
  }

  private _continue(): void {
    fireEvent(this, "onboarding-step", {
      type: "industrial_setup",
    });
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        :host {
          display: block;
        }
        .industrial-setup {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
        }
        h1,
        p {
          margin: 0;
        }
        .setup-list {
          margin: 0;
          padding-inline-start: var(--ha-space-5);
        }
        .setup-list li {
          margin-bottom: var(--ha-space-3);
          line-height: 1.4;
        }
        .setup-list li:last-child {
          margin-bottom: 0;
        }
        .disclaimer {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          line-height: var(--ha-line-height-condensed);
        }
        .footer {
          display: flex;
          justify-content: flex-end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-industrial-setup": OnboardingIndustrialSetup;
  }
}
