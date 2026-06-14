import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/cards/factory-wallboard-kiosk";

describe("factory-wallboard-kiosk", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-factory-assistant-kiosk");
    document.documentElement.style.removeProperty("--fa-kiosk-type-scale");
    document.getElementById("factory-assistant-kiosk-style")?.remove();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-factory-assistant-kiosk");
    document.documentElement.style.removeProperty("--fa-kiosk-type-scale");
    document.getElementById("factory-assistant-kiosk-style")?.remove();
  });

  it("applies the wallboard kiosk contract to the document and cleans it up", async () => {
    const element = document.createElement("factory-wallboard-kiosk");
    element.setConfig({
      type: "custom:factory-wallboard-kiosk",
      hide_sidebar: true,
      hide_header: true,
      type_scale: 1.6,
      interaction: "view_only",
    });
    document.body.appendChild(element);

    await element.updateComplete;

    const style = document.getElementById("factory-assistant-kiosk-style");
    const text = element.shadowRoot!.textContent!;
    expect(document.documentElement.classList).toContain(
      "factory-assistant-kiosk"
    );
    expect(document.body.classList).toContain("factory-assistant-kiosk");
    expect(document.documentElement.dataset.factoryAssistantKiosk).toBe(
      "view-only"
    );
    expect(
      document.documentElement.style.getPropertyValue("--fa-kiosk-type-scale")
    ).toBe("1.6");
    expect(style?.textContent).toContain("ha-sidebar");
    expect(style?.textContent).toContain("app-toolbar");
    expect(style?.textContent).toContain("pointer-events: none");
    expect(text).toContain("Wallboard kiosk");
    expect(text).toContain("View only");
    expect(text).toContain("Type scale 1.6");
    expect(text).toContain("Factory Assistant is a monitoring tool");

    element.remove();

    expect(document.documentElement.classList).not.toContain(
      "factory-assistant-kiosk"
    );
    expect(document.body.classList).not.toContain("factory-assistant-kiosk");
    expect(document.getElementById("factory-assistant-kiosk-style")).toBeNull();
  });

  it("blocks dashboard clicks outside the card when interaction is view-only", async () => {
    const element = document.createElement("factory-wallboard-kiosk");
    const button = document.createElement("button");
    const clickHandler = vi.fn();
    button.addEventListener("click", clickHandler);
    element.setConfig({
      type: "custom:factory-wallboard-kiosk",
      interaction: "view_only",
    });
    document.body.append(button, element);

    await element.updateComplete;

    const click = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    const dispatched = button.dispatchEvent(click);

    expect(dispatched).toBe(false);
    expect(click.defaultPrevented).toBe(true);
    expect(clickHandler).not.toHaveBeenCalled();
  });

  it("hides sidebar and header chrome inside open shadow roots and restores it", async () => {
    const shell = document.createElement("div");
    const shadow = shell.attachShadow({ mode: "open" });
    const sidebar = document.createElement("ha-sidebar") as HTMLElement;
    const toolbar = document.createElement("app-toolbar") as HTMLElement;
    sidebar.style.display = "block";
    shadow.append(sidebar, toolbar);

    const element = document.createElement("factory-wallboard-kiosk");
    element.setConfig({
      type: "custom:factory-wallboard-kiosk",
      hide_sidebar: true,
      hide_header: true,
      interaction: "view_only",
    });
    document.body.append(shell, element);

    await element.updateComplete;

    expect(sidebar.dataset.factoryAssistantKioskHidden).toBe("true");
    expect(toolbar.dataset.factoryAssistantKioskHidden).toBe("true");
    expect(sidebar.style.display).toBe("none");
    expect(toolbar.style.display).toBe("none");

    element.remove();

    expect(sidebar.dataset.factoryAssistantKioskHidden).toBeUndefined();
    expect(toolbar.dataset.factoryAssistantKioskHidden).toBeUndefined();
    expect(sidebar.style.display).toBe("block");
    expect(toolbar.style.display).toBe("");
  });
});
