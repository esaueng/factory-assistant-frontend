import { readFileSync } from "node:fs";
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
const factoryNotes = readText("FACTORY_ASSISTANT.md");

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

if (errors.length) {
  stderr.write("Factory Assistant onboarding verification failed:\n");
  for (const error of errors) {
    stderr.write(`- ${error}\n`);
  }
  exit(1);
}

stdout.write("Factory Assistant onboarding verification passed\n");
