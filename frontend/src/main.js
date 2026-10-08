import "./style.css";

const CATEGORIES = [
  { name: "cardboard", color: "#b7834b", icon: "box" },
  { name: "glass", color: "#679783", icon: "glass" },
  { name: "metal", color: "#788697", icon: "metal" },
  { name: "organic", color: "#87a653", icon: "leaf" },
  { name: "paper", color: "#c7a74e", icon: "paper" },
  { name: "plastic", color: "#6f89c0", icon: "bottle" },
  { name: "battery", color: "#788697", icon: "metal" },
  { name: "clothes", color: "#ad849e", icon: "paper" },
  { name: "shoes", color: "#9b805f", icon: "box" },
  { name: "trash", color: "#777c82", icon: "recycle" },
];

const HISTORY_KEY = "garbage-analysis-scan-history";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const icons = {
  box: '<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10M8 5l8 4"/>',
  glass: '<path d="M8 3h8l-1 6-2 2v8a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-8L6 9l2-6Z"/><path d="M8 9h8"/>',
  metal: '<path d="M5 4h14l2 16H3L5 4Z"/><path d="M4 9h16M10 13h4"/>',
  leaf: '<path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z"/><path d="M4 21c3-6 7-9 12-12"/>',
  paper: '<path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h5M9 13h6M9 17h6"/>',
  bottle: '<path d="M9 3h6v3l2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-2V3Z"/><path d="M9 6h6M7 12h10"/>',
  dashboard: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.64-6.36L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  upload: '<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  recycle: '<path d="m7 7 2-3h5l2 3M5 11l-2 4 3 4h4m4 0h5l2-4-2-3m-6-2 3 5H9l3-5Z"/>',
};

const categoryByName = new Map(CATEGORIES.map((category) => [category.name, category]));

function icon(name, className = "") {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function readHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn("Could not read saved scan history.", error);
    return [];
  }
}

let history = readHistory();
let selectedFile = null;
let previewUrl = "";
let apiOnline = false;
let classifierStatus = "offline";

document.querySelector("#app").innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="GarbageAnalysis home">
        <span class="brand-mark">${icon("recycle")}</span>
        <span class="brand-name">garbage<span>analysis</span></span>
      </a>

      <div class="sidebar-label">WORKSPACE</div>
      <nav class="side-nav" aria-label="Main navigation">
        <a class="nav-link active" href="#overview">${icon("dashboard")}<span>Overview</span></a>
        <a class="nav-link" href="#activity">${icon("history")}<span>Scan history</span></a>
      </nav>

      <div class="sidebar-label category-label">MATERIALS</div>
      <div class="category-nav">
        ${CATEGORIES.map((category) => `
          <div class="category-link">
            <span class="category-dot" style="--category-color:${category.color}"></span>
            <span>${category.name}</span>
          </div>
        `).join("")}
      </div>

      <div class="sidebar-spacer"></div>
      <div class="sidebar-note">
        <span class="note-icon">${icon("spark")}</span>
        <strong>Small actions add up.</strong>
        <p>Identify each item and give it a better next step.</p>
      </div>
      <div class="sidebar-footer">
        <span class="footer-status" id="api-status-dot"></span>
        <span id="api-status-label">Checking classifier...</span>
      </div>
    </aside>

    <main class="main-content" id="overview">
      <header class="topbar">
        <div class="breadcrumb"><span>Workspace</span><span class="breadcrumb-slash">/</span><strong>Overview</strong></div>
        <div class="topbar-right">
          <span class="local-badge"><span></span> LOCAL WORKSPACE</span>
          <span class="avatar" aria-label="Local user">GA</span>
        </div>
      </header>

      <div class="page-content">
        <section class="welcome-row">
          <div>
            <p class="eyebrow">YOUR SORTING SPACE</p>
            <h1>A clearer way to <span>sort waste.</span></h1>
            <p class="welcome-copy">Drop in an item, find out what it is, and keep your sorting activity in one place.</p>
          </div>
          <div class="date-chip">${icon("history")} <span id="today-label"></span></div>
        </section>

        <section class="stats-grid" aria-label="Your scan summary">
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">TOTAL SCANS</span><span class="stat-icon stat-icon-green">${icon("spark")}</span></div>
            <div class="stat-value" id="total-scans">0</div>
            <div class="stat-caption">saved in this browser</div>
          </article>
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">MOST IDENTIFIED</span><span class="stat-icon stat-icon-gold">${icon("recycle")}</span></div>
            <div class="stat-value stat-value-text" id="top-category">—</div>
            <div class="stat-caption" id="top-category-caption">Your scan mix will appear here</div>
          </article>
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">SCANNED TODAY</span><span class="stat-icon stat-icon-blue">${icon("history")}</span></div>
            <div class="stat-value" id="today-scans">0</div>
            <div class="stat-caption">items classified today</div>
          </article>
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">LAST CONFIDENCE</span><span class="stat-icon stat-icon-purple">${icon("check")}</span></div>
            <div class="stat-value" id="last-confidence">—</div>
            <div class="stat-caption" id="last-confidence-caption">Ready when you are</div>
          </article>
        </section>

        <section class="content-grid">
          <article class="panel scan-panel" id="scan">
            <div class="panel-heading">
              <div>
                <p class="eyebrow">AI-POWERED CLASSIFICATION</p>
                <h2>Scan an item</h2>
              </div>
              <span class="live-pill"><span></span> READY TO SCAN</span>
            </div>

            <input class="visually-hidden" id="file-input" type="file" accept="image/*" />
            <div class="drop-zone" id="drop-zone" role="button" tabindex="0" aria-label="Choose or drop an image to classify">
              <div class="upload-art" id="upload-art">
                <div class="upload-ring">${icon("upload")}</div>
                <span class="upload-spark spark-one"></span>
                <span class="upload-spark spark-two"></span>
              </div>
              <img class="image-preview" id="image-preview" alt="Selected image preview" hidden />
              <p class="drop-title" id="drop-title">Drop your image here</p>
              <p class="drop-subtitle" id="drop-subtitle">or <button class="text-button" id="browse-button" type="button">browse files</button> from your device</p>
              <span class="file-hint">JPG, PNG, WEBP · UP TO 10 MB</span>
            </div>

            <div class="file-row" id="file-row" hidden>
              <span class="file-type-icon">${icon("paper")}</span>
              <span class="file-details"><strong id="file-name"></strong><small id="file-size"></small></span>
              <button class="icon-button" type="button" id="remove-file" aria-label="Remove selected image">${icon("close")}</button>
            </div>

            <div class="scan-error" id="scan-error" role="alert" hidden></div>
            <button class="primary-button" id="classify-button" type="button" disabled>
              <span id="classify-button-label">Choose an image to get started</span>
              ${icon("arrow")}
            </button>

            <div class="result-card" id="result-card" aria-live="polite" hidden></div>
          </article>

          <article class="panel distribution-panel">
            <div class="panel-heading">
              <div><p class="eyebrow">AT A GLANCE</p><h2>Your material mix</h2></div>
              <span class="chart-period">ALL TIME</span>
            </div>
            <p class="panel-description">A breakdown of the items you have classified.</p>
            <div class="distribution-list" id="distribution-list"></div>
            <div class="distribution-empty" id="distribution-empty">
              <div class="empty-chart">${icon("recycle")}</div>
              <strong>Your story starts with one scan</strong>
              <p>Classify an item to see your material mix here.</p>
            </div>
            <div class="distribution-footnote">${icon("spark")} Updates with each successful scan</div>
          </article>
        </section>

        <section class="panel activity-panel" id="activity">
          <div class="panel-heading activity-heading">
            <div><p class="eyebrow">RECENT ACTIVITY</p><h2>Your scan history</h2></div>
            <button class="clear-button" id="clear-history" type="button" hidden>Clear history</button>
          </div>
          <div class="activity-table-wrap">
            <table class="activity-table">
              <thead><tr><th>ITEM</th><th>CLASSIFICATION</th><th>CONFIDENCE</th><th>DATE &amp; TIME</th><th></th></tr></thead>
              <tbody id="activity-rows"></tbody>
            </table>
            <div class="activity-empty" id="activity-empty">
              <span class="empty-history-icon">${icon("history")}</span>
              <strong>No scans yet</strong>
              <p>Your recent classifications will show up here.</p>
              <a href="#scan" class="empty-action">Make your first scan ${icon("arrow")}</a>
            </div>
          </div>
        </section>
        <footer class="page-footer">GarbageAnalysis <span>·</span> Classification history stays on this device.</footer>
      </div>
    </main>
  </div>
`;

const elements = {
  fileInput: document.querySelector("#file-input"),
  dropZone: document.querySelector("#drop-zone"),
  uploadArt: document.querySelector("#upload-art"),
  imagePreview: document.querySelector("#image-preview"),
  dropTitle: document.querySelector("#drop-title"),
  dropSubtitle: document.querySelector("#drop-subtitle"),
  fileRow: document.querySelector("#file-row"),
  fileName: document.querySelector("#file-name"),
  fileSize: document.querySelector("#file-size"),
  scanError: document.querySelector("#scan-error"),
  classifyButton: document.querySelector("#classify-button"),
  classifyButtonLabel: document.querySelector("#classify-button-label"),
  resultCard: document.querySelector("#result-card"),
};

function formatCategory(name) {
  return String(name || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function updateDashboard() {
  const today = new Date().toDateString();
  const todayCount = history.filter((item) => new Date(item.createdAt).toDateString() === today).length;
  const categoryCounts = new Map(CATEGORIES.map(({ name }) => [name, 0]));
  history.forEach((item) => {
    const category = String(item.category || "").toLowerCase();
    if (categoryCounts.has(category)) categoryCounts.set(category, categoryCounts.get(category) + 1);
  });

  const topCategory = CATEGORIES
    .map((category) => ({ ...category, count: categoryCounts.get(category.name) }))
    .sort((a, b) => b.count - a.count)[0];
  const lastScan = history[0];

  document.querySelector("#total-scans").textContent = history.length.toLocaleString();
  document.querySelector("#today-scans").textContent = todayCount.toLocaleString();
  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  document.querySelector("#top-category").textContent = topCategory?.count
    ? formatCategory(topCategory.name)
    : "—";
  document.querySelector("#top-category-caption").textContent = topCategory?.count
    ? `${topCategory.count} ${topCategory.count === 1 ? "scan" : "scans"}`
    : "Your scan mix will appear here";
  document.querySelector("#last-confidence").textContent = lastScan
    ? `${Math.round(lastScan.confidence * 100)}%`
    : "—";
  document.querySelector("#last-confidence-caption").textContent = lastScan
    ? `Latest: ${formatCategory(lastScan.category)}`
    : "Ready when you are";

  const distribution = document.querySelector("#distribution-list");
  distribution.innerHTML = CATEGORIES.map((category) => {
    const count = categoryCounts.get(category.name);
    const percentage = history.length ? Math.round((count / history.length) * 100) : 0;
    return `
      <div class="distribution-item">
        <span class="distribution-name"><span class="category-dot" style="--category-color:${category.color}"></span>${formatCategory(category.name)}</span>
        <div class="distribution-track"><span style="--category-color:${category.color};--bar-width:${percentage}%"></span></div>
        <span class="distribution-value">${percentage}%</span>
      </div>
    `;
  }).join("");
  document.querySelector("#distribution-empty").hidden = history.length > 0;
  distribution.hidden = history.length === 0;

  const rows = history.slice(0, 8).map((item) => {
    const category = categoryByName.get(String(item.category).toLowerCase());
    const color = category?.color || "#788697";
    const confidence = Number(item.confidence);
    return `
      <tr>
        <td><div class="item-cell"><span class="item-thumb" style="--category-color:${color}">${icon(category?.icon || "paper")}</span><span><strong>${escapeHtml(item.fileName || "Uploaded image")}</strong><small>Image classification</small></span></div></td>
        <td><span class="class-pill" style="--category-color:${color}">${escapeHtml(formatCategory(item.category))}</span></td>
        <td><span class="confidence-value">${Math.round(confidence * 100)}%</span></td>
        <td class="date-cell">${escapeHtml(formatDate(new Date(item.createdAt)))}</td>
        <td><span class="row-check">${icon("check")}</span></td>
      </tr>
    `;
  });
  document.querySelector("#activity-rows").innerHTML = rows.join("");
  document.querySelector("#activity-empty").hidden = history.length > 0;
  document.querySelector(".activity-table").hidden = history.length === 0;
  document.querySelector("#clear-history").hidden = history.length === 0;
}

function setApiStatus(online, status = "offline") {
  apiOnline = online;
  classifierStatus = online ? "ready" : status;
  document.querySelector("#api-status-dot").classList.toggle("online", online);
  document.querySelector("#api-status-label").textContent = online
    ? "Classifier connected"
    : status === "model_unavailable"
      ? "Model unavailable"
      : "Classifier offline";
  const livePill = document.querySelector(".live-pill");
  livePill.classList.toggle("offline", !online);
  const label = online
    ? "READY TO SCAN"
    : status === "model_unavailable"
      ? "TRAINED MODEL REQUIRED"
      : "CLASSIFIER OFFLINE";
  livePill.innerHTML = `<span></span> ${label}`;
}

async function checkApi() {
  try {
    const response = await fetch("/api/ml/health", { signal: AbortSignal.timeout(5000) });
    const status = await response.json().catch(() => ({}));
    if (response.ok) {
      setApiStatus(true);
      return;
    }
    if (status.status === "model_unavailable") {
      setApiStatus(false, "model_unavailable");
      return;
    }
    throw new Error(`Classifier health check returned ${response.status}`);
  } catch (error) {
    console.warn("Could not reach the backend classifier route.", error);
    setApiStatus(false);
  }
}

function setError(message) {
  elements.scanError.textContent = message;
  elements.scanError.hidden = !message;
}

function clearSelectedFile() {
  selectedFile = null;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = "";
  elements.fileInput.value = "";
  elements.fileRow.hidden = true;
  elements.imagePreview.hidden = true;
  elements.imagePreview.removeAttribute("src");
  elements.uploadArt.hidden = false;
  elements.dropTitle.textContent = "Drop your image here";
  elements.dropSubtitle.innerHTML = 'or <button class="text-button" id="browse-button" type="button">browse files</button> from your device';
  elements.classifyButton.disabled = true;
  elements.classifyButtonLabel.textContent = "Choose an image to get started";
  elements.resultCard.hidden = true;
  setError("");
}

function selectFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setError("Please choose an image file (JPG, PNG, or WEBP).");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    setError("This image is larger than 10 MB. Choose a smaller file and try again.");
    return;
  }

  clearSelectedFile();
  selectedFile = file;
  previewUrl = URL.createObjectURL(file);
  elements.imagePreview.src = previewUrl;
  elements.imagePreview.hidden = false;
  elements.uploadArt.hidden = true;
  elements.dropTitle.textContent = "Image ready to classify";
  elements.dropSubtitle.textContent = "Looking good — classify it when you're ready.";
  elements.fileName.textContent = file.name;
  elements.fileSize.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  elements.fileRow.hidden = false;
  elements.classifyButton.disabled = false;
  elements.classifyButtonLabel.textContent = "Classify this image";
  elements.resultCard.hidden = true;
  setError("");
}

function persistHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Could not save scan history in this browser.", error);
    setError("The scan completed, but browser storage is unavailable. The result is not saved.");
  }
}

async function classifyImage() {
  if (!selectedFile) return;
  if (!apiOnline) {
    setError(classifierStatus === "model_unavailable"
      ? "The ML service is online, but no trained model is loaded yet."
      : "The classifier is offline. Start the ML API and try again.");
    return;
  }

  const file = selectedFile;
  const body = new FormData();
  body.append("file", file);
  elements.classifyButton.disabled = true;
  elements.classifyButton.classList.add("is-loading");
  elements.classifyButtonLabel.textContent = "Classifying image...";
  setError("");

  try {
    const response = await fetch("/api/ml/predict", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof result.detail === "string" ? result.detail : typeof result.message === "string" ? result.message : `Request failed (${response.status}).`;
      throw new Error(detail);
    }
    const categoryName = String(result.category || result.class || "").trim();
    if (!categoryName || !Number.isFinite(Number(result.confidence))) {
      throw new Error("The classifier returned an unexpected response. Please try again.");
    }

    const category = categoryByName.get(categoryName.toLowerCase());
    const confidence = Math.min(1, Math.max(0, Number(result.confidence)));
    const label = categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase();
    const predictions = Array.isArray(result.predictions)
      ? result.predictions
          .filter((item) => item && typeof item.category === "string" && Number.isFinite(Number(item.confidence)))
          .slice(0, 3)
      : [];
    const guidance = result.guidance && typeof result.guidance === "object" ? result.guidance : null;
    const disposalOptions = Array.isArray(guidance?.options)
      ? guidance.options.filter((option) => typeof option === "string")
      : [];
    elements.resultCard.innerHTML = `
      <div class="result-topline"><span class="result-check">${icon("check")}</span><span>CLASSIFICATION COMPLETE</span></div>
      <div class="result-body">
        <span class="result-material-icon" style="--category-color:${category?.color || "#788697"}">${icon(category?.icon || "paper")}</span>
        <div class="result-copy"><span>We think this is</span><strong>${escapeHtml(label)}</strong></div>
        <div class="result-confidence"><strong>${Math.round(confidence * 100)}%</strong><span>confidence</span></div>
      </div>
      <div class="confidence-track"><span style="width:${Math.round(confidence * 100)}%"></span></div>
      ${predictions.length ? `
        <div class="prediction-list">
          <strong class="result-section-title">Top predictions</strong>
          ${predictions.map((prediction) => {
            const predictionConfidence = Math.min(1, Math.max(0, Number(prediction.confidence)));
            return `<div class="prediction-item"><span>${escapeHtml(formatCategory(prediction.category))}</span><strong>${Math.round(predictionConfidence * 100)}%</strong></div>`;
          }).join("")}
        </div>
      ` : ""}
      ${guidance ? `
        <div class="disposal-guidance">
          <strong class="result-section-title">Disposal guidance</strong>
          ${guidance.organization ? `<p class="guidance-source">Suggested source: ${escapeHtml(guidance.organization)}</p>` : ""}
          ${disposalOptions.length ? `<ul>${disposalOptions.map((option) => `<li>${escapeHtml(option)}</li>`).join("")}</ul>` : ""}
        </div>
      ` : ""}
    `;
    elements.resultCard.hidden = false;

    history.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: categoryName,
      confidence,
      fileName: file.name,
      createdAt: new Date().toISOString(),
    });
    history = history.slice(0, 100);
    persistHistory();
    updateDashboard();
    await checkApi();
  } catch (error) {
    setError(error.message || "Could not classify this image. Please try again.");
    if (error.name === "TypeError") setApiStatus(false);
  } finally {
    elements.classifyButton.classList.remove("is-loading");
    elements.classifyButton.disabled = !selectedFile;
    elements.classifyButtonLabel.textContent = "Classify this image";
  }
}

document.querySelector("#app").addEventListener("click", (event) => {
  if (event.target.closest("#browse-button")) elements.fileInput.click();
  if (event.target.closest("#remove-file")) clearSelectedFile();
});

elements.fileInput.addEventListener("change", (event) => selectFile(event.target.files?.[0]));
elements.classifyButton.addEventListener("click", classifyImage);
elements.dropZone.addEventListener("click", (event) => {
  if (!event.target.closest("button")) elements.fileInput.click();
});
elements.dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    elements.fileInput.click();
  }
});
elements.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.dropZone.classList.add("is-dragging");
});
elements.dropZone.addEventListener("dragleave", (event) => {
  if (!elements.dropZone.contains(event.relatedTarget)) elements.dropZone.classList.remove("is-dragging");
});
elements.dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove("is-dragging");
  selectFile(event.dataTransfer.files?.[0]);
});
document.querySelector("#clear-history").addEventListener("click", () => {
  history = [];
  persistHistory();
  updateDashboard();
  elements.resultCard.hidden = true;
});

document.querySelectorAll(".side-nav .nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".side-nav .nav-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

window.addEventListener("beforeunload", () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
});

updateDashboard();
checkApi();
