# Factory Assistant frontend

The Factory Assistant fork of the Home Assistant frontend.
**Factory Assistant is based on Home Assistant.**

It carries a **minimal identity rebrand** of the user-visible product chrome;
everything else tracks upstream so upstream releases keep merging cleanly.

## What is rebranded (vs. upstream)

- **Product name** in the browser/tab title, the PWA metas
  (`application-name`, `apple-mobile-web-app-title`), the sidebar header, and
  the About dialog → "Factory Assistant"
  (`src/html/*.template`, `src/state/panel-title-mixin.ts`,
  `src/components/ha-sidebar.ts`, `src/panels/config/info/ha-config-info.ts`).
- **Logo + favicon / PWA icon set** → an **original** placeholder "gauge" mark
  (amber `#F5A623` on graphite), **not derived from any Home Assistant or
  `home-assistant/brands` asset** (`src/components/ha-logo-svg.ts`,
  `src/resources/home-assistant-logo-svg.ts`, `public/static/icons/*`, the
  index launch-screen SVG, `mask-icon.svg`). Final artwork: see the OS repo's
  `branding/assets/README.md` spec.
- **Onboarding / landing-page** "Preparing/installing" strings, the landing
  page browser title, landing-page header image/alt text, landing-page source
  links, and the About logo alt text (`src/translations/en.json`,
  `landing-page/src/ha-landing-page.ts`,
  `src/onboarding/onboarding-welcome-links.ts`,
  `landing-page/src/html/index.html.template`,
  `landing-page/public/static/icons/*`).
- **Initial onboarding** now includes an industrial onboarding readiness panel
  covering site/line/cell setup, plant NTP and static-IP planning, Mosquitto
  availability, and the local-first default where cloud and analytics stay off
  unless a site owner enables them. This is the visible P3 bridge, not the full
  backend-driven industrial setup wizard.
- **Industrial setup wizard** adds a native onboarding checkpoint between Core
  config and integrations for site identity, line/cell/machine modeling,
  NTP/static-IP posture, Mosquitto readiness, local-first defaults, and the
  Plant overview/Andon/Wallboard dashboard handoff. The step records a
  monitoring-only handoff payload in frontend system data under
  `factory_assistant_onboarding` before integrations run.
  The wizard requires the backend to advertise the
  `factory_assistant_industrial` onboarding step. Upstream Core backends that
  omit this capability continue directly to integrations without collecting
  industrial setup data or calling the fork-only endpoint. Supporting backends
  still require successful persistence before integrations are shown, including
  after reloading onboarding.
- **Local-first onboarding welcome** removes the default Home Assistant Cloud
  restore option, removes the upstream companion-app download card, and points
  onboarding community/help links at esaueng-owned Factory Assistant source and
  docs instead of upstream Home Assistant or OHF destinations.
- **Local-first analytics onboarding step skip** saves empty analytics
  preferences and completes the backend onboarding step without showing the
  first-run opt-in screen. Site owners can still enable analytics later from
  Settings.
- **About panel contract** adds the required Factory Assistant attribution,
  non-affiliation notice, monitoring-only safety disclaimer, and links to the
  Factory Assistant safety boundary and open source license guidance instead of
  upstream Home Assistant project destinations.
- **Native plant navigation** trims the default sidebar toward the factory
  contract: Plant overview stays first, Energy/History/Logbook use the
  industrial priority order, and home-centric Map/Media/To-do panels stay
  hidden by default unless a user explicitly opts them back into the sidebar.
- **Native fa-machine-card** is bundled for Factory Assistant dashboards as
  `type: custom:fa-machine-card`. It renders machine status, OEE, current job,
  maintenance state, freshness thresholds, and a detail-only more-info tap path
  with no control actions.
- **Native fa-andon-view** is bundled as `type: custom:fa-andon-view`. It
  groups active alerts by critical/warning/info severity, shows acknowledge
  helper state as bookkeeping-only status, and opens alert details without
  service calls or safety-alarm claims.
- **Native factory-wallboard-kiosk** is bundled as
  `type: custom:factory-wallboard-kiosk`. It applies the wallboard contract by
  hiding sidebar/header chrome, scaling dashboard type, and blocking dashboard
  interactions for view-only displays.
- **Removed** the Open Home Foundation launch-screen badge and the Home
  Assistant Companion App Store smart-banner (HA-specific brand surfaces).

## What is intentionally NOT changed

- **Internal identifiers stay upstream-compatible**: the `<home-assistant>` /
  `<ha-*>` element tags, the package name (`home-assistant-frontend` /
  `hass-frontend`), API/event/service names, and the `mdiHomeAssistant` export
  symbol (path data swapped, **name kept**) — so the ecosystem and upstream
  merges keep working.
- **"Home Assistant Cloud"**, integration/domain names, and companion-app
  documentation links — these name real upstream services, not this product.
- **The default color palette** (`--ha-color-primary-*`) is upstream's. The
  Factory Assistant **amber accent is delivered by the shipped
  `factory-assistant` theme** in the OS image — not by replacing the frontend's
  color globals. This keeps the merge minimal and avoids accessibility
  regressions across the UI.

## Build

```sh
nvm use            # Node 24 (.nvmrc)
corepack enable
yarn install
yarn build         # = script/build_frontend  (gulp build-app)
```

Output: `hass_frontend/` — the content packaged as the `home-assistant-frontend`
Python wheel that Core serves.

## How it reaches the OS image

Factory Assistant Core depends on the `home-assistant-frontend` wheel. To ship
this rebranded UI on the appliance: build the wheel from this fork, publish it
to the Factory Assistant package/container registry, and have the Factory
Assistant **Core image** install it (the Supervisor/Core fork + registry track —
see the OS repo `docs/ARCHITECTURE.md` and `docs/BRANDING.md` §4). Until that
lands, the appliance ships upstream's frontend with the `factory-assistant`
theme applied.

## Known follow-ups (not in this first pass)

- Replace the placeholder gauge mark with final original artwork.
- Companion-app surfaces that are not linked from the Factory Assistant
  welcome path but still exist for upstream feature compatibility
  (`src/onboarding/dialogs/app-dialog.ts`, Matter add-device) — feature-coupled.
- The `cast/` and `demo/` sub-apps (separate manifests).
- A comprehensive translation pass beyond the product chrome.
- Accessibility review if the amber accent is ever applied as the default.
