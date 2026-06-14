import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { exit, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (path) => readFileSync(join(root, path), "utf8");

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
const landingPageSource = readText("landing-page/src/ha-landing-page.ts");
const landingPageTemplate = readText(
  "landing-page/src/html/index.html.template"
);
const factoryNotes = readText("FACTORY_ASSISTANT.md");

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

if (errors.length) {
  stderr.write("Factory Assistant onboarding verification failed:\n");
  for (const error of errors) {
    stderr.write(`- ${error}\n`);
  }
  exit(1);
}

stdout.write("Factory Assistant onboarding verification passed\n");
