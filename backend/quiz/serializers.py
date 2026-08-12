from rest_framework import serializers


class QuizRequestSerializer(serializers.Serializer):
    """Validates the parameters coming from the frontend setup form."""

    subject = serializers.CharField(max_length=100)
    topic = serializers.CharField(max_length=200)
    difficulty = serializers.ChoiceField(choices=["easy", "medium", "hard"])
    num_questions = serializers.IntegerField(min_value=1, max_value=25)
    include_explanations = serializers.BooleanField(default=True)
