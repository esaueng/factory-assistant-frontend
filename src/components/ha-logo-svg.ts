import type { TemplateResult } from "lit";
import { css, LitElement, html } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-logo-svg")
export class HaLogoSvg extends LitElement {
  protected render(): TemplateResult {
    // Factory Assistant mark — original "hex pulse" motif: a hexagon
    // (industrial / modular) carrying a monitoring pulse, in amber #F5A623.
    // Original artwork; NOT derived from any Home Assistant / home-assistant
    // brands asset. Source: branding/assets/fa-mark.svg.
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <g fill="none" stroke="#F5A623" stroke-linecap="round" stroke-linejoin="round">
        <polygon stroke-width="18" points="120,28 199.7,74 199.7,166 120,212 40.3,166 40.3,74" />
        <path stroke-width="16" d="M52 120 L96 120 L116 76 L136 164 L156 120 L196 120" />
      </g>
    </svg>`;
  }

  static styles = css`
    :host {
      display: var(--ha-icon-display, inline-flex);
      align-items: center;
      justify-content: center;
      position: relative;
      vertical-align: middle;
      fill: currentcolor;
      width: var(--mdc-icon-size, 24px);
      height: var(--mdc-icon-size, 24px);
    }
    svg {
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: block;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-logo-svg": HaLogoSvg;
  }
}
