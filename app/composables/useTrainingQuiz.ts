// "Quiz blasons" training exercise, ported from app.js's
// trainingQuizShieldsSessionState + loadNextQuizShieldsQuestion()/
// handleQuizShieldsAnswer()/showQuizShieldsResults(). Ephemeral: no result
// or category selection is persisted.
import { buildQuizShieldsPool, type QuizShieldQuestion, type ShieldCategory } from "~/utils/training-quiz";

export const QUIZ_SHIELDS_NEXT_DELAY_MS = 2000;

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

export function useTrainingQuiz() {
    const state = useState<TrainingQuizState>("training-quiz-state", buildInitialState);
    let nextQuestionTimeoutId: number | null = null;

    function clearNextQuestionTimeout() {
        if (nextQuestionTimeoutId !== null) {
            window.clearTimeout(nextQuestionTimeoutId);
            nextQuestionTimeoutId = null;
        }
    }

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
        nextQuestionTimeoutId = window.setTimeout(() => {
            nextQuestionTimeoutId = null;
            if (!state.value.running || !state.value.answered) return;
            loadNextQuestion();
        }, QUIZ_SHIELDS_NEXT_DELAY_MS);
    }

    function restart() {
        if (!state.value.running) return;
        start(state.value.selectedCategories);
    }

    function close() {
        clearNextQuestionTimeout();
        state.value = buildInitialState();
    }

    return { state, resultPercentage, start, answer, restart, close };
}
