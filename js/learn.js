// learn.js
import * as storage from "./storage.js";

export function initLearn(selectedId = null) {
  const container = document.getElementById("learn-view");

  // بارگذاری همه کپسول‌ها
  const capsulesIndex = storage.load("pc_capsules_index", []);
  if (capsulesIndex.length === 0) {
    container.innerHTML = "<p>No capsules available. Create one in Library.</p>";
    return;
  }

  let capsuleId = selectedId || capsulesIndex[0].id;
  let capsule = storage.load(`pc_capsule_${capsuleId}`);
  let progress = storage.load(`pc_progress_${capsuleId}`, { bestScore: 0, knownFlashcards: [] });
  let currentTab = "notes";
  let flashIndex = 0;
  let quizIndex = 0;
  let correctAnswers = 0;
  let answered = Array(capsule.quiz ? capsule.quiz.length : 0).fill(false);

  container.innerHTML = `<div id="learn-wrapper"></div>`;
  const wrapper = document.getElementById("learn-wrapper");

  renderDropdown();
  renderTabs();
  renderContent();
  renderExport();

  function renderDropdown() {
    const existing = wrapper.querySelector("#capsuleSelectDiv");
    if (existing) existing.remove();

    const dropdownDiv = document.createElement("div");
    dropdownDiv.id = "capsuleSelectDiv";
    dropdownDiv.className = "mb-2";
    dropdownDiv.innerHTML = `
      <label for="capsuleSelect" class="form-label">Select Capsule:</label>
      <select id="capsuleSelect" class="form-select form-select-sm">
        ${capsulesIndex.map(c=>`<option value="${c.id}" ${c.id===capsuleId?"selected":""}>${c.title}</option>`).join("")}
      </select>
    `;
    wrapper.prepend(dropdownDiv);

    document.getElementById("capsuleSelect").onchange = () => {
      capsuleId = wrapper.querySelector("#capsuleSelect").value;
      capsule = storage.load(`pc_capsule_${capsuleId}`);
      progress = storage.load(`pc_progress_${capsuleId}`, { bestScore:0, knownFlashcards:[] });
      flashIndex = 0;
      quizIndex = 0;
      correctAnswers = 0;
      answered = Array(capsule.quiz ? capsule.quiz.length : 0).fill(false);

      renderTabs();
      renderContent();
      renderExport();
    };
  }

  function renderTabs() {
    wrapper.querySelectorAll(".nav-tabs, #learnContent, #progressWrapper, #learn-controls, .back").forEach(e=>e?.remove());

    wrapper.insertAdjacentHTML("beforeend", `
      <ul class="nav nav-tabs mt-2" role="tablist">
        <li class="nav-item"><a class="nav-link active" href="#" data-tab="notes">Notes</a></li>
        <li class="nav-item"><a class="nav-link" href="#" data-tab="flashcards">Flashcards</a></li>
        <li class="nav-item"><a class="nav-link" href="#" data-tab="quiz">Quiz</a></li>
      </ul>
      <div id="learnContent" class="mt-3"></div>
      <div id="progressWrapper" class="mt-2">
        <div class="progress">
          <div id="progressBar" class="progress-bar" role="progressbar" style="width:0%">0%</div>
        </div>
      </div>
      <div id="learn-controls" class="mt-3"></div>
      <button class="btn btn-secondary btn-sm mt-2 back">Back</button>
    `);

    wrapper.querySelectorAll(".nav-link").forEach(tab=>{
      tab.onclick = e=>{
        e.preventDefault();
        wrapper.querySelectorAll(".nav-link").forEach(t=>t.classList.remove("active"));
        tab.classList.add("active");
        currentTab = tab.dataset.tab;
        renderContent();
      };
    });

    wrapper.querySelector(".back").onclick = () => {
      document.querySelector("#library").style.display = "block";
      document.querySelector("#learn").style.display = "none";
    };
  }

  function renderExport() {
    const controls = wrapper.querySelector("#learn-controls");
    if (!controls) return;
    controls.innerHTML = "";
    const exportBtn = document.createElement("button");
    exportBtn.className = "btn btn-sm btn-success";
    exportBtn.textContent = "Export Capsule";
    exportBtn.onclick = () => {
      const blob = new Blob([JSON.stringify(capsule, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${capsule.meta.title || "capsule"}.json`;
      a.click();
    };
    controls.appendChild(exportBtn);
  }

  function renderContent() {
    if(currentTab==="notes") renderNotes();
    if(currentTab==="flashcards") renderFlashcards();
    if(currentTab==="quiz") renderQuiz();
    updateProgressBar();
  }

  function renderNotes() {
    const content = wrapper.querySelector("#learnContent");
    if(!capsule.notes || capsule.notes.length===0){
      content.innerHTML = "<p>No notes yet.</p>";
      return;
    }
    content.innerHTML = `
      <h5>${capsule.meta?.title || "Untitled"} (${capsule.meta?.level || ""})</h5>
      <p class="text-muted">${capsule.meta?.subject || ""}</p>
      <p>${capsule.meta?.description || ""}</p>
      <ol id="noteList">${capsule.notes.map(n=>`<li>${n}</li>`).join("")}</ol>
    `;
  }

  function renderFlashcards() {
    const content = wrapper.querySelector("#learnContent");
    if(!capsule.flashcards || capsule.flashcards.length===0){
      content.innerHTML = "<p>No flashcards yet.</p>";
      return;
    }

    const card = capsule.flashcards[flashIndex];
    const known = progress.knownFlashcards.includes(flashIndex);

    content.innerHTML = `
      <div class="flip-container" style="perspective:1000px; width:300px; margin:auto;">
        <div class="flip-card" style="position:relative; width:100%; height:200px; text-align:center; transition:transform 0.6s; transform-style:preserve-3d;">
          <div class="front" style="position:absolute; width:100%; height:100%; backface-visibility:hidden; display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid #ccc; border-radius:8px;">
            ${card.front}
          </div>
          <div class="back" style="position:absolute; width:100%; height:100%; backface-visibility:hidden; transform:rotateY(180deg); display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid #ccc; border-radius:8px; background:#f8f9fa;">
            ${card.back}
          </div>
        </div>
      </div>
      <div class="mt-3 text-center">
        <button class="btn btn-sm btn-primary flip">Flip</button>
        <button class="btn btn-sm btn-success known">${known?"Known ✅":"Known"}</button>
        <button class="btn btn-sm btn-secondary unknown">Unknown</button>
      </div>
      <div class="mt-2 text-center">
        <button class="btn btn-sm btn-outline-primary prev">Prev</button>
        <span>${flashIndex+1}/${capsule.flashcards.length}</span>
        <button class="btn btn-sm btn-outline-primary next">Next</button>
      </div>
    `;

    const flipCard = content.querySelector(".flip-card");
    let flipped = false;

    content.querySelector(".flip").onclick = () => {
      flipped = !flipped;
      flipCard.style.transform = flipped ? "rotateY(180deg)" : "rotateY(0deg)";
    };

    content.querySelector(".known").onclick = () => {
      if(!known) progress.knownFlashcards.push(flashIndex);
      storage.save(`pc_progress_${capsuleId}`,progress);
      window.dispatchEvent(new Event("pc:update")); 
      renderFlashcards();
    };

    content.querySelector(".unknown").onclick = () => {
      progress.knownFlashcards = progress.knownFlashcards.filter(i=>i!==flashIndex);
      storage.save(`pc_progress_${capsuleId}`,progress);
      window.dispatchEvent(new Event("pc:update")); 
      renderFlashcards();
    };

    content.querySelector(".prev").onclick = ()=>{ if(flashIndex>0) flashIndex--; renderFlashcards(); };
    content.querySelector(".next").onclick = ()=>{ if(flashIndex<capsule.flashcards.length-1) flashIndex++; renderFlashcards(); };
  }

  function renderQuiz() {
    const content = wrapper.querySelector("#learnContent");
    if(!capsule.quiz || capsule.quiz.length===0){
      content.innerHTML = "<p>No quiz questions yet.</p>";
      return;
    }

    if(quizIndex >= capsule.quiz.length){
      const score = Math.round((correctAnswers / capsule.quiz.length) * 100);
      progress.bestScore = Math.max(progress.bestScore, score);
      storage.save(`pc_progress_${capsuleId}`, progress);
      window.dispatchEvent(new Event("pc:update"));
      content.innerHTML = `
        <div class="alert alert-info">Quiz finished! Score: ${score}% | Best: ${progress.bestScore}%</div>
        <button class="btn btn-primary restart">Restart Quiz</button>
      `;
      content.querySelector(".restart").onclick = () => {
        quizIndex = 0;
        correctAnswers = 0;
        answered = Array(capsule.quiz.length).fill(false);
        renderQuiz();
      };
      return;
    }

    const q = capsule.quiz[quizIndex];
    content.innerHTML = `
      <div class="card">
        <div class="card-body">
          <p class="fw-bold">${q.question}</p>
          <ul class="list-group">
            ${q.choices.map((c,i)=>{
              const letter = String.fromCharCode(65+i);
              return `<li class="list-group-item list-group-item-action choice" data-index="${i}" style="cursor:pointer;"><strong>${letter}.</strong> ${c}</li>`;
            }).join("")}
          </ul>
        </div>
      </div>
    `;

    const buttons = content.querySelectorAll(".choice");
    buttons.forEach(btn=>{
      btn.onclick = ()=> selectQuiz(btn);
    });

    function selectQuiz(btn){
      const selected = parseInt(btn.dataset.index);
      if(!answered[quizIndex]){
        if(selected===q.correct) correctAnswers++;
        answered[quizIndex]=true;
      }

      buttons.forEach(b=>b.classList.remove("list-group-item-success","list-group-item-danger"));
      if(selected===q.correct) btn.classList.add("list-group-item-success");
      else btn.classList.add("list-group-item-danger");

      quizIndex++;
      setTimeout(renderQuiz,700);
    }
  }

  function updateProgressBar(){
    const flashKnown = progress.knownFlashcards.length;
    const flashTotal = capsule.flashcards.length;
    const best = progress.bestScore;
    const percent = flashTotal>0 ? Math.round((flashKnown/flashTotal)*100) : 0;
    const bar = wrapper.querySelector("#progressBar");
    if(!bar) return;
    bar.style.width = `${percent}%`;
    bar.textContent = `Known: ${flashKnown}/${flashTotal} | Best Quiz: ${best}%`;
  }

  document.onkeydown = e=>{
    // Flashcards
    if(currentTab==="flashcards"){
      if(e.code==="Space"){ e.preventDefault(); wrapper.querySelector(".flip")?.click(); }
      if(e.code==="Delete"){ e.preventDefault(); wrapper.querySelector(".unknown")?.click(); }
    }

    // Quiz
    if(currentTab==="quiz"){
      const key = e.key.toUpperCase();
      if(key>="A" && key<="Z"){
        const idx = key.charCodeAt(0)-65;
        const buttons = wrapper.querySelectorAll(".choice");
        if(idx<buttons.length) buttons[idx].click();
      }
    }

    // Tab toggle with /
    if(e.key==="/"){
      e.preventDefault();
      if(currentTab==="notes") currentTab="flashcards";
      else if(currentTab==="flashcards") currentTab="quiz";
      else currentTab="notes";
      wrapper.querySelectorAll(".nav-link").forEach(t=>t.classList.remove("active"));
      wrapper.querySelector(`.nav-link[data-tab="${currentTab}"]`)?.classList.add("active");
      renderContent();
    }
  };
}
