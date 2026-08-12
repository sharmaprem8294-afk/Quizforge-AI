import json

from django.conf import settings
from google import genai
from google.genai import types
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .serializers import QuizRequestSerializer

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Every question returned by the model must match this shape exactly.
QUIZ_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "options": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "correct_answer": {"type": "string"},
                    "explanation": {"type": "string"},
                },
                "required": ["question", "options", "correct_answer", "explanation"],
            },
        }
    },
    "required": ["questions"],
}


class QuizGenerationThrottle(AnonRateThrottle):
    scope = "quiz-generation"


def build_prompt(data):
    explanation_note = (
        "Include a one-sentence explanation for each correct answer."
        if data["include_explanations"]
        else "Explanations can be left as an empty string."
    )
    return (
        f"Generate exactly {data['num_questions']} multiple-choice quiz questions "
        f"on the topic '{data['topic']}' within the subject '{data['subject']}', "
        f"at {data['difficulty']} difficulty. Each question must have exactly 4 "
        f"options, with only one correct answer. {explanation_note}"
    )


class GenerateQuizView(APIView):
    throttle_classes = [QuizGenerationThrottle]

    def post(self, request):
        serializer = QuizRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            response = client.models.generate_content(
                model="gemini-flash-latest",
                contents=build_prompt(data),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=QUIZ_SCHEMA,
                ),
            )
        except Exception as exc:
            return Response(
                {"error": f"AI service error: {exc}"}, status=502
            )

        try:
            quiz_data = json.loads(response.text)
        except (json.JSONDecodeError, AttributeError):
            return Response(
                {"error": "AI returned an unreadable response. Try again."},
                status=502,
            )

        # Belt-and-braces check even though the schema is enforced server-side.
        for q in quiz_data.get("questions", []):
            if len(q["options"]) != 4 or q["correct_answer"] not in q["options"]:
                return Response(
                    {"error": "Malformed question received from AI"}, status=502
                )

        return Response(quiz_data)