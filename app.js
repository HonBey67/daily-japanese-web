const LEVEL_ORDER = ["N5", "N4", "N3", "N2", "N1"];
const VIDEO_ORDER = ["short", "comprehensive"];
const LEVEL_KEY = "dailyJapanese:level";
const VIDEO_KEY = "dailyJapanese:video";
const QUIZ_KEY_PREFIX = "dailyJapanese:quiz:";

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

/* ---------- Capri, the floating mascot ---------- */

const CAPRI_ASSET = "assets/capri.svg";
const CAPRI_HIDE_MS = 9000;

const CAPRI_MOODS = {
  idle: "CAPRI://ONLINE",
  happy: "CAPRI://すごい!",
  oops: "CAPRI://大丈夫",
  think: "CAPRI://TIPS",
};

const CAPRI_TIPS = [
  "おはよう! Hari ini ada 5 kanji baru. Ketuk kartunya untuk melihat cara baca dan contoh kalimat.",
  "一歩ずつ (ippo zutsu): selangkah demi selangkah. Belajar 10 menit tiap hari lebih kuat daripada maraton sebulan sekali.",
  "継続は力なり (keizoku wa chikara nari): ketekunan adalah kekuatan. Datang lagi besok, ya!",
  "Tips Capri: pakai です/ます untuk orang yang baru dikenal, bentuk kasual untuk teman dekat.",
  "Ucapkan contoh kalimatnya dengan suara keras. Otak lebih cepat ingat kalau mulut ikut bekerja.",
  "Perhatikan radikal kanji. Banyak kanji tersusun dari bagian kecil yang sudah kamu kenal.",
  "Salah itu data, bukan kegagalan. Catat kana yang keliru, lalu ulangi kuis besok.",
  "がんばって! Selesaikan 5 soal kuis hari ini untuk mengisi SYNC_RATE sampai 100%.",
];

const CAPRI_CORRECT = [
  "正解 (seikai)! Jawabanmu benar, sinyal tersinkron.",
  "すごい! Kana-mu makin lancar.",
  "いいね (ii ne)! Lanjut ke soal berikutnya.",
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
  capriTipIndex = dayOfYear(new Date()) % CAPRI_TIPS.length;
  capriSay(CAPRI_TIPS[capriTipIndex], "idle", true);
};

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

const getLevels = (data) =>
  LEVEL_ORDER.filter((level) => Array.isArray(data.kanji?.[level]) && data.kanji[level].length > 0);

const getVideoKeys = (data) => {
  const available = Object.keys(data.videos || {});
  const ordered = VIDEO_ORDER.filter((key) => available.includes(key));
  return ordered.concat(available.filter((key) => !VIDEO_ORDER.includes(key)));
};

const getDailyKana = (date) => {
  const pool = state.data?.kana || [];
  if (pool.length <= 5) return [...pool];

  const seed = `kana-${date.getFullYear()}-${dayOfYear(date)}`;
  const picked = seededShuffle(pool, seed).slice(0, 5);

  if (!picked.some((item) => item.type === "Katakana")) {
    const katakana = pool.filter((item) => item.type === "Katakana");
    if (katakana.length) picked[picked.length - 1] = seededShuffle(katakana, `${seed}-k`)[0];
  }

  if (!picked.some((item) => item.type === "Hiragana")) {
    const hiragana = pool.filter((item) => item.type === "Hiragana");
    if (hiragana.length) picked[picked.length - 1] = seededShuffle(hiragana, `${seed}-h`)[0];
  }

  return seededShuffle(picked, `${seed}-order`);
};

const getDailyGrammar = (level, date) => {
  const list = state.data?.grammar?.[level] || [];
  if (list.length <= 2) return [...list];
  const start = dayOfYear(date) % list.length;
  return [list[start], list[(start + 1) % list.length]];
};

const getQuizKey = (dateKey) => `${QUIZ_KEY_PREFIX}${dateKey}`;

const loadQuizProgress = (dateKey, count) => {
  try {
    const raw = localStorage.getItem(getQuizKey(dateKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.results) || parsed.results.length !== count) return null;
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
        results: state.quizResults,
        values: state.quizValues,
      })
    );
  } catch {
    return;
  }
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
        `${item.kanji || "—"} = ${item.meaning || "—"}. Kun'yomi: ${item.kunyomi || "—"} · On'yomi: ${item.onyomi || "—"}. Coba baca contoh kalimatnya!`,
        "think"
      );
    }
  });

  return button;
};

const renderKanji = () => {
  const list = state.data.kanji?.[state.level] || [];
  els.kanjiList.replaceChildren();
  els.kanjiCount.textContent = String(list.length);
  els.levelLabel.textContent = state.level || "—";

  if (!list.length) {
    els.kanjiList.append(
      createEl("p", "hint-text", "Belum ada data kanji untuk level ini.")
    );
    return;
  }

  const focusIndex = dayOfYear(new Date()) % list.length;
  list.forEach((item, index) => {
    els.kanjiList.append(createFlashcard(item, index, focusIndex));
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
  const daily = getDailyGrammar(state.level, new Date());
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

// Result block shown after an answer: status, romaji, and the Indonesian meaning.
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
  const now = new Date();
  const dateKey = toISODate(now);
  const questions = getDailyKana(now);
  const saved = loadQuizProgress(dateKey, questions.length);

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
        feedback.classList.remove("is-correct", "is-wrong");
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
      if (answeredCount === total) {
        const score = state.quizResults.filter((v) => v === true).length;
        capriSay(
          score === total
            ? `パーフェクト! ${score}/${total} benar. SYNC_RATE 100%, kamu luar biasa!`
            : `Kuis selesai: ${score}/${total} benar. Kana yang salah kita ulangi besok, がんばって!`,
          score === total ? "happy" : "think"
        );
      } else if (correct) {
        capriSay(
          `${pickFrom(CAPRI_CORRECT)} ${item.kana} = ${item.romaji} = "${item.meaning || "—"}".`,
          "happy"
        );
      } else {
        capriSay(
          `大丈夫 (daijoubu)! ${item.kana} dibaca "${item.romaji}", artinya "${item.meaning || "—"}". Ucapkan pelan-pelan.`,
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
  renderGrammar();
  renderQuiz();
  renderQuote();
};

const refreshContent = () => {
  if (!state.data) return;
  state.dayKey = toISODate(new Date());
  renderDate();
  renderKanji();
  renderGrammar();
  renderQuiz();
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
      renderGrammar();
      capriSay(`Level ${level} aktif! Kanji dan bunpou sudah diperbarui untukmu.`, "happy");
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
    capriGreet();
  } catch (error) {
    console.error("Gagal memuat data harian:", error);
    showErrorState();
  }
};

const bindEvents = () => {
  els.retry.addEventListener("click", init);

  els.quizReset.addEventListener("click", () => {
    try {
      localStorage.removeItem(getQuizKey(toISODate(new Date())));
    } catch {
      return;
    }
    renderQuiz();
    capriSay("Kuis direset. Ayo coba lagi dari soal pertama!", "idle");
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
