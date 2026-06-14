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
const welcomeLinksSource = readText(
  "src/onboarding/onboarding-welcome-links.ts"
);
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

if (errors.length) {
  stderr.write("Factory Assistant onboarding verification failed:\n");
  for (const error of errors) {
    stderr.write(`- ${error}\n`);
  }
  exit(1);
}

stdout.write("Factory Assistant onboarding verification passed\n");
