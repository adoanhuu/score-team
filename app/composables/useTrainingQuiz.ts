// "Quiz blasons" training exercise, ported from app.js's
// trainingQuizShieldsSessionState + loadNextQuizShieldsQuestion()/
// handleQuizShieldsAnswer()/showQuizShieldsResults(). Ephemeral: no result
// or category selection is persisted.
import { useState } from "nuxt/app";
import { QUIZ_SHIELDS_NEXT_DELAY_MS, buildQuizShieldsPool, type QuizShieldQuestion, type ShieldCategory } from "~/utils/training-quiz";

interface TrainingQuizState {
    running: boolean;
    totalQuestions: number;
    currentQuestion: number;
    score: number;
    selectedCategories: ShieldCategory[];
    questionPool: QuizShieldQuestion[];
    currentShield: QuizShieldQuestion | null;
    answered: boolean;
    lastAnswerCategory: ShieldCategory | null;
    showResults: boolean;
}

function buildInitialState(): TrainingQuizState {
    return {
        running: false,
        totalQuestions: 0,
        currentQuestion: 0,
        score: 0,
        selectedCategories: ["PA", "PG", "MG", "GG"],
        questionPool: [],
        currentShield: null,
        answered: false,
        lastAnswerCategory: null,
        showResults: false,
    };
}

// Timeout id kept at module scope (like app.js's
// quizShieldsNextQuestionTimeoutId) so any useTrainingQuiz() instance can
// clear a pending "next question" timer, e.g. when leaving /entrainement.
let quizShieldsNextQuestionTimeoutId: number | null = null;

function clearNextQuestionTimeout() {
    if (quizShieldsNextQuestionTimeoutId !== null) {
        window.clearTimeout(quizShieldsNextQuestionTimeoutId);
        quizShieldsNextQuestionTimeoutId = null;
    }
}

export function useTrainingQuiz() {
    const state = useState<TrainingQuizState>("training-quiz-state", buildInitialState);

    const resultPercentage = computed(() =>
        state.value.totalQuestions > 0 ? Math.round((state.value.score / state.value.totalQuestions) * 100) : 0,
    );

    function loadNextQuestion() {
        clearNextQuestionTimeout();
        state.value.currentQuestion += 1;
        state.value.answered = false;
        state.value.lastAnswerCategory = null;

        if (state.value.currentQuestion > state.value.totalQuestions) {
            state.value.showResults = true;
            return;
        }
        state.value.currentShield = state.value.questionPool[state.value.currentQuestion - 1] ?? null;
    }

    function start(selectedCategories: ShieldCategory[]): boolean {
        clearNextQuestionTimeout();
        const questionPool = buildQuizShieldsPool(selectedCategories);
        if (questionPool.length === 0) return false;

        state.value = {
            running: true,
            totalQuestions: questionPool.length,
            currentQuestion: 0,
            score: 0,
            selectedCategories,
            questionPool,
            currentShield: null,
            answered: false,
            lastAnswerCategory: null,
            showResults: false,
        };
        loadNextQuestion();
        return true;
    }

    function answer(selectedCategory: ShieldCategory) {
        if (!state.value.running || state.value.answered || !state.value.currentShield) return;
        state.value.answered = true;
        state.value.lastAnswerCategory = selectedCategory;
        if (selectedCategory === state.value.currentShield.category) {
            state.value.score += 1;
        }
        quizShieldsNextQuestionTimeoutId = window.setTimeout(() => {
            quizShieldsNextQuestionTimeoutId = null;
            if (!state.value.running || !state.value.answered) return;
            loadNextQuestion();
        }, QUIZ_SHIELDS_NEXT_DELAY_MS);
    }

    // Mirrors restartQuizShields(): returns false (session left untouched)
    // when no shield is available, so the caller can flash the legacy message.
    function restart(): boolean {
        if (!state.value.running) return false;
        return start(state.value.selectedCategories);
    }

    function close() {
        clearNextQuestionTimeout();
        state.value = buildInitialState();
    }

    return { state, resultPercentage, start, answer, restart, close };
}
