// author.js
import * as storage from "./storage.js";
import { renderLibrary } from "./library.js";

export function initAuthor(existingId = null) {
  const container = document.getElementById("author-editor");
  let capsule;

  // بارگذاری Capsule موجود یا ایجاد جدید
  if (existingId) {
    capsule = storage.load(`pc_capsule_${existingId}`);
    if (!capsule) existingId = null;
  }

  if (!existingId) {
    const id = "c" + Date.now();
    capsule = {
      id,
      meta: { title: "", subject: "", level: "Beginner", description: "", updatedAt: new Date().toISOString() },
      notes: [],
      flashcards: [],
      quiz: [],
    };
  }

  renderForm();

  function renderForm() {
    container.innerHTML = `
      <form id="author-form" class="author-grid">
        <!-- ستون سمت چپ: Meta -->
        <div class="author-left">
          <div class="mb-2">
            <label class="form-label">Title</label>
            <input type="text" id="title" class="form-control" value="${capsule.meta.title}" required>
          </div>
          <div class="mb-2">
            <label class="form-label">Subject</label>
            <input type="text" id="subject" class="form-control" value="${capsule.meta.subject}">
          </div>
          <div class="mb-2">
            <label class="form-label">Level</label>
            <select id="level" class="form-select">
              <option value="Beginner" ${capsule.meta.level === "Beginner" ? "selected" : ""}>Beginner</option>
              <option value="Intermediate" ${capsule.meta.level === "Intermediate" ? "selected" : ""}>Intermediate</option>
              <option value="Advanced" ${capsule.meta.level === "Advanced" ? "selected" : ""}>Advanced</option>
            </select>
          </div>
          <div class="mb-2">
            <label class="form-label">Description</label>
            <textarea id="description" class="form-control">${capsule.meta.description}</textarea>
          </div>
        </div>

        <!-- ستون سمت راست: Notes و Flashcards -->
        <div class="author-right">
          <h6>Notes</h6>
          <div id="notes-editor" class="mb-2"></div>
          <button type="button" id="add-note" class="btn btn-sm btn-outline-primary mb-3">Add Note</button>

          <h6>Flashcards</h6>
          <div id="flashcards-editor" class="mb-2"></div>
          <button type="button" id="add-flashcard" class="btn btn-sm btn-outline-primary mb-3">Add Flashcard</button>
        </div>

        <!-- بخش Quiz در پایین با عرض کامل -->
        <div class="author-quiz">
          <h6>Quiz</h6>
          <div id="quiz-editor" class="mb-2"></div>
          <button type="button" id="add-quiz" class="btn btn-sm btn-outline-primary mb-3">Add Question</button>

          <button type="submit" class="btn btn-success btn-sm">Save Capsule</button>
          <button type="button" class="btn btn-secondary btn-sm back">Back</button>
          <div id="author-msg" class="mt-2"></div>
        </div>

        <style>
          /* CSS Grid برای ستون‌ها */
          .author-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
          }
          .author-left, .author-right {
            display: flex;
            flex-direction: column;
          }
          .author-quiz {
            grid-column: 1 / -1; /* عرض کامل ستون‌ها */
            margin-top: 2rem;
          }

          /* ریسپانسیو موبایل */
          @media (max-width: 768px) {
            .author-grid {
              grid-template-columns: 1fr;
            }
          }

          /* هر سوال Quiz عرض کامل داشته باشد */
          #quiz-editor .border {
            width: 100%;
          }
          #quiz-editor .row > div {
            width: 100%;
            padding-left: 0;
            padding-right: 0;
          }
        </style>
      </form>
    `;

    // دکمه بازگشت
    container.querySelector(".back").onclick = () => {
      document.querySelector("#library").style.display = "block";
      document.querySelector("#author").style.display = "none";
      renderLibrary();
    };

    // دکمه‌های افزودن آیتم
    document.getElementById("add-note").onclick = () => { capsule.notes.push(""); renderNotes(); };
    document.getElementById("add-flashcard").onclick = () => { capsule.flashcards.push({ front: "", back: "" }); renderFlashcards(); };
    document.getElementById("add-quiz").onclick = () => { capsule.quiz.push({ question: "", choices: ["", "", "", ""], correct: 0, explanation: "" }); renderQuiz(); };

    const form = document.getElementById("author-form");
    const msg = document.getElementById("author-msg");

    // ذخیره Capsule
    form.onsubmit = (e) => {
      e.preventDefault();
      capsule.meta.title = form.title.value || "Untitled";
      capsule.meta.subject = form.subject.value;
      capsule.meta.level = form.level.value;
      capsule.meta.description = form.description.value;
      capsule.meta.updatedAt = new Date().toISOString();

      capsule.notes = capsule.notes.filter(n => n.trim() !== "");
      capsule.flashcards = capsule.flashcards.filter(f => f.front.trim() !== "" || f.back.trim() !== "");
      capsule.quiz = capsule.quiz.filter(q => q.question.trim() !== "" && q.choices.some(c => c.trim() !== ""));

      if (capsule.notes.length === 0 && capsule.flashcards.length === 0 && capsule.quiz.length === 0) {
        msg.innerHTML = `<div class="alert alert-warning">Add at least one note, flashcard or quiz question.</div>`;
        return;
      }

      storage.save(`pc_capsule_${capsule.id}`, capsule);
      let index = storage.load("pc_capsules_index", []);
      const existIndex = index.findIndex(c => c.id === capsule.id);
      const entry = { id: capsule.id, title: capsule.meta.title, subject: capsule.meta.subject, level: capsule.meta.level, updatedAt: capsule.meta.updatedAt };
      if (existIndex >= 0) index[existIndex] = entry; else index.push(entry);
      storage.save("pc_capsules_index", index);

      msg.innerHTML = `<div class="alert alert-success">Capsule saved!</div>`;
      setTimeout(() => {
        document.querySelector("#library").style.display = "block";
        document.querySelector("#author").style.display = "none";
        renderLibrary();
        msg.innerHTML = "";
      }, 1000);
    };

    /*** Notes Editor ***/
    function renderNotes() {
      const notesContainer = document.getElementById("notes-editor");
      notesContainer.innerHTML = capsule.notes.map((note,i)=>`
        <div class="input-group mb-1">
          <input type="text" class="form-control note-input" data-index="${i}" value="${note}">
          <button type="button" class="btn btn-outline-danger remove-note" data-index="${i}">X</button>
        </div>`).join("");
      notesContainer.querySelectorAll(".note-input").forEach(input => { input.oninput = e => capsule.notes[parseInt(input.dataset.index)] = e.target.value; });
      notesContainer.querySelectorAll(".remove-note").forEach(btn => { btn.onclick = () => { capsule.notes.splice(parseInt(btn.dataset.index),1); renderNotes(); }; });
    }

    /*** Flashcards Editor ***/
    function renderFlashcards() {
      const flashContainer = document.getElementById("flashcards-editor");
      flashContainer.innerHTML = capsule.flashcards.map((f,i)=>`
        <div class="input-group mb-1">
          <input type="text" class="form-control front-input" placeholder="Front" data-index="${i}" value="${f.front}">
          <input type="text" class="form-control back-input" placeholder="Back" data-index="${i}" value="${f.back}">
          <button type="button" class="btn btn-outline-danger remove-flash" data-index="${i}">X</button>
        </div>`).join("");
      flashContainer.querySelectorAll(".front-input").forEach(input=>{ input.oninput = e => { capsule.flashcards[parseInt(input.dataset.index)].front = e.target.value; }; });
      flashContainer.querySelectorAll(".back-input").forEach(input=>{ input.oninput = e => { capsule.flashcards[parseInt(input.dataset.index)].back = e.target.value; }; });
      flashContainer.querySelectorAll(".remove-flash").forEach(btn=>{ btn.onclick = ()=>{ capsule.flashcards.splice(parseInt(btn.dataset.index),1); renderFlashcards(); }; });
    }

    /*** Quiz Editor ***/
    function renderQuiz() {
      const quizContainer = document.getElementById("quiz-editor");
      quizContainer.innerHTML = capsule.quiz.map((q,i)=>`
        <div class="border p-2 mb-2">
          <input type="text" class="form-control mb-2 question-input" placeholder="Question" data-index="${i}" value="${q.question}">
          <div class="row mb-2">
            ${q.choices.map((c,j)=>`
              <div class="col-12 col-md-6 mb-1">
                <div class="input-group">
                  <span class="input-group-text">${["A","B","C","D"][j]}</span>
                  <input type="text" class="form-control choice-input" data-qindex="${i}" data-cindex="${j}" value="${c}">
                </div>
              </div>`).join("")}
          </div>
          <div class="mb-2">
            <label class="form-label">Explanation (optional)</label>
            <input type="text" class="form-control explanation-input" data-index="${i}" value="${q.explanation || ''}">
          </div>
          <select class="form-select mb-2 correct-select" data-index="${i}">
            ${q.choices.map((c,j)=>`<option value="${j}" ${q.correct===j?"selected":""}>Choice ${["A","B","C","D"][j]}</option>`).join("")}
          </select>
          <button type="button" class="btn btn-outline-danger btn-sm remove-quiz" data-index="${i}">Remove Question</button>
        </div>`).join("");

      quizContainer.querySelectorAll(".question-input").forEach(input=>{ input.oninput = e => capsule.quiz[parseInt(input.dataset.index)].question = e.target.value; });
      quizContainer.querySelectorAll(".choice-input").forEach(input=>{ input.oninput = e => { const qi = parseInt(input.dataset.qindex); const ci = parseInt(input.dataset.cindex); capsule.quiz[qi].choices[ci] = e.target.value; }; });
      quizContainer.querySelectorAll(".correct-select").forEach(sel=>{ sel.onchange = e => capsule.quiz[parseInt(sel.dataset.index)].correct = parseInt(sel.value); });
      quizContainer.querySelectorAll(".explanation-input").forEach(input=>{
        input.oninput = e => { const idx = parseInt(input.dataset.index); capsule.quiz[idx].explanation = e.target.value; };
      });
      quizContainer.querySelectorAll(".remove-quiz").forEach(btn=>{ btn.onclick = ()=>{ capsule.quiz.splice(parseInt(btn.dataset.index),1); renderQuiz(); }; });
    }
  }
}
