import { describe, expect, it } from "vitest";

import { computePanels } from "../../src/components/ha-sidebar";
import type { PanelInfo } from "../../src/types";

const panel = (
  urlPath: string,
  title: string,
  options: Partial<PanelInfo> = {}
): PanelInfo => ({
  component_name: urlPath === "lovelace" ? "lovelace" : urlPath,
  config: null,
  icon: null,
  title,
  url_path: urlPath,
  ...options,
});

describe("Factory Assistant sidebar navigation", () => {
  it("keeps plant navigation focused by default while allowing explicit opt-in panels", () => {
    const panels: Record<string, PanelInfo> = {
      lovelace: panel("lovelace", "Plant overview"),
      map: panel("map", "Map"),
      media: panel("media-browser", "Media"),
      todo: panel("todo", "To-do lists"),
      energy: panel("energy", "Energy"),
      history: panel("history", "History"),
      logbook: panel("logbook", "Logbook"),
      custom: panel("maintenance", "Maintenance"),
    };

    const [defaultPanels] = computePanels(panels, "lovelace", [], [], {
      language: "en",
    } as never);

    expect(defaultPanels.map((item) => item.url_path)).toEqual([
      "lovelace",
      "energy",
      "history",
      "logbook",
      "maintenance",
    ]);

    const [optInPanels] = computePanels(
      panels,
      "lovelace",
      ["todo", "map", "media-browser"],
      [],
      { language: "en" } as never
    );

    expect(optInPanels.map((item) => item.url_path)).toContain("todo");
    expect(optInPanels.map((item) => item.url_path)).toContain("map");
    expect(optInPanels.map((item) => item.url_path)).toContain("media-browser");
  });
});
