import type { HassEntity } from "home-assistant-js-websocket";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/cards/fa-andon-view";
import type { HomeAssistant } from "../../../../src/types";

const makeState = (
  entityId: string,
  state: string,
  lastChanged: string
): HassEntity =>
  ({
    entity_id: entityId,
    state,
    last_changed: lastChanged,
    last_updated: lastChanged,
    attributes: {},
    context: { id: "ctx", parent_id: null, user_id: null },
  }) as HassEntity;

const makeHass = (): HomeAssistant =>
  ({
    states: {
      "binary_sensor.line1_press03_overtemp_alert": makeState(
        "binary_sensor.line1_press03_overtemp_alert",
        "on",
        "2026-06-14T12:00:00.000Z"
      ),
      "input_boolean.line1_press03_overtemp_ack": makeState(
        "input_boolean.line1_press03_overtemp_ack",
        "on",
        "2026-06-14T12:01:00.000Z"
      ),
      "binary_sensor.line2_extr01_pressure_alert": makeState(
        "binary_sensor.line2_extr01_pressure_alert",
        "on",
        "2026-06-14T12:02:00.000Z"
      ),
      "input_boolean.line2_extr01_pressure_ack": makeState(
        "input_boolean.line2_extr01_pressure_ack",
        "off",
        "2026-06-14T12:03:00.000Z"
      ),
      "binary_sensor.line1_press03_service_due": makeState(
        "binary_sensor.line1_press03_service_due",
        "on",
        "2026-06-14T12:04:00.000Z"
      ),
    },
    formatEntityState: (stateObj: HassEntity) => stateObj.state,
  }) as unknown as HomeAssistant;

describe("fa-andon-view", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it.each(
    (["critical", "warning", "info"] as const).flatMap((severity) =>
      ["unavailable", "unknown"].flatMap((state) =>
        [false, true].map((showCleared) => ({ severity, state, showCleared }))
      )
    )
  )(
    "keeps $severity alerts visible through $state with show_cleared=$showCleared",
    async ({ severity, state, showCleared }) => {
      const entityId = "binary_sensor.line1_press03_overtemp_alert";
      const element = document.createElement("fa-andon-view");
      element.setConfig({
        type: "custom:fa-andon-view",
        show_cleared: showCleared,
        alerts: [{ entity: entityId, name: "Machine alert", severity }],
      });
      element.hass = makeHass();
      document.body.appendChild(element);
      await element.updateComplete;

      const section = () =>
        element.shadowRoot!.querySelector(`section.${severity}`)!;
      expect(section().querySelector(".alert-row.active")).not.toBeNull();

      for (const nextState of [state, "on", state, "off", "clear"]) {
        element.hass = {
          ...element.hass!,
          states: {
            ...element.hass!.states,
            [entityId]: makeState(entityId, nextState, "2026-06-14T12:05:00Z"),
          },
        };
        // eslint-disable-next-line no-await-in-loop -- Verify each rendered transition.
        await element.updateComplete;

        const row = section().querySelector(".alert-row");
        if (nextState === state) {
          expect(row?.textContent).toContain("Signal unavailable");
          expect(row?.classList.contains("missing")).toBe(true);
          expect(section().querySelector(".empty")).toBeNull();
        } else if (nextState === "on") {
          expect(row?.classList.contains("active")).toBe(true);
        } else if (showCleared) {
          expect(row?.textContent).toContain("Clear");
          expect(row?.classList.contains("clear")).toBe(true);
        } else {
          expect(row).toBeNull();
          expect(section().textContent).toContain(`No ${severity} alerts`);
        }
      }
    }
  );

  it("groups active alerts by severity and renders the bookkeeping disclaimer", async () => {
    const element = document.createElement("fa-andon-view");
    element.setConfig({
      type: "custom:fa-andon-view",
      alerts: [
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
        {
          entity: "binary_sensor.line1_press03_overtemp_alert",
          name: "Press 03 motor overtemperature",
          severity: "critical",
          ack_entity: "input_boolean.line1_press03_overtemp_ack",
        },
      ],
    });
    element.hass = makeHass();
    document.body.appendChild(element);

    await element.updateComplete;

    const text = element.shadowRoot!.textContent!;
    expect(text).toContain("Critical");
    expect(text).toContain("Warning");
    expect(text).toContain("Info");
    expect(text).toContain("Press 03 motor overtemperature");
    expect(text).toContain("Extruder 01 pressure high");
    expect(text).toContain("Press 03 service due");
    expect(text).toContain("Acknowledged");
    expect(text).toContain("Needs acknowledgement");
    expect(text).toContain("Factory Assistant is a monitoring tool");
    expect(text).toContain("Acknowledge is bookkeeping only");
    expect(text.indexOf("Critical")).toBeLessThan(text.indexOf("Warning"));
    expect(text.indexOf("Warning")).toBeLessThan(text.indexOf("Info"));
  });

  it("opens alert details without calling a service", async () => {
    const callService = vi.fn();
    const element = document.createElement("fa-andon-view");
    element.setConfig({
      type: "custom:fa-andon-view",
      alerts: [
        {
          entity: "binary_sensor.line1_press03_overtemp_alert",
          name: "Press 03 motor overtemperature",
          severity: "critical",
        },
      ],
    });
    element.hass = { ...makeHass(), callService } as unknown as HomeAssistant;
    const moreInfo = vi.fn();
    element.addEventListener("hass-more-info", moreInfo);
    document.body.appendChild(element);

    await element.updateComplete;

    const row = element.shadowRoot!.querySelector<HTMLElement>(
      '[data-entity-id="binary_sensor.line1_press03_overtemp_alert"]'
    );
    expect(row).not.toBeNull();
    row!.click();

    expect(moreInfo).toHaveBeenCalledTimes(1);
    expect(moreInfo.mock.calls[0][0].detail).toEqual({
      entityId: "binary_sensor.line1_press03_overtemp_alert",
    });
    expect(callService).not.toHaveBeenCalled();
  });
});
