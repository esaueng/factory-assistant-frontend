import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceCard, LovelaceGridOptions } from "../types";

const SAFETY_DISCLAIMER =
  "Factory Assistant is a monitoring tool, not a safety device.";
const KIOSK_CLASS = "factory-assistant-kiosk";
const KIOSK_STYLE_ID = "factory-assistant-kiosk-style";
const DEFAULT_TYPE_SCALE = 1.6;
const HEADER_CHROME_SELECTOR = "app-toolbar, app-header, ha-menu-button";
const SIDEBAR_CHROME_SELECTOR = "ha-sidebar";

interface FactoryWallboardKioskConfig extends LovelaceCardConfig {
  hide_sidebar?: boolean;
  hide_header?: boolean;
  type_scale?: number;
  interaction?: "view_only";
  auto_cycle_optional?: boolean;
}

const KIOSK_STYLE = `
html.factory-assistant-kiosk,
body.factory-assistant-kiosk {
  --fa-kiosk-type-scale: 1.6;
  min-height: 100%;
}

body.factory-assistant-kiosk {
  background: var(--primary-background-color);
  font-size: calc(16px * var(--fa-kiosk-type-scale, 1.6));
}

html.factory-assistant-kiosk[data-factory-assistant-hide-sidebar="true"] ha-sidebar,
body.factory-assistant-kiosk[data-factory-assistant-hide-sidebar="true"] ha-sidebar,
html.factory-assistant-kiosk[data-factory-assistant-hide-sidebar="true"] home-assistant-main ha-sidebar,
body.factory-assistant-kiosk[data-factory-assistant-hide-sidebar="true"] home-assistant-main ha-sidebar {
  display: none !important;
}

html.factory-assistant-kiosk[data-factory-assistant-hide-header="true"] app-toolbar,
body.factory-assistant-kiosk[data-factory-assistant-hide-header="true"] app-toolbar,
html.factory-assistant-kiosk[data-factory-assistant-hide-header="true"] app-header,
body.factory-assistant-kiosk[data-factory-assistant-hide-header="true"] app-header,
html.factory-assistant-kiosk[data-factory-assistant-hide-header="true"] ha-menu-button,
body.factory-assistant-kiosk[data-factory-assistant-hide-header="true"] ha-menu-button {
  display: none !important;
}

body.factory-assistant-kiosk[data-factory-assistant-interaction="view-only"] hui-root,
body.factory-assistant-kiosk[data-factory-assistant-interaction="view-only"] ha-card {
  pointer-events: none;
}

body.factory-assistant-kiosk factory-wallboard-kiosk,
body.factory-assistant-kiosk factory-wallboard-kiosk * {
  pointer-events: auto;
}
`;

@customElement("factory-wallboard-kiosk")
class FactoryWallboardKiosk extends LitElement implements LovelaceCard {
  private static _activeInstances = 0;

  public static getStubConfig(): FactoryWallboardKioskConfig {
    return {
      type: "custom:factory-wallboard-kiosk",
      hide_sidebar: true,
      hide_header: true,
      type_scale: DEFAULT_TYPE_SCALE,
      interaction: "view_only",
      auto_cycle_optional: true,
    };
  }

  @state() private _config?: FactoryWallboardKioskConfig;

  private _active = false;
  private _chromeObserver?: MutationObserver;
  private _hiddenChrome = new Map<HTMLElement, string>();

  public connectedCallback(): void {
    super.connectedCallback();
    this._activateKioskMode();
  }

  public disconnectedCallback(): void {
    this._deactivateKioskMode();
    super.disconnectedCallback();
  }

  public setConfig(config: FactoryWallboardKioskConfig): void {
    const typeScale = Number(config.type_scale ?? DEFAULT_TYPE_SCALE);
    if (!Number.isFinite(typeScale) || typeScale <= 0) {
      throw new Error("type_scale must be a positive number");
    }
    if (config.interaction && config.interaction !== "view_only") {
      throw new Error("interaction must remain view_only");
    }

    this._config = {
      ...config,
      hide_sidebar: config.hide_sidebar ?? true,
      hide_header: config.hide_header ?? true,
      type_scale: typeScale,
      interaction: "view_only",
      auto_cycle_optional: config.auto_cycle_optional ?? true,
    };
    this._applyKioskMode();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 12,
      rows: "auto",
      min_columns: 6,
    };
  }

  protected render() {
    const typeScale = this._config?.type_scale ?? DEFAULT_TYPE_SCALE;
    const chrome = [
      this._config?.hide_sidebar !== false ? "Sidebar hidden" : "",
      this._config?.hide_header !== false ? "Header hidden" : "",
    ]
      .filter(Boolean)
      .join(" / ");

    return html`
      <ha-card>
        <div class="content">
          <ha-icon .icon=${"mdi:monitor-dashboard"}></ha-icon>
          <div>
            <div class="title">Wallboard kiosk</div>
            <div class="meta">View only / Type scale ${typeScale}</div>
            ${chrome ? html`<div class="meta">${chrome}</div>` : ""}
            <div class="disclaimer">${SAFETY_DISCLAIMER}</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  protected updated(): void {
    this._applyKioskMode();
  }

  private _activateKioskMode(): void {
    if (this._active) {
      return;
    }
    this._active = true;
    FactoryWallboardKiosk._activeInstances += 1;
    document.addEventListener("click", this._blockInteraction, true);
    document.addEventListener("dblclick", this._blockInteraction, true);
    document.addEventListener("contextmenu", this._blockInteraction, true);
    document.addEventListener("pointerdown", this._blockInteraction, true);
    document.addEventListener("keydown", this._blockInteraction, true);
    this._applyKioskMode();
  }

  private _deactivateKioskMode(): void {
    if (!this._active) {
      return;
    }
    this._active = false;
    FactoryWallboardKiosk._activeInstances = Math.max(
      0,
      FactoryWallboardKiosk._activeInstances - 1
    );
    document.removeEventListener("click", this._blockInteraction, true);
    document.removeEventListener("dblclick", this._blockInteraction, true);
    document.removeEventListener("contextmenu", this._blockInteraction, true);
    document.removeEventListener("pointerdown", this._blockInteraction, true);
    document.removeEventListener("keydown", this._blockInteraction, true);
    this._chromeObserver?.disconnect();
    this._chromeObserver = undefined;
    this._restoreChrome();

    if (FactoryWallboardKiosk._activeInstances !== 0) {
      return;
    }

    document.documentElement.classList.remove(KIOSK_CLASS);
    document.body.classList.remove(KIOSK_CLASS);
    document.documentElement.removeAttribute("data-factory-assistant-kiosk");
    document.body.removeAttribute("data-factory-assistant-kiosk");
    document.documentElement.removeAttribute(
      "data-factory-assistant-hide-sidebar"
    );
    document.body.removeAttribute("data-factory-assistant-hide-sidebar");
    document.documentElement.removeAttribute(
      "data-factory-assistant-hide-header"
    );
    document.body.removeAttribute("data-factory-assistant-hide-header");
    document.documentElement.removeAttribute(
      "data-factory-assistant-interaction"
    );
    document.body.removeAttribute("data-factory-assistant-interaction");
    document.documentElement.style.removeProperty("--fa-kiosk-type-scale");
    document.getElementById(KIOSK_STYLE_ID)?.remove();
  }

  private _applyKioskMode(): void {
    if (!this.isConnected || !this._config) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const typeScale = String(this._config.type_scale ?? DEFAULT_TYPE_SCALE);

    root.classList.add(KIOSK_CLASS);
    body.classList.add(KIOSK_CLASS);
    root.dataset.factoryAssistantKiosk = "view-only";
    body.dataset.factoryAssistantKiosk = "view-only";
    root.dataset.factoryAssistantHideSidebar = String(
      this._config.hide_sidebar !== false
    );
    body.dataset.factoryAssistantHideSidebar = String(
      this._config.hide_sidebar !== false
    );
    root.dataset.factoryAssistantHideHeader = String(
      this._config.hide_header !== false
    );
    body.dataset.factoryAssistantHideHeader = String(
      this._config.hide_header !== false
    );
    root.dataset.factoryAssistantInteraction = "view-only";
    body.dataset.factoryAssistantInteraction = "view-only";
    root.style.setProperty("--fa-kiosk-type-scale", typeScale);
    this._startChromeObserver();
    this._hideChrome();

    if (!document.getElementById(KIOSK_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = KIOSK_STYLE_ID;
      style.textContent = KIOSK_STYLE;
      document.head.append(style);
    }
  }

  private _startChromeObserver(): void {
    if (this._chromeObserver) {
      return;
    }
    this._chromeObserver = new MutationObserver(() => this._hideChrome());
    this._chromeObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  private _hideChrome(): void {
    if (!this._config) {
      return;
    }

    const selectors = [
      this._config.hide_sidebar !== false ? SIDEBAR_CHROME_SELECTOR : "",
      this._config.hide_header !== false ? HEADER_CHROME_SELECTOR : "",
    ]
      .filter(Boolean)
      .join(", ");

    if (!selectors) {
      return;
    }

    for (const element of this._queryAllOpenRoots(selectors)) {
      if (!this._hiddenChrome.has(element)) {
        this._hiddenChrome.set(element, element.style.display);
      }
      element.dataset.factoryAssistantKioskHidden = "true";
      element.style.display = "none";
    }
  }

  private _restoreChrome(): void {
    for (const [element, display] of this._hiddenChrome) {
      element.style.display = display;
      delete element.dataset.factoryAssistantKioskHidden;
    }
    this._hiddenChrome.clear();
  }

  private _queryAllOpenRoots(selector: string): HTMLElement[] {
    const roots: ParentNode[] = [document];
    const matches: HTMLElement[] = [];
    let index = 0;

    while (index < roots.length) {
      const root = roots[index];
      matches.push(...Array.from(root.querySelectorAll<HTMLElement>(selector)));

      for (const element of Array.from(
        root.querySelectorAll<HTMLElement>("*")
      )) {
        if (element.shadowRoot) {
          roots.push(element.shadowRoot);
        }
      }

      index += 1;
    }

    return matches;
  }

  private _blockInteraction = (ev: Event): void => {
    if (this._config?.interaction !== "view_only") {
      return;
    }
    if (ev.composedPath().includes(this)) {
      return;
    }
    ev.preventDefault();
    ev.stopImmediatePropagation();
  };

  static styles = css`
    ha-card {
      display: block;
    }

    .content {
      align-items: flex-start;
      color: var(--secondary-text-color);
      display: flex;
      gap: 12px;
      padding: 12px 16px;
    }

    ha-icon {
      --mdc-icon-size: 22px;
      color: var(--primary-color);
      flex: 0 0 auto;
    }

    .title {
      color: var(--primary-text-color);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.35;
    }

    .meta,
    .disclaimer {
      font-size: 12px;
      line-height: 1.4;
    }

    .disclaimer {
      margin-top: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "factory-wallboard-kiosk": FactoryWallboardKiosk;
  }
}
