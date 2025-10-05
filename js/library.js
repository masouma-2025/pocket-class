// library.js
import * as storage from "./storage.js";
import { timeAgo, slugify } from "./utils.js";
import { initAuthor } from "./author.js";
import { initLearn } from "./learn.js";

export function renderLibrary() {
  const container = document.getElementById("library-list");
  if (!container) return;

  const index = storage.load("pc_capsules_index", []);

  if (!Array.isArray(index) || index.length === 0) {
    container.innerHTML = `<div class="alert alert-info">No capsules yet. Click "New Capsule" to create one!</div>`;
    return;
  }

  const cards = index.map(entry => {
    const capsule = storage.load(`pc_capsule_${entry.id}`, null);
    const progress = storage.load(`pc_progress_${entry.id}`, { bestScore: 0, knownFlashcards: [] });

    const bestScore = typeof progress.bestScore === "number" ? progress.bestScore : 0;
    const totalFlash = capsule?.flashcards?.length || 0;
    const knownFlash = Array.isArray(progress.knownFlashcards) ? progress.knownFlashcards.length : 0;

    // محاسبه درصدها برای نوار پیشرفت ترکیبی
    const flashPercent = totalFlash ? Math.round((knownFlash / totalFlash) * 100) : 0;
    const remainingPercent = Math.max(0, 100 - bestScore - flashPercent);

    const title = entry.title || capsule?.meta?.title || "Untitled";
    const subject = entry.subject || capsule?.meta?.subject || "No subject";
    const level = entry.level || capsule?.meta?.level || "Beginner";
    const updatedAt = entry.updatedAt || capsule?.meta?.updatedAt || new Date().toISOString();

    return `
      <div class="col-sm-12 col-md-6 col-lg-4 mb-3">
        <div class="card shadow-sm h-100">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title mb-1">${escapeHtml(title)}</h5>
            <div class="mb-2">
              <span class="badge bg-info me-1">${escapeHtml(level)}</span>
              <span class="badge bg-secondary">${escapeHtml(subject)}</span>
            </div>
            <p class="card-text text-muted small mb-2">Updated ${timeAgo(updatedAt)}</p>

            <!-- نوار پیشرفت ترکیبی -->
            <div class="mb-2">
              <div class="progress" style="height: 12px;">
                <div class="progress-bar bg-primary" style="width: ${bestScore}%" title="Best Quiz ${bestScore}%"></div>
                <div class="progress-bar bg-success" style="width: ${flashPercent}%" title="Flashcards Known ${knownFlash}/${totalFlash}"></div>
                <div class="progress-bar bg-secondary" style="width: ${remainingPercent}%"></div>
              </div>
              <small class="text-muted">
                Quiz: ${bestScore}% 
                ${totalFlash ? `| Flashcards: ${knownFlash}/${totalFlash}` : ""}
              </small>
            </div>

            <!-- دکمه‌ها -->
            <div class="d-flex flex-wrap gap-2 mt-auto">
              <button class="btn btn-sm btn-primary flex-grow-1 flex-md-grow-0 learn-btn" data-id="${entry.id}" aria-label="Learn ${escapeHtml(title)}">Learn</button>
              <button class="btn btn-sm btn-outline-secondary flex-grow-1 flex-md-grow-0 edit-btn" data-id="${entry.id}" aria-label="Edit ${escapeHtml(title)}">Edit</button>
              <button class="btn btn-sm btn-success flex-grow-1 flex-md-grow-0 export-btn" data-id="${entry.id}" aria-label="Export ${escapeHtml(title)}">Export</button>
              <button class="btn btn-sm btn-danger flex-grow-1 flex-md-grow-0 delete-btn" data-id="${entry.id}" aria-label="Delete ${escapeHtml(title)}">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `<div class="row">${cards}</div>`;

  // دکمه‌های بالا
  const newBtn = document.querySelector("#library .btn-primary");
  if (newBtn) {
    newBtn.onclick = () => {
      const id = "c" + Date.now();
      const capsule = {
        id,
        schema: "pocket-classroom/v1",
        meta: { title: "", subject: "", level: "Beginner", description: "", updatedAt: new Date().toISOString() },
        notes: [],
        flashcards: [],
        quiz: [],
      };
      storage.save(`pc_capsule_${id}`, capsule);
      const idx = storage.load("pc_capsules_index", []);
      idx.push({ id, title: capsule.meta.title, subject: capsule.meta.subject, level: capsule.meta.level, updatedAt: capsule.meta.updatedAt });
      storage.save("pc_capsules_index", idx);

      document.querySelector("#author").style.display = "block";
      document.querySelector("#library").style.display = "none";
      initAuthor(id);
      renderLibrary();
    };
  }

  const importBtn = document.querySelector("#library .btn-outline-success");
  if (importBtn) {
    importBtn.onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const data = JSON.parse(ev.target.result);
            if (data.schema !== "pocket-classroom/v1") { alert("Invalid schema"); return; }
            if (!data.meta?.title) { alert("Missing title"); return; }
            if ((!Array.isArray(data.notes) || data.notes.length===0) &&
                (!Array.isArray(data.flashcards) || data.flashcards.length===0) &&
                (!Array.isArray(data.quiz) || data.quiz.length===0)) { alert("Capsule empty"); return; }

            const id = "c" + Date.now();
            data.id = id;
            data.meta.updatedAt = data.meta.updatedAt || new Date().toISOString();
            storage.save(`pc_capsule_${id}`, data);
            const idx = storage.load("pc_capsules_index", []);
            idx.push({ id, title: data.meta.title, subject: data.meta.subject, level: data.meta.level, updatedAt: data.meta.updatedAt });
            storage.save("pc_capsules_index", idx);
            alert("Capsule imported successfully");
            renderLibrary();
          } catch(err) { console.error(err); alert("Error parsing JSON"); }
        };
        reader.readAsText(file);
      };
      input.click();
    };
  }

  // Delegated buttons
  container.onclick = e => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.classList.contains("delete-btn")) {
      if (!confirm("Delete this capsule?")) return;
      let idx = storage.load("pc_capsules_index", []);
      idx = idx.filter(c => c.id !== id);
      storage.save("pc_capsules_index", idx);
      localStorage.removeItem(`pc_capsule_${id}`);
      localStorage.removeItem(`pc_progress_${id}`);
      renderLibrary();
      return;
    }

    if (btn.classList.contains("edit-btn")) {
      document.querySelector("#author").style.display = "block";
      document.querySelector("#library").style.display = "none";
      initAuthor(id);
      return;
    }

    if (btn.classList.contains("learn-btn")) {
      document.querySelector("#learn").style.display = "block";
      document.querySelector("#library").style.display = "none";
      initLearn(id);
      return;
    }

    if (btn.classList.contains("export-btn")) {
      const capsule = storage.load(`pc_capsule_${id}`);
      if (!capsule) { alert("Capsule not found"); return; }
      const exportObj = Object.assign({}, capsule);
      if (!exportObj.schema) exportObj.schema = "pocket-classroom/v1";
      const filename = slugify(exportObj.meta?.title || id);
      const blob = new Blob([JSON.stringify(exportObj,null,2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  };
}

function escapeHtml(str="") {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// Auto-refresh support
window.addEventListener("pc:update", ()=> { try { renderLibrary(); } catch(e){} });
let _lastIndexJSON = JSON.stringify(storage.load("pc_capsules_index", []));
setInterval(()=>{
  try {
    const now = JSON.stringify(storage.load("pc_capsules_index", []));
    if (now !== _lastIndexJSON) { _lastIndexJSON = now; renderLibrary(); }
  } catch(e){}
}, 1000);

document.addEventListener("DOMContentLoaded", () => renderLibrary());
