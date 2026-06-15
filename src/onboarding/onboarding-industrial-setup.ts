import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-button";
import "../components/ha-form/ha-form";
import type { HaForm } from "../components/ha-form/ha-form";
import type {
  HaFormDataContainer,
  HaFormSchema,
} from "../components/ha-form/types";
import type { FactoryAssistantOnboardingSystemData } from "../data/frontend";
import type { ValueChangedEvent } from "../types";
import { onBoardingStyles } from "./styles";

type IndustrialSetupHandoff = Omit<
  FactoryAssistantOnboardingSystemData,
  "recorded_at"
>;

const INDUSTRIAL_SETUP_SCHEMA: HaFormSchema[] = [
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "site_name",
        required: true,
        selector: { text: { autocomplete: "organization" } },
      },
      {
        name: "line_name",
        required: true,
        selector: { text: {} },
      },
      {
        name: "cell_name",
        required: true,
        selector: { text: {} },
      },
    ],
  },
  {
    name: "ntp_source",
    selector: { text: {} },
  },
  {
    name: "static_ip_plan",
    selector: { text: {} },
  },
  {
    name: "mosquitto_broker",
    required: true,
    selector: { boolean: {} },
  },
  {
    name: "local_first_confirmed",
    required: true,
    selector: { boolean: {} },
  },
  {
    name: "dashboard_seed_confirmed",
    required: true,
    selector: { boolean: {} },
  },
  {
    name: "safety_acknowledged",
    required: true,
    selector: { boolean: {} },
  },
];

@customElement("onboarding-industrial-setup")
class OnboardingIndustrialSetup extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @state() private _handoff: IndustrialSetupHandoff = {
    site_name: "",
    line_name: "",
    cell_name: "",
    ntp_source: "",
    static_ip_plan: "",
    mosquitto_broker: false,
    local_first_confirmed: false,
    dashboard_seed_confirmed: false,
    safety_acknowledged: false,
  };

  @query("ha-form", true) private _form?: HaForm;

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

        <ha-form
          .data=${this._handoff}
          .schema=${INDUSTRIAL_SETUP_SCHEMA}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._handleValueChanged}
        ></ha-form>

        <p class="disclaimer">
          Factory Assistant is a monitoring tool, not a safety device.
        </p>

        <div class="footer">
          <ha-button @click=${this._continue} .disabled=${!this._canContinue}>
            ${this.localize(
              "ui.panel.page-onboarding.industrial_setup.continue"
            )}
          </ha-button>
        </div>
      </section>
    `;
  }

  private get _canContinue(): boolean {
    return Boolean(
      this._handoff.site_name &&
      this._handoff.line_name &&
      this._handoff.cell_name &&
      this._handoff.mosquitto_broker &&
      this._handoff.local_first_confirmed &&
      this._handoff.dashboard_seed_confirmed &&
      this._handoff.safety_acknowledged
    );
  }

  private _computeLabel = (schema: HaFormSchema): string =>
    this.localize(
      `ui.panel.page-onboarding.industrial_setup.data.${schema.name}` as any
    );

  private _handleValueChanged(
    ev: ValueChangedEvent<HaFormDataContainer>
  ): void {
    this._handoff = {
      ...this._handoff,
      ...ev.detail.value,
    };
  }

  private _continue(ev): void {
    ev.preventDefault();
    if (!this._form?.reportValidity() || !this._canContinue) {
      return;
    }
    fireEvent(this, "onboarding-step", {
      type: "industrial_setup",
      result: this._handoff,
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
