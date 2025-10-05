// main.js
import { renderLibrary } from "./library.js";
import { initAuthor } from "./author.js";
import { initLearn } from "./learn.js";

const sections = document.querySelectorAll("main section");

/**
 * نمایش یک بخش و مخفی کردن بقیه
 * @param {string} id - آیدی section
 */
function showSection(id) {
  sections.forEach(sec => sec.style.display = "none");
  document.getElementById(id).style.display = "block";
}

// لینک‌ها
document.querySelector(".library").addEventListener("click", () => {
  showSection("library");
  renderLibrary();
});

document.querySelector(".author").addEventListener("click", () => {
  showSection("author");
  initAuthor();
});

document.querySelector(".learn").addEventListener("click", () => {
  showSection("learn");
  initLearn(); // ← اضافه شد تا اولین کپسول موجود نمایش داده شود
});

// پیشفرض صفحه
showSection("library");
renderLibrary();


