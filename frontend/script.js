// Point this at your Django backend. Change the port if you run it elsewhere.
const API_BASE_URL = "http://127.0.0.1:8000/api";

// ---- Difficulty dial ----
// Precomputed arc endpoints for a 3-position gauge (see the semicircle in index.html).
const DIAL_STATES = {
  easy:   { d: "M10 70 A60 60 0 0 1 24.04 31.42", knob: [24.04, 31.42], color: "var(--aqua)" },
  medium: { d: "M10 70 A60 60 0 0 1 70 10",        knob: [70, 10],       color: "var(--sky)" },
  hard:   { d: "M10 70 A60 60 0 0 1 115.96 31.42", knob: [115.96, 31.42], color: "var(--coral)" },
};

let selectedDifficulty = "medium";
let quizData = null;
let currentIndex = 0;
let userAnswers = [];

const els = {
  form: document.getElementById("quiz-form"),
  subject: document.getElementById("subject"),
  topic: document.getElementById("topic"),
  numQuestions: document.getElementById("num-questions"),
  numQuestionsValue: document.getElementById("num-questions-value"),
  includeExplanations: document.getElementById("include-explanations"),
  diffOptions: document.querySelectorAll(".diff-option"),
  dialFill: document.getElementById("dial-fill"),
  dialKnob: document.getElementById("dial-knob"),
  setupError: document.getElementById("setup-error"),
  generateBtn: document.getElementById("generate-btn"),
  screens: {
    setup: document.getElementById("screen-setup"),
    loading: document.getElementById("screen-loading"),
    quiz: document.getElementById("screen-quiz"),
    results: document.getElementById("screen-results"),
  },
  questionCounter: document.getElementById("question-counter"),
  progressFill: document.getElementById("progress-fill"),
  questionText: document.getElementById("question-text"),
  optionsList: document.getElementById("options-list"),
  prevBtn: document.getElementById("prev-btn"),
  nextBtn: document.getElementById("next-btn"),
  scoreValue: document.getElementById("score-value"),
  resultsList: document.getElementById("results-list"),
  retakeBtn: document.getElementById("retake-btn"),
};

function showScreen(name) {
  Object.values(els.screens).forEach((s) => s.classList.remove("active"));
  els.screens[name].classList.add("active");
}

function setDial(difficulty) {
  const state = DIAL_STATES[difficulty];
  els.dialFill.setAttribute("d", state.d);
  els.dialFill.style.stroke = state.color;
  els.dialKnob.setAttribute("cx", state.knob[0]);
  els.dialKnob.setAttribute("cy", state.knob[1]);
  els.dialKnob.style.fill = state.color;
  document.documentElement.style.setProperty("--dial-fill", state.color);
}

els.diffOptions.forEach((btn) => {
  btn.addEventListener("click", () => {
    els.diffOptions.forEach((b) => b.classList.remove("is-selected"));
    btn.classList.add("is-selected");
    selectedDifficulty = btn.dataset.value;
    setDial(selectedDifficulty);
  });
});

els.numQuestions.addEventListener("input", () => {
  els.numQuestionsValue.textContent = els.numQuestions.value;
});

// ---- Form submission -> call the backend ----
els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.setupError.hidden = true;
  els.generateBtn.disabled = true;
  showScreen("loading");

  const payload = {
    subject: els.subject.value.trim(),
    topic: els.topic.value.trim(),
    difficulty: selectedDifficulty,
    num_questions: Number(els.numQuestions.value),
    include_explanations: els.includeExplanations.checked,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/generate-quiz/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong generating the quiz.");
    }

    quizData = data.questions;
    userAnswers = new Array(quizData.length).fill(null);
    currentIndex = 0;
    renderQuestion();
    showScreen("quiz");
  } catch (err) {
    showScreen("setup");
    els.setupError.textContent = err.message || "Couldn't reach the quiz server. Is it running?";
    els.setupError.hidden = false;
  } finally {
    els.generateBtn.disabled = false;
  }
});

// ---- Quiz rendering ----
function renderQuestion() {
  const q = quizData[currentIndex];
  els.questionCounter.textContent = `Question ${currentIndex + 1} of ${quizData.length}`;
  els.progressFill.style.width = `${((currentIndex + 1) / quizData.length) * 100}%`;
  els.questionText.textContent = q.question;

  els.optionsList.innerHTML = "";
  q.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = option;
    if (userAnswers[currentIndex] === option) btn.classList.add("is-selected");
    btn.addEventListener("click", () => {
      userAnswers[currentIndex] = option;
      renderQuestion();
    });
    els.optionsList.appendChild(btn);
  });

  els.prevBtn.disabled = currentIndex === 0;
  els.nextBtn.textContent = currentIndex === quizData.length - 1 ? "Finish" : "Next";
}

els.prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex -= 1;
    renderQuestion();
  }
});

els.nextBtn.addEventListener("click", () => {
  if (currentIndex < quizData.length - 1) {
    currentIndex += 1;
    renderQuestion();
  } else {
    showResults();
  }
});

// ---- Scoring & results ----
function showResults() {
  let score = 0;
  els.resultsList.innerHTML = "";

  quizData.forEach((q, i) => {
    const isCorrect = userAnswers[i] === q.correct_answer;
    if (isCorrect) score += 1;

    const item = document.createElement("div");
    item.className = `result-item ${isCorrect ? "correct" : "incorrect"}`;

    const qEl = document.createElement("div");
    qEl.className = "result-q";
    qEl.textContent = `${i + 1}. ${q.question}`;
    item.appendChild(qEl);

    const yourAnswer = document.createElement("div");
    yourAnswer.className = `result-answer ${isCorrect ? "correct-answer" : "wrong-answer"}`;
    yourAnswer.textContent = `Your answer: ${userAnswers[i] || "Skipped"}`;
    item.appendChild(yourAnswer);

    if (!isCorrect) {
      const correctEl = document.createElement("div");
      correctEl.className = "result-answer correct-answer";
      correctEl.textContent = `Correct answer: ${q.correct_answer}`;
      item.appendChild(correctEl);
    }

    if (q.explanation) {
      const expl = document.createElement("div");
      expl.className = "result-explanation";
      expl.textContent = q.explanation;
      item.appendChild(expl);
    }

    els.resultsList.appendChild(item);
  });

  els.scoreValue.textContent = score;
  document.querySelector(".score-total").textContent = `/ ${quizData.length}`;
  showScreen("results");
}

els.retakeBtn.addEventListener("click", () => {
  quizData = null;
  userAnswers = [];
  currentIndex = 0;
  els.form.reset();
  els.numQuestionsValue.textContent = els.numQuestions.value;
  showScreen("setup");
});

// Initialize dial to its default (medium)
setDial(selectedDifficulty);
