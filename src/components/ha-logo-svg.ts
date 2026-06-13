import type { TemplateResult } from "lit";
import { css, LitElement, html } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-logo-svg")
export class HaLogoSvg extends LitElement {
  protected render(): TemplateResult {
    // Factory Assistant placeholder mark — original industrial "gauge" motif
    // (amber #F5A623). NOT derived from any Home Assistant / home-assistant
    // brands asset. Replace with final artwork per branding/assets spec.
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <g fill="none" stroke="#F5A623" stroke-linecap="round">
        <path stroke-width="22" d="M70 188 A85 85 0 1 1 170 188" />
        <path stroke-width="20" d="M120 119 L168 86" />
      </g>
      <circle cx="120" cy="119" r="13" fill="#F5A623" />
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
