const LEVEL_ORDER = ["N5", "N4", "N3", "N2", "N1"];
const VIDEO_ORDER = ["short", "comprehensive"];
const LEVEL_KEY = "dailyJapanese:level";
const VIDEO_KEY = "dailyJapanese:video";

const els = {
  state: document.getElementById("state"),
  stateText: document.getElementById("stateText"),
  stateSpinner: document.querySelector("#state .spinner"),
  retry: document.getElementById("retry"),
  content: document.getElementById("content"),
  today: document.getElementById("today"),
  videoHeading: document.getElementById("videoHeading"),
  videoDesc: document.getElementById("videoDesc"),
  videoModes: document.getElementById("videoModes"),
  videoFrame: document.getElementById("videoFrame"),
  video: document.getElementById("video"),
  videoLoading: document.getElementById("videoLoading"),
  videoTitle: document.getElementById("videoTitle"),
  videoChannel: document.getElementById("videoChannel"),
  videoWatch: document.getElementById("videoWatch"),
  levelTabs: document.getElementById("levelTabs"),
  levelLabel: document.getElementById("levelLabel"),
  kanjiCount: document.getElementById("kanjiCount"),
  kanjiList: document.getElementById("kanjiList"),
  quotePanel: document.getElementById("quotePanel"),
  quoteBadge: document.getElementById("quoteBadge"),
  quoteKanji: document.getElementById("quoteKanji"),
  quoteFurigana: document.getElementById("quoteFurigana"),
  quoteRomaji: document.getElementById("quoteRomaji"),
  quoteTranslation: document.getElementById("quoteTranslation"),
  quoteCharacter: document.getElementById("quoteCharacter"),
  quoteAnime: document.getElementById("quoteAnime"),
};

const state = {
  data: null,
  level: null,
  video: null,
  dayKey: null,
};

let midnightTimer = null;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const toISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dayOfYear = (date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff =
    date -
    start +
    (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60000;
  return Math.floor(diff / 86400000);
};

const readPref = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const savePref = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const createEl = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
};

const setText = (el, value) => {
  el.textContent = value === undefined || value === null || value === "" ? "—" : value;
};

const buildEmbedUrl = (embedUrl) => {
  try {
    const url = new URL(embedUrl, window.location.href);
    url.searchParams.set("rel", "0");
    url.searchParams.set("modestbranding", "1");
    url.searchParams.set("playsinline", "1");
    return url.toString();
  } catch {
    return embedUrl;
  }
};

const getLevels = (data) =>
  LEVEL_ORDER.filter((level) => Array.isArray(data.kanji?.[level]) && data.kanji[level].length > 0);

const getVideoKeys = (data) => {
  const available = Object.keys(data.videos || {});
  const ordered = VIDEO_ORDER.filter((key) => available.includes(key));
  return ordered.concat(available.filter((key) => !VIDEO_ORDER.includes(key)));
};

const renderDate = () => {
  const now = new Date();
  els.today.dateTime = toISODate(now);
  els.today.textContent = dateFormatter.format(now);
};

const syncVideoModes = () => {
  els.videoModes.querySelectorAll(".seg-btn").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.video));
  });
};

const syncLevelTabs = () => {
  els.levelTabs.querySelectorAll(".level-btn").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.level === state.level));
  });
};

const renderVideo = (force = false) => {
  const info = state.data.videos?.[state.video];
  if (!info) return;

  els.videoHeading.textContent = `${info.label || "Video"} hari ini`;
  els.videoDesc.textContent = info.description || "";
  els.videoTitle.textContent = info.title || info.label || "Video pembelajaran";
  els.videoChannel.textContent = info.channel || "";
  els.videoWatch.href = info.watchUrl || info.embedUrl || "#";

  const isShort = state.video === "short";
  els.videoFrame.classList.toggle("is-short", isShort);
  els.videoFrame.classList.toggle("is-wide", !isShort);

  const key = `${state.video}::${info.embedUrl}`;
  if (!force && els.video.dataset.key === key) return;

  els.video.dataset.key = key;
  els.video.title = info.title || "Video pembelajaran";
  els.video.classList.add("is-loading");
  els.videoLoading.hidden = false;
  els.video.src = buildEmbedUrl(info.embedUrl);
};

const createReading = (label, value) => {
  const row = createEl("div", "reading");
  row.append(
    createEl("dt", "reading-label", label),
    createEl("dd", "reading-value", value || "—")
  );
  return row;
};

const renderKanji = () => {
  const list = state.data.kanji?.[state.level] || [];
  els.kanjiList.replaceChildren();
  els.kanjiCount.textContent = String(list.length);
  els.levelLabel.textContent = state.level || "—";

  if (!list.length) {
    els.kanjiList.append(
      createEl("p", "pattern-text", "Belum ada data kanji untuk level ini.")
    );
    return;
  }

  const focusIndex = dayOfYear(new Date()) % list.length;

  list.forEach((item, index) => {
    const card = createEl("article", "kanji-card");
    if (index === focusIndex) card.classList.add("is-focus");

    const head = createEl("div", "kanji-head");
    const char = createEl("span", "kanji-char", item.kanji || "—");
    const info = createEl("div", "kanji-info");
    const titleRow = createEl("div", "kanji-title-row");

    titleRow.append(createEl("span", "kanji-meaning", item.meaning || "—"));
    if (index === focusIndex) {
      titleRow.append(createEl("span", "focus-badge", "Fokus hari ini"));
    }

    info.append(titleRow);
    head.append(char, info);

    const readings = createEl("dl", "readings");
    readings.append(
      createReading("Kun'yomi", item.kunyomi),
      createReading("On'yomi", item.onyomi)
    );

    const pattern = createEl("details", "pattern");
    const summary = document.createElement("summary");
    const chevron = createEl("span", "chevron");
    chevron.setAttribute("aria-hidden", "true");
    summary.append(createEl("span", "pattern-label", "Pattern / radikal breakdown"), chevron);
    pattern.append(
      summary,
      createEl("p", "pattern-text", item.pattern_hint || "Belum ada petunjuk pola.")
    );

    card.append(head, readings, pattern);
    els.kanjiList.append(card);
  });
};

const renderQuote = () => {
  const days = state.data.days;
  const entry = days[dayOfYear(new Date()) % days.length];
  const quote = entry.quote || {};

  setText(els.quoteKanji, quote.kanji);
  setText(els.quoteFurigana, quote.furigana);
  setText(els.quoteRomaji, quote.romaji);
  setText(els.quoteTranslation, quote.translation);

  let anime = "Anime";
  let character = "—";

  if (quote.source && typeof quote.source === "object") {
    anime = quote.source.anime || "Anime";
    character = quote.source.character || "—";
  } else if (typeof quote.source === "string" && quote.source) {
    anime = quote.source;
  }

  els.quoteBadge.textContent = anime;
  els.quoteCharacter.textContent = character;
  els.quoteAnime.textContent = anime;

  els.quotePanel.classList.remove("is-updating");
  void els.quotePanel.offsetWidth;
  els.quotePanel.classList.add("is-updating");
};

const renderAll = () => {
  renderDate();
  syncVideoModes();
  syncLevelTabs();
  renderVideo(true);
  renderKanji();
  renderQuote();
};

const refreshContent = () => {
  if (!state.data) return;
  state.dayKey = toISODate(new Date());
  renderDate();
  renderKanji();
  renderQuote();
};

const scheduleMidnightRefresh = () => {
  if (midnightTimer) window.clearTimeout(midnightTimer);

  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 3);
  const delay = Math.max(1000, next.getTime() - now.getTime());

  midnightTimer = window.setTimeout(() => {
    refreshContent();
    scheduleMidnightRefresh();
  }, delay);
};

const buildVideoModes = (keys) => {
  els.videoModes.replaceChildren();

  keys.forEach((key) => {
    const info = state.data.videos[key];
    const button = createEl("button", "seg-btn", info.label || key);
    button.type = "button";
    button.dataset.mode = key;
    button.setAttribute("aria-pressed", String(state.video === key));
    button.addEventListener("click", () => {
      if (state.video === key) return;
      state.video = key;
      savePref(VIDEO_KEY, key);
      syncVideoModes();
      renderVideo();
    });
    els.videoModes.append(button);
  });
};

const buildLevelTabs = (levels) => {
  els.levelTabs.replaceChildren();

  levels.forEach((level) => {
    const button = createEl("button", "level-btn", level);
    button.type = "button";
    button.dataset.level = level;
    button.setAttribute("aria-pressed", String(state.level === level));
    button.addEventListener("click", () => {
      if (state.level === level) return;
      state.level = level;
      savePref(LEVEL_KEY, level);
      syncLevelTabs();
      renderKanji();
    });
    els.levelTabs.append(button);
  });
};

const setLoadingState = () => {
  els.state.hidden = false;
  els.content.hidden = true;
  els.stateSpinner.hidden = false;
  els.stateText.textContent = "Memuat data harian…";
  els.retry.hidden = true;
};

const showErrorState = () => {
  els.state.hidden = false;
  els.content.hidden = true;
  els.stateSpinner.hidden = true;
  els.stateText.textContent =
    "Data harian gagal dimuat. Pastikan folder ini dibuka lewat server lokal, lalu coba lagi.";
  els.retry.hidden = false;
};

const init = async () => {
  setLoadingState();

  try {
    const response = await fetch("data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data || typeof data !== "object") throw new Error("Format data tidak valid.");
    if (!Array.isArray(data.days) || data.days.length === 0) {
      throw new Error("Data quote harian kosong.");
    }
    if (!data.videos || Object.keys(data.videos).length === 0) {
      throw new Error("Data video tidak ditemukan.");
    }

    const levels = getLevels(data);
    const videoKeys = getVideoKeys(data);
    if (!levels.length) throw new Error("Data kanji tidak ditemukan.");
    if (!videoKeys.length) throw new Error("Data video tidak ditemukan.");

    state.data = data;
    state.dayKey = toISODate(new Date());

    const savedLevel = readPref(LEVEL_KEY);
    const savedVideo = readPref(VIDEO_KEY);
    state.level = levels.includes(savedLevel) ? savedLevel : levels[0];
    state.video = videoKeys.includes(savedVideo) ? savedVideo : videoKeys[0];

    buildVideoModes(videoKeys);
    buildLevelTabs(levels);
    renderAll();

    els.state.hidden = true;
    els.content.hidden = false;
    scheduleMidnightRefresh();
  } catch (error) {
    console.error("Gagal memuat data harian:", error);
    showErrorState();
  }
};

const bindEvents = () => {
  els.retry.addEventListener("click", init);

  els.video.addEventListener("load", () => {
    if (!els.video.dataset.key) return;
    els.videoLoading.hidden = true;
    els.video.classList.remove("is-loading");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (toISODate(new Date()) !== state.dayKey) {
      refreshContent();
      scheduleMidnightRefresh();
    }
  });
};

renderDate();
bindEvents();
init();
