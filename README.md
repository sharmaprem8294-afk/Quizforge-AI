# Quizforge — AI quiz generator

A quiz generator where a user picks subject, topic, difficulty, and question
count (up to 25), and an AI model generates a 4-option multiple-choice quiz.

## Structure

```
ai-quiz-generator/
├── backend/     Django + DRF API that calls the AI model
└── frontend/    Plain HTML/CSS/JS UI (no build step, no framework)
```

## Quickstart

See the step-by-step guide in chat, or the short version below.

**Backend**
```
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then paste your ANTHROPIC_API_KEY into .env
python manage.py migrate
python manage.py runserver
```

**Frontend**
Open `frontend/index.html` with VS Code's Live Server extension (or any
static file server). It calls the backend at `http://127.0.0.1:8000/api`.

If your frontend runs on a port other than 5500/5501, add it to
`CORS_ALLOWED_ORIGINS` in `backend/quizproject/settings.py`.
