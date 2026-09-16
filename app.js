"use strict";

const themeToggle = document.querySelector(".theme-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
let savedTheme = null;

// Manche Browser schränken localStorage beim direkten Öffnen lokaler Dateien ein.
try {
  savedTheme = localStorage.getItem("kreativraum-theme");
} catch {
  // Die Designumschaltung funktioniert auch ohne gespeicherte Einstellung.
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const label = theme === "dark" ? "Helles Design aktivieren" : "Dunkles Design aktivieren";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.title = label;
  themeColor.content = theme === "dark" ? "#222520" : "#f7f7f2";
  window.dispatchEvent(new Event("kreativ-theme"));
}

if (savedTheme !== "light" && savedTheme !== "dark") savedTheme = null;
applyTheme(savedTheme || (systemTheme.matches ? "dark" : "light"));

themeToggle.addEventListener("click", () => {
  savedTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(savedTheme);
  try {
    localStorage.setItem("kreativraum-theme", savedTheme);
  } catch {
    // Ohne Browserspeicher gilt die Auswahl für die aktuelle Sitzung.
  }
});

systemTheme.addEventListener("change", (event) => {
  if (!savedTheme) applyTheme(event.matches ? "dark" : "light");
});

KreativPages.init();
KreativCreative.init();
KreativFonts.init();
KreativIcons.init();
const pageTitles = { home: "Foto- und Designtools", convert: "Bildkonverter", resize: "Image Size Reducer", rename: "Bilder umbenennen", palette: "Farbpalette", fonts: "Schriftkombis", qr: "QR-Codes", icons: "Icongalerie", stats: "Deine Statistik" };
const toolNames = Object.keys(pageTitles).filter(name => !["home", "stats"].includes(name));
for (const name of toolNames) {
  document.getElementById(`${name}-view`).dataset.tool = name;
  document.querySelector(`.tool-card[href="#${name}"]`).dataset.tool = name;
}
document.querySelectorAll(".stat-card").forEach((card, index) => { card.dataset.tool = toolNames[index]; });

function showPage(focus = true) {
  const requested = location.hash.slice(1) || "home";
  const page = Object.hasOwn(pageTitles, requested) ? requested : "home";
  document.body.dataset.page = page;
  document.body.dataset.tool = toolNames.includes(page) ? page : "neutral";
  document.body.classList.toggle("tool-open", !["home", "stats"].includes(page));
  document.querySelectorAll(".tool-help[open]").forEach((dialog) => dialog.close());
  KreativFonts.closePicker();
  for (const name of Object.keys(pageTitles)) {
    document.getElementById(`${name}-view`).hidden = name !== page;
  }
  document.querySelectorAll(".header-nav a").forEach((link) => {
    if (link.hash === `#${page}`) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const title = pageTitles[page];
  document.title = page === "home" ? title : `${title} · Foto- und Designtools`;
  if (page === "stats") KreativPages.renderStats();
  if (page === "icons") KreativIcons.open();
  if (page === "fonts") KreativFonts.open();
  if (focus) {
    const heading = document.querySelector(`#${page}-view h1`);
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

window.addEventListener("hashchange", () => showPage());
showPage(false);
