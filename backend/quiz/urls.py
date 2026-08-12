from django.urls import path

from .views import GenerateQuizView

urlpatterns = [
    path("generate-quiz/", GenerateQuizView.as_view(), name="generate-quiz"),
]
