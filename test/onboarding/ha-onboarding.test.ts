import type * as websocket from "home-assistant-js-websocket";
import type { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FactoryAssistantIndustrialSetupPayload,
  OnboardingStep,
} from "../../src/data/onboarding";
import type { HomeAssistant } from "../../src/types";
import "../../src/onboarding/ha-onboarding";

vi.hoisted(() => {
  globalThis.__HASS_URL__ = "";
  globalThis.__STATIC_PATH__ = "/static/";
});

vi.mock("../../src/state/hass-element", async () => {
  const { LitElement: litElement } = await import("lit");
  return {
    HassElement: class extends litElement {
      hassChanged = vi.fn();
    },
  };
});
vi.mock("../../src/mixins/lit-localize-lite-mixin", () => ({
  litLocalizeLiteMixin: (base: typeof LitElement) =>
    class extends base {
      language = "en";
      localize = (key: string) => key;
    },
}));
vi.mock("home-assistant-js-websocket", async (importOriginal) => ({
  ...(await importOriginal<typeof websocket>()),
  getAuth: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../src/util/register-service-worker", () => ({
  registerServiceWorker: vi.fn(),
}));
vi.mock("../../src/dialogs/make-dialog-manager", () => ({
  makeDialogManager: vi.fn(),
}));
vi.mock("../../src/onboarding/onboarding-create-user", () => ({}));
vi.mock("../../src/onboarding/onboarding-industrial-setup", () => ({}));
vi.mock("../../src/onboarding/onboarding-loading", () => ({}));
vi.mock("../../src/onboarding/onboarding-welcome", () => ({}));
vi.mock("../../src/onboarding/onboarding-welcome-links", () => ({}));
vi.mock("../../src/onboarding/onboarding-integrations", () => ({}));
vi.mock("../../src/onboarding/onboarding-core-config", () => ({}));
vi.mock("../../src/onboarding/onboarding-restore-backup", () => ({}));
vi.mock("../../src/components/ha-language-picker", () => ({}));
vi.mock("../../src/resources/particles", () => ({}));

const originalStepsPromise = window.stepsPromise;

const industrialData: FactoryAssistantIndustrialSetupPayload = {
  site_name: "Test plant",
  line_name: "Line 1",
  cell_name: "Cell 1",
  mosquitto_broker: true,
  local_first_confirmed: true,
  dashboard_seed_confirmed: true,
  safety_acknowledged: true,
};

const loadOnboarding = async (steps: OnboardingStep[]) => {
  window.stepsPromise = Promise.resolve(new Response(JSON.stringify(steps)));
  const element = document.createElement("ha-onboarding");
  vi.spyOn(
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Mock the existing private connection method.
    element as unknown as { _connectHass: () => Promise<void> },
    "_connectHass"
  ).mockResolvedValue();
  const callApi = vi.fn().mockResolvedValue({ data: industrialData });
  element.hass = { callApi, themes: {} } as unknown as HomeAssistant;
  document.body.appendChild(element);
  await vi.waitFor(() => {
    expect(
      element.shadowRoot?.querySelector(
        "onboarding-core-config, onboarding-industrial-setup, onboarding-integrations"
      )
    ).not.toBeNull();
  });
  return { element, callApi };
};

const standardSteps = (): OnboardingStep[] => [
  { step: "user", done: true },
  { step: "core_config", done: false },
  { step: "integration", done: false },
];

const finishCoreConfig = async (
  element: HTMLElementTagNameMap["ha-onboarding"]
) => {
  element.dispatchEvent(
    new CustomEvent("onboarding-step", {
      detail: { type: "core_config", result: {} },
    })
  );
  await element.updateComplete;
};

const finishIndustrialSetup = (
  element: HTMLElementTagNameMap["ha-onboarding"]
) =>
  element.dispatchEvent(
    new CustomEvent("onboarding-step", {
      detail: { type: "industrial_setup", result: industrialData },
    })
  );

describe("industrial onboarding capability", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    document.body.replaceChildren();
    window.stepsPromise = originalStepsPromise;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("continues to integrations when upstream Core does not advertise industrial setup", async () => {
    const { element, callApi } = await loadOnboarding(standardSteps());
    await finishCoreConfig(element);
    expect(
      element.shadowRoot!.querySelector("onboarding-integrations")
    ).not.toBeNull();
    expect(
      element.shadowRoot!.querySelector("onboarding-industrial-setup")
    ).toBeNull();
    finishIndustrialSetup(element);
    await element.updateComplete;
    expect(callApi).not.toHaveBeenCalled();
  });

  it("requires an advertised industrial step to persist successfully before integrations", async () => {
    const steps = standardSteps();
    steps.splice(2, 0, { step: "factory_assistant_industrial", done: false });
    const { element, callApi } = await loadOnboarding(steps);
    await finishCoreConfig(element);
    expect(
      element.shadowRoot!.querySelector("onboarding-industrial-setup")
    ).not.toBeNull();
    expect(
      element.shadowRoot!.querySelector("onboarding-integrations")
    ).toBeNull();

    callApi.mockRejectedValueOnce(new Error("Save failed"));
    finishIndustrialSetup(element);
    await vi.waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        "Unable to save industrial setup: Save failed"
      )
    );
    expect(
      element.shadowRoot!.querySelector("onboarding-industrial-setup")
    ).not.toBeNull();
    expect(
      element.shadowRoot!.querySelector("onboarding-integrations")
    ).toBeNull();

    finishIndustrialSetup(element);
    await vi.waitFor(() =>
      expect(
        element.shadowRoot!.querySelector("onboarding-integrations")
      ).not.toBeNull()
    );
    expect(callApi).toHaveBeenNthCalledWith(
      2,
      "POST",
      "onboarding/factory_assistant_industrial",
      industrialData
    );
  });

  it("uses persisted backend completion when onboarding reloads", async () => {
    const steps = standardSteps().map((step) => ({
      ...step,
      done: step.step !== "integration",
    }));
    steps.splice(2, 0, { step: "factory_assistant_industrial", done: true });
    const { element, callApi } = await loadOnboarding(steps);
    expect(
      element.shadowRoot!.querySelector("onboarding-integrations")
    ).not.toBeNull();
    expect(
      element.shadowRoot!.querySelector("onboarding-industrial-setup")
    ).toBeNull();
    finishIndustrialSetup(element);
    await element.updateComplete;
    expect(callApi).not.toHaveBeenCalled();
  });
});
