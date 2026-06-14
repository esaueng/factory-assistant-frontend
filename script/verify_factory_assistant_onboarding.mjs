import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { exit, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (path) => readFileSync(join(root, path), "utf8");
const readOptionalText = (path) =>
  existsSync(join(root, path)) ? readText(path) : "";

const errors = [];
const assert = (condition, message) => {
  if (!condition) {
    errors.push(message);
  }
};

const translations = JSON.parse(readText("src/translations/en.json"));
const pageOnboarding = translations.ui.panel["page-onboarding"];
const readiness = pageOnboarding.industrial_readiness;
const welcomeSource = readText("src/onboarding/onboarding-welcome.ts");
const onboardingHostSource = readText("src/onboarding/ha-onboarding.ts");
const welcomeLinksSource = readText(
  "src/onboarding/onboarding-welcome-links.ts"
);
const communityDialogSource = readText(
  "src/onboarding/dialogs/community-dialog.ts"
);
const configInfoSource = readText("src/panels/config/info/ha-config-info.ts");
const configInfoText = configInfoSource.replace(/\s+/g, " ");
const sidebarSource = readText("src/components/ha-sidebar.ts");
const landingPageSource = readText("landing-page/src/ha-landing-page.ts");
const landingPageTemplate = readText(
  "landing-page/src/html/index.html.template"
);
const relativeCiWorkflow = readText(".github/workflows/relative-ci.yaml");
const factoryNotes = readText("FACTORY_ASSISTANT.md");
const cardElementSource = readText(
  "src/panels/lovelace/create-element/create-card-element.ts"
);
const machineCardPath = "src/panels/lovelace/cards/fa-machine-card.ts";
const machineCardSource = readOptionalText(machineCardPath);
const andonViewPath = "src/panels/lovelace/cards/fa-andon-view.ts";
const andonViewSource = readOptionalText(andonViewPath);
const kioskPath = "src/panels/lovelace/cards/factory-wallboard-kiosk.ts";
const kioskSource = readOptionalText(kioskPath);

const readBytes = (path) => readFileSync(join(root, path));
const sha256 = (path) =>
  createHash("sha256").update(readBytes(path)).digest("hex");

const requiredTranslationKeys = [
  "aria_label",
  "title",
  "site_line_cell",
  "network_time",
  "mqtt_broker",
  "local_first",
];

assert(readiness, "Missing page-onboarding.industrial_readiness translations");

for (const key of requiredTranslationKeys) {
  assert(
    readiness?.[key],
    `Missing page-onboarding.industrial_readiness.${key} translation`
  );
}

const readinessText = Object.values(readiness ?? {})
  .join(" ")
  .toLowerCase();

for (const phrase of [
  "site",
  "line",
  "cell",
  "ntp",
  "static ip",
  "mosquitto",
  "cloud",
  "analytics",
  "off",
]) {
  assert(
    readinessText.includes(phrase),
    `Missing industrial onboarding phrase: ${phrase}`
  );
}

for (const key of requiredTranslationKeys) {
  assert(
    welcomeSource.includes(`industrial_readiness.${key}`),
    `onboarding-welcome.ts does not render industrial_readiness.${key}`
  );
}

for (const snippet of [
  "<section",
  'class="industrial-readiness"',
  'class="readiness-list"',
]) {
  assert(
    welcomeSource.includes(snippet),
    `onboarding-welcome.ts missing ${snippet}`
  );
}

assert(
  factoryNotes.includes("industrial onboarding readiness panel"),
  "FACTORY_ASSISTANT.md does not document the industrial onboarding readiness panel"
);
assert(
  welcomeSource.includes("restore.upload_backup"),
  "onboarding welcome must keep local backup upload restore available"
);
assert(
  !welcomeSource.includes("Home Assistant Cloud"),
  "onboarding welcome still renders the Home Assistant Cloud restore option"
);
assert(
  !welcomeSource.includes("_restoreBackupCloud"),
  "onboarding welcome still wires cloud backup restore"
);
assert(
  !welcomeSource.includes('restore: "cloud"'),
  "onboarding welcome still starts cloud restore"
);
assert(
  !welcomeLinksSource.includes("showAppDialog"),
  "landing/onboarding welcome links still expose the upstream companion app dialog"
);
assert(
  !welcomeLinksSource.includes("download_app"),
  "landing/onboarding welcome links still render the upstream companion app card"
);
assert(
  !onboardingHostSource.includes("homeassistant://auth-callback") &&
    !onboardingHostSource.includes(".mobileApp="),
  "onboarding host still wires upstream companion app redirect state into welcome links"
);
assert(
  !communityDialogSource.includes("home-assistant.io") &&
    !communityDialogSource.includes("community.home-assistant.io") &&
    !communityDialogSource.includes("@homeassistant") &&
    !communityDialogSource.includes("newsletter.openhomefoundation.org"),
  "community dialog still points at upstream Home Assistant/OHF destinations"
);
assert(
  !communityDialogSource.includes("logo_ohf.svg") &&
    !communityDialogSource.includes("Open Home Foundation Logo"),
  "community dialog still renders an OHF logo"
);
assert(
  communityDialogSource.includes(
    "https://github.com/esaueng/factoryassistant-os"
  ),
  "community dialog must point to the esaueng-owned OS repository/docs"
);
assert(
  pageOnboarding.welcome.forums === "Factory Assistant source",
  "onboarding community dialog source label must be Factory Assistant-branded"
);
assert(
  pageOnboarding.welcome.open_home_newsletter === "Factory Assistant OS docs",
  "onboarding community dialog docs label must be Factory Assistant-branded"
);
assert(
  /Local-first onboarding\s+welcome/.test(factoryNotes),
  "FACTORY_ASSISTANT.md does not document the local-first onboarding welcome cleanup"
);
assert(
  pageOnboarding.help === "Factory Assistant onboarding guide",
  "onboarding footer help label must be Factory Assistant-branded"
);
assert(
  onboardingHostSource.includes(
    "https://github.com/esaueng/factoryassistant-os"
  ),
  "onboarding footer help link must point to the esaueng-owned OS repository/docs"
);
assert(
  !onboardingHostSource.includes(
    "https://www.home-assistant.io/getting-started/onboarding/"
  ),
  "onboarding footer help link still points to upstream Home Assistant docs"
);
assert(
  !onboardingHostSource.includes('import "./onboarding-analytics"') &&
    !onboardingHostSource.includes("<onboarding-analytics"),
  "onboarding host must not render the opt-in analytics screen during first setup"
);

const normalizedOnboardingHost = onboardingHostSource.replace(/\s+/g, " ");
const analyticsPreferencesIndex = normalizedOnboardingHost.indexOf(
  "await setAnalyticsPreferences(this.hass!, {})"
);
const analyticsOnboardingIndex = normalizedOnboardingHost.indexOf(
  "await onboardAnalyticsStep(this.hass!)"
);
assert(
  analyticsPreferencesIndex !== -1 &&
    analyticsOnboardingIndex !== -1 &&
    analyticsPreferencesIndex < analyticsOnboardingIndex,
  "onboarding host must save empty analytics preferences before completing the analytics step"
);
assert(
  /analytics onboarding step\s+skip/.test(factoryNotes),
  "FACTORY_ASSISTANT.md does not document the analytics onboarding step skip"
);

assert(
  landingPageTemplate.includes("<title>Factory Assistant</title>"),
  "landing-page HTML title must be Factory Assistant"
);
assert(
  landingPageTemplate.includes('alt="Factory Assistant"'),
  "landing-page header logo alt text must be Factory Assistant"
);
assert(
  !landingPageTemplate.includes("<title>Home Assistant</title>"),
  "landing-page HTML title still says Home Assistant"
);
assert(
  !landingPageTemplate.includes('alt="Home Assistant"'),
  "landing-page header logo alt text still says Home Assistant"
);
assert(
  sha256("landing-page/public/static/icons/favicon-192x192.png") ===
    sha256("public/static/icons/favicon-192x192.png"),
  "landing-page header PNG must match the Factory Assistant favicon"
);
assert(
  sha256("landing-page/public/static/icons/favicon.ico") ===
    sha256("public/static/icons/favicon.ico"),
  "landing-page favicon.ico must match the Factory Assistant favicon"
);
assert(
  factoryNotes.includes("landing-page header image"),
  "FACTORY_ASSISTANT.md does not document the landing-page header image rebrand"
);
assert(
  landingPageSource.includes("https://github.com/esaueng/factoryassistant-os"),
  "landing-page help link must point to the esaueng-owned OS repository"
);
assert(
  welcomeLinksSource.includes("https://github.com/esaueng/factoryassistant-os"),
  "landing-page welcome link must point to the esaueng-owned OS repository"
);
assert(
  !landingPageSource.includes("https://www.home-assistant.io"),
  "landing-page help link still points to home-assistant.io"
);
assert(
  !welcomeLinksSource.includes("https://www.home-assistant.io"),
  "landing-page welcome link still points to home-assistant.io"
);
assert(
  /landing-page source\s+links/.test(factoryNotes),
  "FACTORY_ASSISTANT.md does not document the landing-page source link rebrand"
);
assert(
  configInfoSource.includes("Factory Assistant is based on Home Assistant."),
  "About page must render canonical upstream attribution"
);
assert(
  configInfoText.includes("Factory Assistant is not affiliated with") &&
    configInfoText.includes("Open Home Foundation"),
  "About page must render the non-affiliation notice"
);
assert(
  configInfoSource.includes("monitoring tool, not a safety device"),
  "About page must render the monitoring-only safety disclaimer"
);
assert(
  configInfoSource.includes(
    "https://github.com/esaueng/factoryassistant-os/blob/main/docs/SAFETY_BOUNDARY.md"
  ),
  "About page must link to the Factory Assistant safety boundary"
);
assert(
  configInfoSource.includes(
    "https://github.com/esaueng/factoryassistant-os/blob/main/docs/LICENSE_COMPLIANCE.md"
  ),
  "About page must link to Factory Assistant open source license guidance"
);
assert(
  configInfoSource.includes('name: "safety_boundary"') &&
    configInfoSource.includes('name: "open_source_licenses"'),
  "About page must expose the required safety and license link items"
);
assert(
  !configInfoSource.includes("/developers/license/") &&
    !configInfoSource.includes("/developers/credits/") &&
    !configInfoSource.includes("/merch") &&
    !configInfoSource.includes("/feature-requests") &&
    !configInfoSource.includes("/issues") &&
    !configInfoSource.includes("/community"),
  "About page still carries upstream Home Assistant/OHF project links"
);
assert(
  !configInfoSource.includes("documentationUrl(this.hass"),
  "About page still derives links from upstream Home Assistant documentation"
);
assert(
  translations.ui.panel.config.info.items.safety_boundary === "Safety boundary",
  "About page safety boundary label must be Factory Assistant-branded"
);
assert(
  translations.ui.panel.config.info.items.open_source_licenses ===
    "Open source licenses",
  "About page open source licenses label must be Factory Assistant-branded"
);
assert(
  /About panel\s+contract/.test(factoryNotes),
  "FACTORY_ASSISTANT.md does not document the About panel contract cleanup"
);

const sidebarSortBlock =
  sidebarSource.match(/const SORT_VALUE_URL_PATHS = \{([\s\S]*?)\};/)?.[1] ??
  "";
const sidebarHiddenBlock =
  sidebarSource.match(
    /const FACTORY_ASSISTANT_HIDDEN_BY_DEFAULT = \[([\s\S]*?)\];/
  )?.[1] ?? "";
assert(
  sidebarSource.includes("FACTORY_ASSISTANT_HIDDEN_BY_DEFAULT") &&
    sidebarHiddenBlock.includes('"map"') &&
    sidebarHiddenBlock.includes('"media-browser"') &&
    sidebarHiddenBlock.includes('"todo"') &&
    sidebarSource.includes("!panelsOrder.includes(panel.url_path)"),
  "Factory Assistant sidebar must hide home-centric map/media/to-do panels by default while allowing explicit opt-in"
);
assert(
  sidebarSortBlock.includes("energy: 1") &&
    sidebarSortBlock.includes("history: 2") &&
    sidebarSortBlock.includes("logbook: 3") &&
    !sidebarSortBlock.includes("map"),
  "Factory Assistant sidebar must prioritize Energy, History, and Logbook without default Map priority"
);
assert(
  /Native plant navigation/.test(factoryNotes),
  "FACTORY_ASSISTANT.md does not document the native plant navigation cleanup"
);

assert(machineCardSource, "Missing native fa-machine-card implementation");
assert(
  machineCardSource.includes('@customElement("fa-machine-card")'),
  "fa-machine-card must register the contract custom element"
);
assert(
  machineCardSource.includes("status_entity") &&
    machineCardSource.includes("oee_entity") &&
    machineCardSource.includes("job_entity") &&
    machineCardSource.includes("maintenance_entity"),
  "fa-machine-card must render status, OEE, job, and maintenance entities"
);
assert(
  machineCardSource.includes("stale_after_intervals") &&
    machineCardSource.includes("offline_after_intervals"),
  "fa-machine-card must implement the frontend contract freshness intervals"
);
assert(
  machineCardSource.includes(
    "Factory Assistant is a monitoring tool, not a safety device."
  ),
  "fa-machine-card must render the monitoring-only safety disclaimer"
);
assert(
  machineCardSource.includes("hass-more-info"),
  "fa-machine-card tap behavior must be detail-only"
);
for (const forbidden of [
  "callService",
  "handleAction",
  "actionHandler",
  "turn_on",
  "turn_off",
  "toggle",
]) {
  assert(
    !machineCardSource.includes(forbidden),
    `fa-machine-card must not expose control/action affordance: ${forbidden}`
  );
}
assert(
  cardElementSource.includes('import "../cards/fa-machine-card";'),
  "create-card-element must import fa-machine-card so custom:fa-machine-card is bundled"
);
assert(
  /Native\s+fa-machine-card/.test(factoryNotes),
  "FACTORY_ASSISTANT.md does not document the native fa-machine-card"
);

assert(andonViewSource, "Missing native fa-andon-view implementation");
assert(
  andonViewSource.includes('@customElement("fa-andon-view")'),
  "fa-andon-view must register the contract custom element"
);
assert(
  andonViewSource.includes("critical") &&
    andonViewSource.includes("warning") &&
    andonViewSource.includes("info"),
  "fa-andon-view must render critical, warning, and info severities"
);
assert(
  andonViewSource.includes("acknowledge_is_bookkeeping") &&
    andonViewSource.includes("safety_alarm_claim_allowed"),
  "fa-andon-view must encode the andon contract safety flags"
);
assert(
  andonViewSource.includes(
    "Factory Assistant is a monitoring tool, not a safety device."
  ) && andonViewSource.includes("Acknowledge is bookkeeping only"),
  "fa-andon-view must render the monitoring-only and acknowledge disclaimer"
);
assert(
  andonViewSource.includes("hass-more-info"),
  "fa-andon-view alert rows must open detail-only more-info"
);
for (const forbidden of [
  "callService",
  "handleAction",
  "actionHandler",
  "turn_on",
  "turn_off",
  "toggle",
  "e-stop",
  "interlock",
]) {
  assert(
    !andonViewSource.includes(forbidden),
    `fa-andon-view must not expose control/safety affordance: ${forbidden}`
  );
}
assert(
  cardElementSource.includes('import "../cards/fa-andon-view";'),
  "create-card-element must import fa-andon-view so custom:fa-andon-view is bundled"
);
assert(
  /Native\s+fa-andon-view/.test(factoryNotes),
  "FACTORY_ASSISTANT.md does not document the native fa-andon-view"
);

assert(kioskSource, "Missing native factory-wallboard-kiosk implementation");
assert(
  kioskSource.includes('@customElement("factory-wallboard-kiosk")'),
  "factory-wallboard-kiosk must register the contract custom element"
);
assert(
  kioskSource.includes("hide_sidebar") &&
    kioskSource.includes("hide_header") &&
    kioskSource.includes("type_scale") &&
    kioskSource.includes("view_only"),
  "factory-wallboard-kiosk must encode the kiosk contract flags"
);
assert(
  kioskSource.includes("factory-assistant-kiosk") &&
    kioskSource.includes("--fa-kiosk-type-scale"),
  "factory-wallboard-kiosk must apply a document-level kiosk mode marker and type scale"
);
assert(
  kioskSource.includes("ha-sidebar") &&
    kioskSource.includes("app-toolbar") &&
    kioskSource.includes("pointer-events: none"),
  "factory-wallboard-kiosk must hide chrome and disable dashboard interaction"
);
assert(
  kioskSource.includes(
    "Factory Assistant is a monitoring tool, not a safety device."
  ),
  "factory-wallboard-kiosk must render the monitoring-only safety disclaimer"
);
for (const forbidden of [
  "callService",
  "handleAction",
  "actionHandler",
  "turn_on",
  "turn_off",
  "e-stop",
  "interlock",
]) {
  assert(
    !kioskSource.includes(forbidden),
    `factory-wallboard-kiosk must not expose control/safety affordance: ${forbidden}`
  );
}
assert(
  cardElementSource.includes('import "../cards/factory-wallboard-kiosk";'),
  "create-card-element must import factory-wallboard-kiosk so custom:factory-wallboard-kiosk is bundled"
);
assert(
  /Native\s+factory-wallboard-kiosk/.test(factoryNotes),
  "FACTORY_ASSISTANT.md does not document the native factory-wallboard-kiosk"
);

for (const secretName of [
  "RELATIVE_CI_KEY_frontend_modern",
  "RELATIVE_CI_KEY_frontend_legacy",
]) {
  assert(
    relativeCiWorkflow.includes(`${secretName}: \${{ secrets.${secretName} }}`),
    `RelativeCI workflow must map ${secretName} into job env`
  );
  assert(
    relativeCiWorkflow.includes(
      `${secretName} is not configured; skipping RelativeCI upload.`
    ),
    `RelativeCI workflow must explain skipped upload when ${secretName} is missing`
  );
}

const relativeCiGuardCount = (
  relativeCiWorkflow.match(/if: \$\{\{ env\.RELATIVE_CI_KEY != '' \}\}/g) || []
).length;
assert(
  relativeCiGuardCount === 2,
  "RelativeCI upload steps must be guarded when RELATIVE_CI_KEY is missing"
);

if (errors.length) {
  stderr.write("Factory Assistant onboarding verification failed:\n");
  for (const error of errors) {
    stderr.write(`- ${error}\n`);
  }
  exit(1);
}

stdout.write("Factory Assistant onboarding verification passed\n");
