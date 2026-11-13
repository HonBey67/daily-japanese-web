const LEVEL_ORDER = ["N5", "N4", "N3", "N2", "N1"];
const VIDEO_ORDER = ["short", "comprehensive"];
const LEVEL_KEY = "dailyJapanese:level";
const VIDEO_KEY = "dailyJapanese:video";
const QUIZ_KEY_PREFIX = "dailyJapanese:quiz:";

const DAILY_KANJI_COUNT = 5;
const DAILY_KANA_COUNT = 5;
const DAILY_GRAMMAR_COUNT = 2;
const MAX_VIDEO_SECONDS = 40 * 60;

/* Seluruh modul harian berganti tepat pukul 00:00 WIB (UTC+7, tanpa DST). */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_DELAY_MS = 3000; // reset di 00:00:03 WIB

// Titik awal hitungan siklus rotasi (1 Januari 2024 WIB).
const ROTATION_EPOCH_DAY = Math.floor(Date.UTC(2024, 0, 1) / DAY_MS);
// Saat siklus berganti, materi dari 6 hari terakhir tidak boleh muncul lagi
// (jika pool cukup besar), jadi 7 hari berturut-turut tetap unik.
const ROTATION_LOOKBACK_DAYS = 6;

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
  videoPlaylist: document.getElementById("videoPlaylist"),
  levelTabs: document.getElementById("levelTabs"),
  levelLabel: document.getElementById("levelLabel"),
  kanjiCount: document.getElementById("kanjiCount"),
  kanjiList: document.getElementById("kanjiList"),
  grammarLevel: document.getElementById("grammarLevel"),
  grammarList: document.getElementById("grammarList"),
  quizScore: document.getElementById("quizScore"),
  quizList: document.getElementById("quizList"),
  quizMessage: document.getElementById("quizMessage"),
  quizReset: document.getElementById("quizReset"),
  quizPercent: document.getElementById("quizPercent"),
  quizMeter: document.getElementById("quizMeter"),
  quizMeterFill: document.getElementById("quizMeterFill"),
  quizSteps: document.getElementById("quizSteps"),
  capri: document.getElementById("capri"),
  capriBubble: document.getElementById("capriBubble"),
  capriText: document.getElementById("capriText"),
  capriMood: document.getElementById("capriMood"),
  capriToggle: document.getElementById("capriToggle"),
  capriClose: document.getElementById("capriClose"),
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
  quizQuestions: [],
  quizResults: [],
  quizValues: [],
};

let midnightTimer = null;

/* =========================================================
   Waktu WIB (UTC+7)
   ========================================================= */

/**
 * Menggeser waktu +7 jam. Nilai hasilnya HANYA dibaca lewat getter UTC
 * (getUTCFullYear, toISOString, dst.), jadi hasilnya sama di zona waktu
 * perangkat mana pun.
 */
const getWIBDate = (date = new Date()) => new Date(date.getTime() + WIB_OFFSET_MS);

// "YYYY-MM-DD" menurut kalender WIB.
const toISODate = (wib) => wib.toISOString().slice(0, 10);

// Hari ke-N dalam tahun (1–366) menurut WIB.
const dayOfYear = (wib) => {
  const today = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
  const start = Date.UTC(wib.getUTCFullYear(), 0, 0);
  return Math.round((today - start) / DAY_MS);
};

// Nomor hari berurutan sejak 1970-01-01 WIB. Naik 1 tepat setiap 00:00 WIB.
const getDayNumber = (wib) => Math.floor(wib.getTime() / DAY_MS);

const msUntilNextWIBMidnight = () => {
  const now = Date.now();
  const nextMidnight = (Math.floor((now + WIB_OFFSET_MS) / DAY_MS) + 1) * DAY_MS - WIB_OFFSET_MS;
  return nextMidnight - now;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/* =========================================================
   Capri, the floating mascot
   ========================================================= */

const CAPRI_ASSET = "assets/capri.svg";
const CAPRI_HIDE_MS = 9000;

const CAPRI_MOODS = {
  idle: "CAPRI://NEURAL_LINK",
  happy: "CAPRI://SUGOI!",
  oops: "CAPRI://CHOOM~",
  think: "CAPRI://CYBERDECK_TIPS",
};

const CAPRI_GREETING =
  "Konnichiwa choom~! Capri udah siapin 5 kanji tajam buat hari ini. Yuk pertajam Neural Link kamu!";

const CAPRI_TIPS = [
  "Ketuk kartu kanji buat buka data: cara baca, arti, dan contoh kalimat. Download ke otak, choom~!",
  "一歩ずつ (ippo zutsu): selangkah demi selangkah. 10 menit tiap hari lebih ampuh daripada maraton sebulan sekali. がんばって!",
  "Tiap 00:00 WIB Capri upload misi baru: kanji, bunpou, video, dan kuis ganti semua. Jangan sampai ketinggalan, choom!",
  "Tips Cyberdeck: pakai です/ます buat orang yang baru dikenal, bentuk kasual buat choom dekat.",
  "Ucapkan contoh kalimatnya keras-keras. Mulut ikut jalan, Neural Link makin cepat nyambung. NOVA!",
  "Perhatiin radikal kanji. Banyak kanji tersusun dari bagian kecil yang udah kamu kenal. SUGOI, kan?",
  "Salah itu cuma error kecil di Neural Link, bukan kegagalan. Catat kana yang keliru, lalu coba lagi besok.",
  "がんばって! Selesaikan 5 soal kuis hari ini buat ngisi SYNC_RATE sampai 100%!",
];

const CAPRI_CORRECT = [
  "SUGOI! Sinyal tersinkron, choom~!",
  "正解 (seikai)! Neural Link kamu makin tajam!",
  "NOVA! Jawaban kamu presisi banget!",
  "いいね (ii ne)! SYNC_RATE naik nih!",
];

const pickFrom = (list) => list[Math.floor(Math.random() * list.length)];

let capriTimer = null;
let capriTipIndex = 0;

const closeCapri = () => {
  if (capriTimer) window.clearTimeout(capriTimer);
  capriTimer = null;
  els.capriBubble.hidden = true;
  els.capriToggle.setAttribute("aria-expanded", "false");
  els.capriToggle.setAttribute("aria-label", "Tampilkan pesan dari Capri");
};

const capriSay = (text, mood = "idle", autoHide = true) => {
  els.capriText.textContent = text;
  els.capriMood.textContent = CAPRI_MOODS[mood] || CAPRI_MOODS.idle;

  // Restart the mood animation even when the mood repeats.
  els.capri.dataset.mood = "idle";
  void els.capri.offsetWidth;
  els.capri.dataset.mood = mood;

  els.capriBubble.hidden = false;
  els.capriToggle.setAttribute("aria-expanded", "true");
  els.capriToggle.setAttribute("aria-label", "Sembunyikan pesan Capri");

  if (capriTimer) window.clearTimeout(capriTimer);
  capriTimer = autoHide ? window.setTimeout(closeCapri, CAPRI_HIDE_MS) : null;
};

const capriNextTip = () => {
  capriTipIndex = (capriTipIndex + 1) % CAPRI_TIPS.length;
  capriSay(CAPRI_TIPS[capriTipIndex], "think");
};

const capriGreet = () => {
  capriTipIndex = dayOfYear(getWIBDate()) % CAPRI_TIPS.length;
  capriSay(CAPRI_GREETING, "idle", true);
};

/* =========================================================
   Helpers
   ========================================================= */

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

const hashString = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed) => {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const seededShuffle = (items, seedText) => {
  const random = mulberry32(hashString(seedText));
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const normalizeAnswer = (value) =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

const checkKanaAnswer = (item, value) => {
  const normalized = normalizeAnswer(value);
  if (!normalized) return false;
  const accepted = [item.romaji, ...(item.alt || [])].map(normalizeAnswer);
  return accepted.includes(normalized);
};

const parseDuration = (value) => {
  if (typeof value !== "string" || !value) return null;
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

/* =========================================================
   Rotasi harian tanpa pengulangan berturut-turut
   ---------------------------------------------------------
   Pool diacak (Mulberry32) sekali per "siklus", lalu dibagi
   menjadi beberapa slot berisi `size` item. Satu slot = satu
   hari, jadi dalam satu siklus tidak ada item yang muncul dua
   kali. Saat siklus berganti, item dari beberapa slot terakhir
   siklus sebelumnya dipindah ke belakang urutan baru, sehingga
   awal siklus baru tetap berbeda dari hari-hari sebelumnya.
   Syarat jaminan beda dari kemarin: pool minimal 2 × size.
   ========================================================= */

const rotationCache = new Map();

const getCycleOrder = (pool, size, seedPrefix, targetCycle) => {
  const perCycle = Math.floor(pool.length / size);
  // Jumlah slot yang "dikunci" di batas siklus; maksimal setengah siklus
  // agar selalu ada cukup item segar untuk mengisi awal siklus baru.
  const lockedSlots = Math.max(1, Math.min(ROTATION_LOOKBACK_DAYS, Math.floor(perCycle / 2)));
  const cacheKey = `${seedPrefix}|${pool.length}|${size}`;
  let entry = rotationCache.get(cacheKey);
  if (!entry || entry.cycle > targetCycle) entry = { cycle: -1, order: null };

  let { cycle, order } = entry;
  while (cycle < targetCycle) {
    cycle += 1;
    const raw = seededShuffle(pool, `${seedPrefix}-cycle-${cycle}`);
    if (order) {
      const recent = new Set(order.slice((perCycle - lockedSlots) * size, perCycle * size));
      order = raw.filter((item) => !recent.has(item)).concat(raw.filter((item) => recent.has(item)));
    } else {
      order = raw;
    }
  }

  rotationCache.set(cacheKey, { cycle, order });
  return order;
};

const getRotationSet = (pool, size, seedPrefix, wib) => {
  if (!pool.length) return [];
  const dayKey = toISODate(wib);

  // Pool terlalu kecil untuk menjamin beda total: acak per tanggal saja.
  if (pool.length < size * 2) {
    return seededShuffle(pool, `${seedPrefix}-${dayKey}`).slice(0, size);
  }

  const perCycle = Math.floor(pool.length / size);
  const dayIndex = Math.max(0, getDayNumber(wib) - ROTATION_EPOCH_DAY);
  const cycle = Math.floor(dayIndex / perCycle);
  const slot = dayIndex % perCycle;
  const order = getCycleOrder(pool, size, seedPrefix, cycle);

  // Urutan tampil di dalam satu hari juga diacak per tanggal.
  return seededShuffle(order.slice(slot * size, slot * size + size), `${seedPrefix}-${dayKey}`);
};

/* =========================================================
   Pemilihan materi harian (berganti 00:00 WIB)
   ========================================================= */

const getLevels = (data) =>
  LEVEL_ORDER.filter((level) => Array.isArray(data.kanji?.[level]) && data.kanji[level].length > 0);

// 5 kanji harian, 100% berbeda dari kemarin (pool >= 10 per level).
const getDailyKanji = (level, wib) =>
  getRotationSet(state.data?.kanji?.[level] || [], DAILY_KANJI_COUNT, `kanji-${level}`, wib);

// 2 bunpou harian, 100% berbeda dari kemarin (pool >= 4 per level).
const getDailyGrammar = (level, wib) =>
  getRotationSet(state.data?.grammar?.[level] || [], DAILY_GRAMMAR_COUNT, `grammar-${level}`, wib);

// Kuis kana: 5 soal per hari (4 Hiragana + 1 Katakana), semuanya beda dari kemarin.
const getDailyKana = (wib) => {
  const pool = state.data?.kana || [];
  if (pool.length <= DAILY_KANA_COUNT) return [...pool];

  const hiragana = pool.filter((item) => item.type !== "Katakana");
  const katakana = pool.filter((item) => item.type === "Katakana");

  let picked;
  if (hiragana.length && katakana.length) {
    const kataCount = 1;
    picked = [
      ...getRotationSet(hiragana, DAILY_KANA_COUNT - kataCount, "kana-hiragana", wib),
      ...getRotationSet(katakana, kataCount, "kana-katakana", wib),
    ];
  } else {
    picked = getRotationSet(pool, DAILY_KANA_COUNT, "kana", wib);
  }

  return seededShuffle(picked, `kana-order-${toISODate(wib)}`);
};

// Quote: berurutan per nomor hari WIB, jadi N quote = N hari tanpa pengulangan.
const getDailyQuote = (wib) => {
  const days = state.data?.days || [];
  return days.length ? days[getDayNumber(wib) % days.length] : null;
};

/**
 * Mode video di data.json boleh berbentuk:
 *   { label, description, items: [ {videoId, title, channel, duration, ...} ] }
 *   [ {...}, {...} ]               (array video)
 *   { embedUrl, title, ... }       (format lama: satu video)
 */
const getVideoMode = (key) => {
  const raw = state.data?.videos?.[key];
  if (!raw) return { label: key, description: "", items: [] };

  let items;
  if (Array.isArray(raw)) items = raw;
  else if (Array.isArray(raw.items)) items = raw.items;
  else items = [raw];

  items = items
    .filter((video) => video && (video.videoId || video.embedUrl))
    .filter((video) => {
      const seconds = parseDuration(video.duration);
      return seconds === null || seconds < MAX_VIDEO_SECONDS;
    });

  return {
    label: raw.label || items[0]?.label || key,
    description: raw.description || items[0]?.description || "",
    items,
  };
};

const getVideoKeys = (data) => {
  const available = Object.keys(data.videos || {});
  const ordered = VIDEO_ORDER.filter((key) => available.includes(key));
  return ordered
    .concat(available.filter((key) => !VIDEO_ORDER.includes(key)))
    .filter((key) => getVideoMode(key).items.length > 0);
};

const resolveVideo = (key, video, mode) => {
  const id = video.videoId;
  return {
    ...video,
    label: mode.label,
    description: mode.description,
    embedUrl: video.embedUrl || `https://www.youtube.com/embed/${id}`,
    watchUrl:
      video.watchUrl ||
      (key === "short" ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`),
  };
};

// Pasangan video harian (Short + Comprehensive), masing-masing berbeda dari kemarin.
const getDailyVideo = (wib) => {
  const pair = {};
  getVideoKeys(state.data).forEach((key) => {
    const mode = getVideoMode(key);
    const [video] = getRotationSet(mode.items, 1, `video-${key}`, wib);
    if (video) pair[key] = resolveVideo(key, video, mode);
  });
  return pair;
};

/* =========================================================
   Penyimpanan kuis
   ========================================================= */

const getQuizKey = (dateKey) => `${QUIZ_KEY_PREFIX}${dateKey}`;

const loadQuizProgress = (dateKey, questions) => {
  try {
    const raw = localStorage.getItem(getQuizKey(dateKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.results) || parsed.results.length !== questions.length) return null;
    // Progres hanya dipakai jika daftar soalnya sama persis. Data lama tanpa
    // daftar soal, atau soal yang berubah karena data.json diperbarui, diabaikan.
    if (
      !Array.isArray(parsed.kana) ||
      parsed.kana.join("|") !== questions.map((item) => item.kana).join("|")
    ) {
      return null;
    }
    const results = parsed.results.map((value) =>
      value === true ? true : value === false ? false : null
    );
    const values = Array.isArray(parsed.values) ? parsed.values : [];
    return {
      results,
      values: results.map((_, index) =>
        typeof values[index] === "string" ? values[index] : ""
      ),
    };
  } catch {
    return null;
  }
};

const saveQuizProgress = (dateKey) => {
  try {
    localStorage.setItem(
      getQuizKey(dateKey),
      JSON.stringify({
        date: dateKey,
        kana: state.quizQuestions.map((item) => item.kana),
        results: state.quizResults,
        values: state.quizValues,
      })
    );
  } catch {
    return;
  }
};

/* =========================================================
   Render
   ========================================================= */

const renderDate = () => {
  const now = new Date();
  els.today.dateTime = toISODate(getWIBDate(now));
  els.today.textContent = `${dateFormatter.format(now)} WIB`;
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
  const info = getDailyVideo(getWIBDate())[state.video];
  if (!info) return;

  els.videoHeading.textContent = `${info.label || "Video"} hari ini`;
  els.videoDesc.textContent = info.description || "Video";
  els.videoTitle.textContent = info.title || info.label || "Video pembelajaran";
  els.videoChannel.textContent = [info.channel, info.duration, info.level]
    .filter(Boolean)
    .join(" · ");
  els.videoWatch.href = info.watchUrl || info.embedUrl || "#";

  if (info.playlistUrl) {
    els.videoPlaylist.href = info.playlistUrl;
    els.videoPlaylist.textContent = `${info.playlistLabel || "Playlist"} ↗`;
    els.videoPlaylist.hidden = false;
  } else {
    els.videoPlaylist.hidden = true;
    els.videoPlaylist.removeAttribute("href");
  }

  const isShort = state.video === "short";
  els.videoFrame.classList.toggle("is-short", isShort);
  els.videoFrame.classList.toggle("is-wide", !isShort);

  // Iframe dimuat ulang setiap kali video harian (atau mode) berganti.
  const key = `${state.video}::${info.embedUrl}`;
  if (!force && els.video.dataset.key === key) return;

  els.video.dataset.key = key;
  els.video.title = info.title || "Video pembelajaran";
  els.video.classList.add("is-loading");
  els.videoLoading.hidden = false;
  els.video.src = buildEmbedUrl(info.embedUrl);
};

const createReadingCell = (label, value) => {
  const cell = createEl("span", "flashcard-reading");
  cell.append(
    createEl("span", "flashcard-reading-label", label),
    createEl("span", "flashcard-reading-value", value || "—")
  );
  return cell;
};

const createFlashcard = (item, index, focusIndex) => {
  const button = createEl("button", "flashcard");
  button.type = "button";
  button.setAttribute("aria-pressed", "false");
  button.setAttribute(
    "aria-label",
    `Kanji ${item.kanji || ""}, ${item.meaning || ""}. Ketuk untuk membalik kartu.`
  );
  if (index === focusIndex) button.classList.add("is-focus");

  const inner = createEl("span", "flashcard-inner");
  const front = createEl("span", "flashcard-face flashcard-front");
  const back = createEl("span", "flashcard-face flashcard-back");

  if (index === focusIndex) {
    front.append(createEl("span", "flashcard-badge", "Fokus hari ini"));
  }

  front.append(
    createEl("span", "flashcard-index", `${String(index + 1).padStart(2, "0")} / ${state.level}`),
    createEl("span", "flashcard-kanji", item.kanji || "—"),
    createEl("span", "flashcard-hint", "Ketuk untuk membalik")
  );

  const head = createEl("span", "flashcard-back-head");
  const headInfo = createEl("span", "flashcard-back-info");
  headInfo.append(
    createEl("span", "flashcard-back-meaning", item.meaning || "—"),
    createEl("span", "flashcard-back-level", state.level)
  );
  head.append(createEl("span", "flashcard-back-kanji", item.kanji || "—"), headInfo);

  const readings = createEl("span", "flashcard-reading-grid");
  readings.append(
    createReadingCell("Kun'yomi · ひらがな", item.kunyomi),
    createReadingCell("On'yomi · カタカナ", item.onyomi)
  );

  const example = item.example || {};
  const exampleBlock = createEl("span", "flashcard-example");
  exampleBlock.append(
    createEl("span", "example-label", "Contoh kalimat"),
    createEl("span", "example-jp", example.japanese || "—"),
    createEl("span", "example-reading", example.reading || "—"),
    createEl("span", "example-meaning", example.meaning || "—")
  );

  const pattern = createEl("span", "flashcard-pattern");
  pattern.append(
    createEl("span", "example-label", "Pattern / radikal"),
    createEl("span", "pattern-text", item.pattern_hint || "—")
  );

  // The back face clips to the HUD shape; scrolling happens in an inner layer
  // so the neon frame stays fixed while long examples scroll.
  const scroll = createEl("span", "flashcard-scroll");
  scroll.append(head, readings, exampleBlock, pattern);
  back.append(scroll);
  inner.append(front, back);
  button.append(inner);

  button.addEventListener("click", () => {
    const flipped = button.classList.toggle("is-flipped");
    button.setAttribute("aria-pressed", String(flipped));
    button.setAttribute(
      "aria-label",
      flipped
        ? `Kembali ke sisi depan kanji ${item.kanji || ""}.`
        : `Kanji ${item.kanji || ""}, ${item.meaning || ""}. Ketuk untuk membalik kartu.`
    );
    if (flipped) {
      capriSay(
        `Data masuk, choom~! ${item.kanji || "—"} = ${item.meaning || "—"}. Kun'yomi: ${item.kunyomi || "—"} · On'yomi: ${item.onyomi || "—"}. Coba baca contoh kalimatnya, SUGOI!`,
        "think"
      );
    }
  });

  return button;
};

const renderKanji = () => {
  const list = getDailyKanji(state.level, getWIBDate());
  els.kanjiList.replaceChildren();
  els.kanjiCount.textContent = String(list.length);
  els.levelLabel.textContent = state.level || "—";

  if (!list.length) {
    els.kanjiList.append(
      createEl("p", "hint-text", "Belum ada data kanji untuk level ini.")
    );
    return;
  }

  // Set kanji sudah diacak per hari, jadi kartu pertama selalu menjadi fokus.
  list.forEach((item, index) => {
    els.kanjiList.append(createFlashcard(item, index, 0));
  });
};

const createCapriBadge = () => {
  const img = document.createElement("img");
  img.className = "capri-badge";
  img.src = CAPRI_ASSET;
  img.alt = "";
  img.width = 26;
  img.height = 26;
  img.decoding = "async";
  return img;
};

const createExampleBlock = (label, sub, data, variant) => {
  const block = createEl("div", `example-block example-block--${variant}`);
  const tag = createEl(
    "span",
    variant === "casual" ? "example-tag example-tag--casual" : "example-tag"
  );
  tag.append(
    createCapriBadge(),
    createEl("span", "", label),
    createEl("span", "example-tag-sub", sub)
  );
  block.append(
    tag,
    createEl("p", "example-jp", data?.japanese || "—"),
    createEl("p", "example-reading", data?.reading || "—"),
    createEl("p", "example-meaning", data?.meaning || "—")
  );
  return block;
};

const renderGrammar = () => {
  const daily = getDailyGrammar(state.level, getWIBDate());
  els.grammarLevel.textContent = state.level || "—";
  els.grammarList.replaceChildren();

  if (!daily.length) {
    els.grammarList.append(
      createEl("p", "hint-text", "Belum ada materi bunpou untuk level ini.")
    );
    return;
  }

  daily.forEach((item, index) => {
    const card = createEl("article", "grammar-card hud");
    const details = createEl("details", "grammar-details");
    details.open = index === 0;

    const summary = createEl("summary", "grammar-summary");
    const body = createEl("span", "grammar-body");
    body.append(
      createEl("span", "grammar-title", item.title || "—"),
      createEl("code", "grammar-pattern", item.pattern || "—")
    );
    summary.append(
      createEl("span", "grammar-number", String(index + 1).padStart(2, "0")),
      body,
      createEl("span", "grammar-chevron")
    );
    summary.querySelector(".grammar-chevron").setAttribute("aria-hidden", "true");

    const examples = createEl("div", "grammar-examples");
    examples.append(
      createExampleBlock("Sopan", "です/ます", item.formal, "formal"),
      createExampleBlock("Kasual", "普通形", item.casual, "casual")
    );

    const content = createEl("div", "grammar-content");
    content.append(
      createEl("p", "grammar-explanation", item.explanation || "—"),
      examples
    );

    details.append(summary, content);
    card.append(details);
    els.grammarList.append(card);
  });
};

const renderQuizMeter = (correct, total) => {
  const percent = total ? Math.round((correct / total) * 100) : 0;
  els.quizMeterFill.style.width = `${percent}%`;
  els.quizPercent.textContent = `${percent}%`;
  els.quizMeter.setAttribute("aria-valuemax", String(total));
  els.quizMeter.setAttribute("aria-valuenow", String(correct));
  els.quizMeter.setAttribute("aria-valuetext", `${correct} dari ${total} benar`);

  els.quizSteps.replaceChildren(
    ...state.quizResults.map((result, index) => {
      const step = createEl("li", "hud-step", String(index + 1).padStart(2, "0"));
      if (result === true) step.classList.add("is-correct");
      if (result === false) step.classList.add("is-wrong");
      return step;
    })
  );
};

const updateQuizScore = () => {
  const total = state.quizQuestions.length;
  const answered = state.quizResults.filter((value) => value !== null).length;
  const correct = state.quizResults.filter((value) => value === true).length;

  els.quizScore.textContent = `${correct} / ${total}`;
  renderQuizMeter(correct, total);

  if (!total) {
    els.quizMessage.textContent = "Data kuis belum tersedia.";
    return;
  }

  if (answered === total) {
    const suffix =
      correct === total
        ? "Luar biasa!"
        : correct >= Math.ceil(total * 0.6)
          ? "Bagus, terus berlatih!"
          : "Tidak apa-apa, ulangi besok!";
    els.quizMessage.textContent = `Skor akhir: ${correct} dari ${total}. ${suffix}`;
    return;
  }

  if (answered > 0) {
    els.quizMessage.textContent = `Terjawab ${answered} dari ${total} · Benar ${correct}.`;
    return;
  }

  els.quizMessage.textContent = "Belum ada jawaban.";
};

// Hasil jawaban: status, romaji, dan ARTI kata dalam Bahasa Indonesia.
const renderQuizFeedback = (feedback, item, correct) => {
  feedback.classList.remove("is-correct", "is-wrong");
  feedback.classList.add(correct ? "is-correct" : "is-wrong");

  const status = createEl(
    "span",
    "quiz-result-status",
    correct ? "BENAR ✓" : "SALAH ✗"
  );

  const romaji = createEl("span", "quiz-result-row");
  romaji.append(
    createEl("span", "quiz-result-label", "Romaji"),
    createEl("span", "quiz-result-value quiz-result-romaji", item.romaji || "—")
  );

  const meaning = createEl("span", "quiz-result-row");
  meaning.append(
    createEl("span", "quiz-result-label", "Arti"),
    createEl("span", "quiz-result-value quiz-result-meaning", item.meaning || "—")
  );

  feedback.replaceChildren(status, romaji, meaning);
};

const renderQuiz = () => {
  const wib = getWIBDate();
  const dateKey = toISODate(wib);
  const questions = getDailyKana(wib);
  const saved = loadQuizProgress(dateKey, questions);

  state.quizQuestions = questions;
  state.quizResults = saved ? saved.results : new Array(questions.length).fill(null);
  state.quizValues = saved ? saved.values : new Array(questions.length).fill("");

  els.quizList.replaceChildren();

  if (!questions.length) {
    els.quizList.append(createEl("p", "hint-text", "Data kuis belum tersedia."));
    updateQuizScore();
    return;
  }

  questions.forEach((item, index) => {
    const itemEl = createEl("div", "quiz-item hud");
    const question = createEl("div", "quiz-question");
    question.append(
      createEl("span", "quiz-number", String(index + 1).padStart(2, "0")),
      createEl("span", "quiz-kana", item.kana || "—"),
      createEl("span", "quiz-type", item.type || "Kana")
    );

    const form = createEl("form", "quiz-form");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "quiz-input";
    input.placeholder = "Tulis romaji…";
    input.autocomplete = "off";
    input.autocapitalize = "none";
    input.spellcheck = false;
    input.setAttribute("aria-label", `Jawaban romaji untuk ${item.kana || "kana"}`);

    const submit = createEl("button", "quiz-submit", "SUBMIT_DATA [ENTER]");
    submit.type = "submit";
    submit.setAttribute("aria-label", `Kirim jawaban untuk ${item.kana || "kana"}`);

    const feedback = createEl("div", "quiz-feedback");
    feedback.setAttribute("aria-live", "polite");

    form.append(input, submit);

    const savedResult = state.quizResults[index];
    if (savedResult !== null) {
      input.value = state.quizValues[index] || "";
      input.disabled = true;
      submit.disabled = true;
      itemEl.classList.add(savedResult ? "is-correct" : "is-wrong");
      renderQuizFeedback(feedback, item, savedResult);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (state.quizResults[index] !== null) return;

      const value = input.value.trim();
      if (!value) {
        feedback.classList.remove("is-correct");
        feedback.classList.add("is-wrong");
        feedback.textContent = "Tulis jawaban dulu.";
        input.focus();
        return;
      }

      const correct = checkKanaAnswer(item, value);
      state.quizResults[index] = correct;
      state.quizValues[index] = value;

      input.value = value;
      input.disabled = true;
      submit.disabled = true;
      itemEl.classList.remove("is-correct", "is-wrong");
      itemEl.classList.add(correct ? "is-correct" : "is-wrong");
      renderQuizFeedback(feedback, item, correct);

      saveQuizProgress(dateKey);
      updateQuizScore();

      const total = state.quizQuestions.length;
      const answeredCount = state.quizResults.filter((v) => v !== null).length;
      const meaningText = item.meaning || "—";

      if (answeredCount === total) {
        const score = state.quizResults.filter((v) => v === true).length;
        const percent = Math.round((score / total) * 100);
        if (score === total) {
          capriSay(
            "Wahhh SUGOUII~! SYNC_RATE kamu 100%! Capri bangga banget sama kamu, choom! 💖",
            "happy"
          );
        } else {
          capriSay(
            `Daijoubu yo~! Salah itu cuma error kecil di Neural Link. SYNC_RATE kamu ${percent}% (${score}/${total}). Kita coba lagi besok ya, semangat! ✨`,
            "oops"
          );
        }
      } else if (correct) {
        capriSay(
          `${pickFrom(CAPRI_CORRECT)} ${item.kana} = ${item.romaji} = "${meaningText}".`,
          "happy"
        );
      } else {
        capriSay(
          `Daijoubu yo~! Salah itu cuma error kecil di Neural Link. ${item.kana} dibaca "${item.romaji}", artinya "${meaningText}". がんばって!`,
          "oops"
        );
      }
    });

    itemEl.append(question, form, feedback);
    els.quizList.append(itemEl);
  });

  updateQuizScore();
};

const renderQuote = () => {
  const entry = getDailyQuote(getWIBDate());
  const quote = entry?.quote || {};

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
  renderGrammar();
  renderQuiz();
  renderQuote();
};

// Dipanggil saat tanggal WIB berganti: seluruh modul harian dirender ulang.
const refreshContent = () => {
  if (!state.data) return;
  state.dayKey = toISODate(getWIBDate());
  renderDate();
  renderVideo();
  renderKanji();
  renderGrammar();
  renderQuiz();
  renderQuote();
  capriSay(
    "Misi baru udah ke-upload, choom~! Kanji, bunpou, video, dan kuis hari ini fresh semua. Yuk sync lagi! NOVA!",
    "idle"
  );
};

const scheduleMidnightRefresh = () => {
  if (midnightTimer) window.clearTimeout(midnightTimer);

  // 00:00:03 WIB, agar tanggal WIB pasti sudah berganti.
  const delay = Math.max(1000, msUntilNextWIBMidnight() + REFRESH_DELAY_MS);

  midnightTimer = window.setTimeout(() => {
    refreshContent();
    scheduleMidnightRefresh();
  }, delay);
};

const buildVideoModes = (keys) => {
  els.videoModes.replaceChildren();

  keys.forEach((key) => {
    const button = createEl("button", "seg-btn", getVideoMode(key).label);
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
      renderGrammar();
      capriSay(`Level ${level} aktif, choom~! Kanji dan bunpou udah di-upload ke Neural Link kamu. SUGOI!`, "happy");
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

    // Data baru = objek baru; cache rotasi lama tidak berlaku lagi.
    rotationCache.clear();
    state.data = data;

    const levels = getLevels(data);
    const videoKeys = getVideoKeys(data);
    if (!levels.length) throw new Error("Data kanji tidak ditemukan.");
    if (!videoKeys.length) throw new Error("Data video tidak ditemukan.");

    state.dayKey = toISODate(getWIBDate());

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
    capriGreet();
  } catch (error) {
    console.error("Gagal memuat data harian:", error);
    state.data = null;
    showErrorState();
  }
};

const bindEvents = () => {
  els.retry.addEventListener("click", init);

  els.quizReset.addEventListener("click", () => {
    try {
      localStorage.removeItem(getQuizKey(toISODate(getWIBDate())));
    } catch {
      return;
    }
    renderQuiz();
    capriSay("Kuis di-reset, choom~! Ayo sync ulang dari soal pertama. がんばって!", "idle");
  });

  els.capriToggle.addEventListener("click", () => {
    if (els.capriBubble.hidden) capriNextTip();
    else closeCapri();
  });

  els.capriClose.addEventListener("click", closeCapri);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.capriBubble.hidden) closeCapri();
  });

  els.video.addEventListener("load", () => {
    if (!els.video.dataset.key) return;
    els.videoLoading.hidden = true;
    els.video.classList.remove("is-loading");
  });

  // Tab yang tertidur bisa melewatkan timer; cek ulang saat tab kembali aktif.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (toISODate(getWIBDate()) !== state.dayKey) {
      refreshContent();
      scheduleMidnightRefresh();
    }
  });
};

renderDate();
bindEvents();
init();
