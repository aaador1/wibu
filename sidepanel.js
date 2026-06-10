const selectedTextElement = document.querySelector("#selectedText");
const translatedTextElement = document.querySelector("#translatedText");
const sourceLanguageName = document.querySelector("#sourceLanguageName");
const resultLanguageName = document.querySelector("#resultLanguageName");
const clearSelectionButton = document.querySelector("#clearSelectionButton");
const translateButton = document.querySelector("#translateButton");
const tutorialButton = document.querySelector("#tutorialButton");
const mainView = document.querySelector("#mainView");
const fullLogsView = document.querySelector("#fullLogsView");
const tutorialView = document.querySelector("#tutorialView");
const logsList = document.querySelector("#logsList");
const fullLogsList = document.querySelector("#fullLogsList");
const logsCount = document.querySelector("#logsCount");
const fullLogsCount = document.querySelector("#fullLogsCount");
const emptyLogsMessage = document.querySelector("#emptyLogsMessage");
const emptyFullLogsMessage = document.querySelector("#emptyFullLogsMessage");
const fullLogsButton = document.querySelector("#fullLogsButton");
const closeFullLogsButton = document.querySelector("#closeFullLogsButton");
const closeTutorialButton = document.querySelector("#closeTutorialButton");
const clearAllLogsButtons = document.querySelectorAll("[data-clear-all-logs]");
const clearLogsConfirmations = document.querySelectorAll("[data-clear-logs-confirmation]");
const cancelClearLogsButtons = document.querySelectorAll("[data-cancel-clear-logs]");
const confirmClearLogsButtons = document.querySelectorAll("[data-confirm-clear-logs]");
const fromPickerButton = document.querySelector("#fromPickerButton");
const fromPickerMenu = document.querySelector("#fromPickerMenu");
const fromPickerFlag = document.querySelector("#fromPickerFlag");
const fromPickerText = document.querySelector("#fromPickerText");
const toPickerButton = document.querySelector("#toPickerButton");
const toPickerMenu = document.querySelector("#toPickerMenu");
const toPickerFlag = document.querySelector("#toPickerFlag");
const toPickerText = document.querySelector("#toPickerText");
const webBuddyBlob = document.querySelector("#webBuddyBlob");
const wibuStar = document.querySelector("#wibuStar");
const wibuSleep = document.querySelector("#wibuSleep");
const buddyStatus = document.querySelector("#buddyStatus");
const energyMeter = document.querySelector("#energyMeter");
const energyFill = document.querySelector("#energyFill");
const energyTooltip = document.querySelector("#energyTooltip");

let currentSelectedText = "";
let currentResultText = "";
let currentResultStatus = "empty";
let isTranslating = false;
let savedLogs = [];
let isFullLogsOpen = false;
let isTutorialOpen = false;
let selectedFromLanguage;
let selectedToLanguage;
let dailyUsageEstimate = 0;

const SELECTED_TEXT_KEY = "selectedText";
const TRANSLATION_LOGS_KEY = "translationLogs";
const PREFERRED_FROM_LANGUAGE_KEY = "preferredFromLanguageCode";
const PREFERRED_TO_LANGUAGE_KEY = "preferredToLanguageCode";
const WIBU_DAILY_USAGE_KEY = "wibuDailyUsageEstimate";
const WIBU_DAILY_USAGE_DATE_KEY = "wibuDailyUsageDate";
const MAX_RECENT_LOGS = 5;
const WIBU_DAILY_MAX_ESTIMATE = 5000;
const TRANSLATION_ERROR_MESSAGE = "Wibu could not translate this right now. Please try again.";
const SAME_LANGUAGE_MESSAGE = "Please choose two different languages.";
const NO_SELECTION_MESSAGE = "Type or highlight text before translating.";
const WIBU_TIRED_MESSAGE = "Wibu is tired. Come again tomorrow!";
const WIBU_QUOTA_MESSAGE = "Wibu may have reached its daily free translation limit. Please try again later.";

// This version uses MyMemory's free public translation API and does not use paid AI/API services.
const MY_MEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";

const baseLanguages = [
  { code: "en", name: "English", flagPath: "assets/flags/usa.png" },
  { code: "es", name: "Spanish", flagPath: "assets/flags/mexico.png" },
  { code: "de", name: "German", flagPath: "assets/flags/germany.png" },
  { code: "fr", name: "French", flagPath: "assets/flags/france.png" },
  { code: "ar", name: "Arabic", flagPath: "assets/flags/UAE.png" },
  { code: "zh", name: "Chinese", flagPath: "assets/flags/china.png" },
  { code: "hi", name: "Hindi", flagPath: "assets/flags/india.png" },
  { code: "ko", name: "Korean", flagPath: "assets/flags/korea.png" },
  { code: "ja", name: "Japanese", flagPath: "assets/flags/japan.png" },
  { code: "bn", name: "Bengali", flagPath: "assets/flags/bangladesh.png" },
  { code: "pt", name: "Portuguese", flagPath: "assets/flags/portugal.png" },
  { code: "it", name: "Italian", flagPath: "assets/flags/italy.png" },
  { code: "ru", name: "Russian", flagPath: "assets/flags/russia.png" },
  { code: "ur", name: "Urdu", flagPath: "assets/flags/pakistan.png" },
  { code: "uk", name: "Ukrainian", flagPath: "assets/flags/ukraine.png" },
  { code: "fa", name: "Dari/Farsi", flagPath: "assets/flags/afghanistan.png" },
  { code: "uz", name: "Uzbek", flagPath: "assets/flags/uzbekistan.png" },
  { code: "sw", name: "Swahili", flagPath: "assets/flags/tanzania.png" }
];

const fromLanguages = baseLanguages;
const toLanguages = baseLanguages;

// Keep local glossary support available for a later version.
const localGlossary = {};

function hasSelection() {
  return currentSelectedText.length > 0;
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWibuTired() {
  return dailyUsageEstimate >= WIBU_DAILY_MAX_ESTIMATE;
}

function getEnergyUsedPercent() {
  return Math.min(100, Math.round((dailyUsageEstimate / WIBU_DAILY_MAX_ESTIMATE) * 100));
}

function getEnergyLeftPercent() {
  const remaining = Math.max(0, 100 - getEnergyUsedPercent());
  return Math.round(remaining / 5) * 5;
}

function renderEnergyMeter() {
  const usedPercent = getEnergyUsedPercent();
  const leftPercent = getEnergyLeftPercent();
  const tooltipText = `About ${leftPercent}% of Wibu's energy left today`;

  energyFill.style.width = `${usedPercent}%`;
  energyTooltip.textContent = tooltipText;
  energyMeter.setAttribute("aria-valuenow", String(usedPercent));
  energyMeter.setAttribute("aria-valuetext", tooltipText);
  energyMeter.classList.toggle("full", isWibuTired());
  updateTranslateButton();
}

async function persistDailyUsage() {
  await chrome.storage.local.set({
    [WIBU_DAILY_USAGE_KEY]: dailyUsageEstimate,
    [WIBU_DAILY_USAGE_DATE_KEY]: getTodayKey()
  });

  renderEnergyMeter();
}

async function loadDailyUsage() {
  const todayKey = getTodayKey();
  const result = await chrome.storage.local.get([
    WIBU_DAILY_USAGE_KEY,
    WIBU_DAILY_USAGE_DATE_KEY
  ]);

  if (result[WIBU_DAILY_USAGE_DATE_KEY] !== todayKey) {
    dailyUsageEstimate = 0;
    await persistDailyUsage();
    return;
  }

  dailyUsageEstimate = Number(result[WIBU_DAILY_USAGE_KEY]) || 0;
  renderEnergyMeter();

  if (isWibuTired()) {
    updateResultCard(WIBU_TIRED_MESSAGE, "failed");
    setWibuSleeping(WIBU_TIRED_MESSAGE);
  }
}

async function addDailyUsageEstimate(characterCount) {
  dailyUsageEstimate = Math.min(
    WIBU_DAILY_MAX_ESTIMATE,
    dailyUsageEstimate + Math.max(0, characterCount)
  );
  await persistDailyUsage();
}

function createLogId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function findLanguageByCode(code, fallbackLanguage) {
  return baseLanguages.find((language) => language.code === code) || fallbackLanguage;
}

function setBuddyMood(mood, statusText) {
  webBuddyBlob.classList.remove("idle", "thinking", "happy", "sleeping");
  webBuddyBlob.classList.add(mood);
  wibuSleep.classList.toggle("visible", mood === "sleeping");
  buddyStatus.textContent = statusText;
}

function setWibuSleeping(statusText = "Wibu is resting.") {
  setBuddyMood("sleeping", statusText);
}

function returnWibuToIdle(statusText = "Wibu is ready.") {
  if (isWibuTired()) {
    setWibuSleeping("Wibu is resting.");
    return;
  }

  setBuddyMood("idle", statusText);
}

function playWibuStarAnimation() {
  wibuStar.classList.remove("pop");
  void wibuStar.offsetWidth;
  wibuStar.classList.add("pop");
}

function updateTranslateButton() {
  translateButton.disabled = isTranslating || isWibuTired();
  translateButton.textContent = isTranslating
    ? "Wibu is translating..."
    : isWibuTired()
      ? "Wibu is resting"
      : "Translate";
}

function syncSourceTextFromInput() {
  currentSelectedText = selectedTextElement.value.trim();
  selectedTextElement.classList.toggle("empty", !hasSelection());
  updateTranslateButton();
}

function updateSelectedText(text) {
  selectedTextElement.value = text || "";
  syncSourceTextFromInput();
}

function getSourceTextForTranslation() {
  syncSourceTextFromInput();
  return currentSelectedText;
}

function updateResultCard(text, status = "success") {
  currentResultText = text;
  currentResultStatus = status;
  translatedTextElement.textContent = text;
  translatedTextElement.classList.toggle("empty", status === "empty");
  translatedTextElement.classList.toggle("failed", status === "failed");
}

function renderLanguageLabels() {
  sourceLanguageName.textContent = selectedFromLanguage.name;
  resultLanguageName.textContent = selectedToLanguage.name;
}

function renderPickerButton(kind) {
  const language = kind === "from" ? selectedFromLanguage : selectedToLanguage;
  const flag = kind === "from" ? fromPickerFlag : toPickerFlag;
  const text = kind === "from" ? fromPickerText : toPickerText;

  flag.src = language.flagPath;
  flag.alt = "";
  text.textContent = language.name;
  renderLanguageLabels();
}

function closePicker(kind) {
  const menu = kind === "from" ? fromPickerMenu : toPickerMenu;
  const button = kind === "from" ? fromPickerButton : toPickerButton;

  menu.hidden = true;
  button.setAttribute("aria-expanded", "false");
}

function closeAllPickers() {
  closePicker("from");
  closePicker("to");
}

function togglePicker(kind) {
  const menu = kind === "from" ? fromPickerMenu : toPickerMenu;
  const button = kind === "from" ? fromPickerButton : toPickerButton;
  const isOpening = menu.hidden;

  closeAllPickers();

  menu.hidden = !isOpening;
  button.setAttribute("aria-expanded", String(isOpening));
}

async function savePreferredLanguages() {
  await chrome.storage.local.set({
    [PREFERRED_FROM_LANGUAGE_KEY]: selectedFromLanguage.code,
    [PREFERRED_TO_LANGUAGE_KEY]: selectedToLanguage.code
  });
}

function selectLanguage(kind, language) {
  if (kind === "from") {
    selectedFromLanguage = language;
  } else {
    selectedToLanguage = language;
  }

  renderPickerButton(kind);
  closePicker(kind);
  savePreferredLanguages();
}

function createPickerItem(kind, language) {
  const item = document.createElement("button");
  item.className = "language-picker-item";
  item.type = "button";
  item.setAttribute("role", "option");
  item.dataset.code = language.code;

  const flag = document.createElement("img");
  flag.className = "flag-icon";
  flag.src = language.flagPath;
  flag.alt = "";

  const name = document.createElement("span");
  name.textContent = language.name;

  item.append(flag, name);
  item.addEventListener("click", () => selectLanguage(kind, language));

  return item;
}

function renderPickerMenus() {
  fromPickerMenu.textContent = "";
  toPickerMenu.textContent = "";

  fromLanguages.forEach((language) => {
    fromPickerMenu.append(createPickerItem("from", language));
  });

  toLanguages.forEach((language) => {
    toPickerMenu.append(createPickerItem("to", language));
  });

}

async function renderPickers() {
  const result = await chrome.storage.local.get([
    PREFERRED_FROM_LANGUAGE_KEY,
    PREFERRED_TO_LANGUAGE_KEY
  ]);

  selectedFromLanguage = findLanguageByCode(
    result[PREFERRED_FROM_LANGUAGE_KEY],
    fromLanguages[0]
  );
  selectedToLanguage = findLanguageByCode(
    result[PREFERRED_TO_LANGUAGE_KEY],
    toLanguages[1]
  );

  renderPickerMenus();
  renderPickerButton("from");
  renderPickerButton("to");
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function truncateText(text, maxLength = 130) {
  if (!text || text.length <= maxLength) {
    return text || "";
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function createLanguageBadge(flagPath, languageName) {
  const badge = document.createElement("span");
  badge.className = "language-badge";

  const flag = document.createElement("img");
  flag.className = "flag-icon";
  flag.src = flagPath;
  flag.alt = "";

  const name = document.createElement("span");
  name.textContent = languageName;

  badge.append(flag, name);
  return badge;
}

function createLogEntry(log, isCompact = false) {
  const article = document.createElement("article");
  article.className = `log-entry ${log.status === "failed" ? "failed" : ""}`;
  article.tabIndex = 0;

  const deleteButton = document.createElement("button");
  deleteButton.className = "log-delete-button";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", "Delete this log");
  deleteButton.textContent = "\u00d7";
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteLog(log.id);
  });

  const meta = document.createElement("div");
  meta.className = "log-meta";

  const languageRow = document.createElement("div");
  languageRow.className = "log-language-row";
  languageRow.append(
    createLanguageBadge(log.fromFlagPath, log.fromLanguageName),
    document.createTextNode("to"),
    createLanguageBadge(log.toFlagPath, log.toLanguageName)
  );

  const time = document.createElement("span");
  time.className = "log-time";
  time.textContent = formatTime(log.createdAt);

  meta.append(languageRow, time);

  const originalText = document.createElement("p");
  originalText.className = "log-text";
  originalText.textContent = isCompact
    ? truncateText(log.originalText)
    : log.originalText;

  const translatedText = document.createElement("p");
  translatedText.className = "log-text translated";
  translatedText.textContent = isCompact
    ? truncateText(log.translatedText)
    : log.translatedText;

  article.append(deleteButton, meta, originalText, translatedText);
  return article;
}

function renderLogs() {
  logsList.textContent = "";
  fullLogsList.textContent = "";

  logsCount.textContent = `${savedLogs.length} saved`;
  fullLogsCount.textContent = `${savedLogs.length} saved`;
  emptyLogsMessage.hidden = savedLogs.length > 0;
  emptyFullLogsMessage.hidden = savedLogs.length > 0;

  savedLogs.slice(0, MAX_RECENT_LOGS).forEach((log) => {
    logsList.append(createLogEntry(log, true));
  });

  savedLogs.forEach((log) => {
    fullLogsList.append(createLogEntry(log, false));
  });

  fullLogsButton.disabled = savedLogs.length === 0;
  clearAllLogsButtons.forEach((button) => {
    button.disabled = savedLogs.length === 0;
  });

  if (savedLogs.length === 0) {
    hideClearLogsConfirmations();
  }
}

async function persistLogs() {
  await chrome.storage.local.set({
    [TRANSLATION_LOGS_KEY]: savedLogs
  });

  renderLogs();
}

async function saveLog(log) {
  savedLogs = [log, ...savedLogs];
  await persistLogs();
}

async function deleteLog(logId) {
  savedLogs = savedLogs.filter((log) => log.id !== logId);
  await persistLogs();
}

function showClearLogsConfirmation() {
  clearLogsConfirmations.forEach((confirmation) => {
    confirmation.hidden = false;
  });
}

function hideClearLogsConfirmations() {
  clearLogsConfirmations.forEach((confirmation) => {
    confirmation.hidden = true;
  });
}

async function clearAllLogs() {
  savedLogs = [];
  await chrome.storage.local.remove(TRANSLATION_LOGS_KEY);
  hideClearLogsConfirmations();
  renderLogs();
}

function findLanguageFromLegacyName(value, fallbackLanguage) {
  const label = String(value || "").toLowerCase();
  const languages = baseLanguages;

  return languages.find((language) => label.includes(language.name.toLowerCase()))
    || fallbackLanguage;
}

function normalizeLegacyLog(log) {
  if (log.fromLanguageCode && log.toLanguageCode && log.fromLanguageCode !== "auto") {
    return log;
  }

  const fromLanguage = findLanguageFromLegacyName(log.fromLanguage, baseLanguages[0]);
  const toLanguage = findLanguageFromLegacyName(log.toLanguage, baseLanguages[1]);

  return {
    id: log.id || createLogId(),
    originalText: log.originalText || "",
    translatedText: log.translatedText || "",
    fromLanguageCode: fromLanguage.code,
    fromLanguageName: fromLanguage.name,
    fromFlagPath: fromLanguage.flagPath,
    toLanguageCode: toLanguage.code,
    toLanguageName: toLanguage.name,
    toFlagPath: toLanguage.flagPath,
    createdAt: log.createdAt || new Date().toISOString(),
    status: log.status || "success"
  };
}

async function loadLogs() {
  const result = await chrome.storage.local.get(TRANSLATION_LOGS_KEY);
  savedLogs = Array.isArray(result[TRANSLATION_LOGS_KEY])
    ? result[TRANSLATION_LOGS_KEY].map(normalizeLegacyLog)
    : [];

  renderLogs();
}

function isQuotaLimitError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.status === 429
    || message.includes("quota")
    || message.includes("limit")
    || message.includes("daily")
    || message.includes("maximum");
}

async function requestTranslation(sourceCode, sourceText) {
  const url = new URL(MY_MEMORY_ENDPOINT);
  url.searchParams.set("q", sourceText);
  url.searchParams.set("langpair", `${sourceCode}|${selectedToLanguage.code}`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = new Error("The translation service did not respond successfully.");
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  if (data?.responseStatus && data.responseStatus !== 200) {
    throw new Error(data.responseDetails || "The translation service returned an error.");
  }

  const translatedText = data?.responseData?.translatedText?.trim();

  if (!translatedText) {
    throw new Error(data?.responseDetails || "No translation was returned.");
  }

  return translatedText;
}

async function saveTranslationResult(translatedText, status, originalText = currentSelectedText) {
  await saveLog({
    id: createLogId(),
    originalText,
    translatedText,
    fromLanguageCode: selectedFromLanguage.code,
    fromLanguageName: selectedFromLanguage.name,
    fromFlagPath: selectedFromLanguage.flagPath,
    toLanguageCode: selectedToLanguage.code,
    toLanguageName: selectedToLanguage.name,
    toFlagPath: selectedToLanguage.flagPath,
    createdAt: new Date().toISOString(),
    status
  });
}

async function translateSelectedText() {
  if (isTranslating) {
    return;
  }

  const sourceText = getSourceTextForTranslation();

  if (!sourceText) {
    updateResultCard(NO_SELECTION_MESSAGE, "failed");
    returnWibuToIdle(NO_SELECTION_MESSAGE);
    updateTranslateButton();
    return;
  }

  if (isWibuTired()) {
    updateResultCard(WIBU_TIRED_MESSAGE, "failed");
    setWibuSleeping(WIBU_TIRED_MESSAGE);
    updateTranslateButton();
    return;
  }

  if (selectedFromLanguage.code === selectedToLanguage.code) {
    updateResultCard(SAME_LANGUAGE_MESSAGE, "failed");
    await saveTranslationResult(SAME_LANGUAGE_MESSAGE, "failed", sourceText);
    returnWibuToIdle(SAME_LANGUAGE_MESSAGE);
    return;
  }

  isTranslating = true;
  updateTranslateButton();
  updateResultCard("Translating...", "empty");
  setBuddyMood("thinking", "Wibu is translating.");

  try {
    const translatedText = await requestTranslation(selectedFromLanguage.code, sourceText);

    updateResultCard(translatedText, "success");
    await saveTranslationResult(translatedText, "success", sourceText);
    await addDailyUsageEstimate(sourceText.length);
    playWibuStarAnimation();

    if (isWibuTired()) {
      updateResultCard(WIBU_TIRED_MESSAGE, "failed");
      setWibuSleeping(WIBU_TIRED_MESSAGE);
    } else {
      returnWibuToIdle("Wibu finished translating.");
    }
  } catch (error) {
    console.error("MyMemory translation failed:", error);

    const userMessage = isQuotaLimitError(error)
      ? WIBU_QUOTA_MESSAGE
      : TRANSLATION_ERROR_MESSAGE;

    updateResultCard(userMessage, "failed");
    await saveTranslationResult(userMessage, "failed", sourceText);

    if (isQuotaLimitError(error)) {
      dailyUsageEstimate = WIBU_DAILY_MAX_ESTIMATE;
      await persistDailyUsage();
      setWibuSleeping(userMessage);
    } else {
      returnWibuToIdle("Wibu could not translate this right now.");
    }
  } finally {
    isTranslating = false;
    updateTranslateButton();
  }
}

async function loadSelectedText() {
  const result = await chrome.storage.local.get(SELECTED_TEXT_KEY);
  updateSelectedText(result[SELECTED_TEXT_KEY]);
}

function setFullLogsOpen(isOpen) {
  isFullLogsOpen = isOpen;
  if (isOpen) {
    isTutorialOpen = false;
  }

  mainView.hidden = isFullLogsOpen || isTutorialOpen;
  fullLogsView.hidden = !isFullLogsOpen;
  tutorialView.hidden = !isTutorialOpen;
}

function setTutorialOpen(isOpen) {
  isTutorialOpen = isOpen;
  if (isOpen) {
    isFullLogsOpen = false;
  }

  mainView.hidden = isFullLogsOpen || isTutorialOpen;
  fullLogsView.hidden = !isFullLogsOpen;
  tutorialView.hidden = !isTutorialOpen;
}

fromPickerButton.addEventListener("click", () => togglePicker("from"));
toPickerButton.addEventListener("click", () => togglePicker("to"));
selectedTextElement.addEventListener("input", syncSourceTextFromInput);
translateButton.addEventListener("click", translateSelectedText);
tutorialButton.addEventListener("click", () => setTutorialOpen(true));
fullLogsButton.addEventListener("click", () => setFullLogsOpen(true));
closeFullLogsButton.addEventListener("click", () => setFullLogsOpen(false));
closeTutorialButton.addEventListener("click", () => setTutorialOpen(false));

clearAllLogsButtons.forEach((button) => {
  button.addEventListener("click", showClearLogsConfirmation);
});

cancelClearLogsButtons.forEach((button) => {
  button.addEventListener("click", hideClearLogsConfirmations);
});

confirmClearLogsButtons.forEach((button) => {
  button.addEventListener("click", clearAllLogs);
});

clearSelectionButton.addEventListener("click", async () => {
  await chrome.storage.local.remove(["selectedText", "selectedAt"]);
  updateSelectedText("");
  updateResultCard("Your translation will appear here.", "empty");
  returnWibuToIdle();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".language-picker")) {
    closeAllPickers();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllPickers();
    if (isTutorialOpen) {
      setTutorialOpen(false);
    } else if (isFullLogsOpen) {
      setFullLogsOpen(false);
    }
  }
});

// Refresh the selected text preview when the user right-clicks a new webpage selection.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes[SELECTED_TEXT_KEY]) {
    updateSelectedText(changes[SELECTED_TEXT_KEY].newValue);
    returnWibuToIdle();
  }
});

async function initializeWibu() {
  await renderPickers();
  await loadDailyUsage();
  await loadSelectedText();
  await loadLogs();
}

initializeWibu();
