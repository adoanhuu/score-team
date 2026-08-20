// Concours (contest) linking for Mode Multi's third sub-mode. Mirrors app.js's
// connectToContest()/startContestScoring()/upsertContestUserFromLocalProfile()/
// openContestModal() family: joining an existing contest reuses Mode Solo's
// own scoring engine (via useSoloSession) tagged with contestMode/contestInfo,
// with periodic progress sync to the backend (every SYNC_EVERY_N_VOLLEYS
// volleys + on completion). Creating a contest is out of scope (join only).
import type { Ruleset } from "~/utils/scoring-format";
import { getTargetCountForRuleset, normalizeScoringMode } from "~/utils/scoring-engine";
import type { ContestInfo } from "./useSoloSession";

/** Mirrors app.js's contest score auto-sync cadence. */
const SYNC_EVERY_N_VOLLEYS = 3;

export interface ContestParticipant {
    user_id: string;
    first_name: string;
    last_name: string;
    weapon: string;
    target_number: number;
    total_score: number;
}

export interface ContestDetail {
    uuid: string;
    name: string;
    ruleset: string;
    startDate: string;
    endDate: string;
    maxUsers: number;
    totalUsers: number;
    participants: ContestParticipant[];
}

export interface ContestRankedParticipant {
    archerLabel: string;
    totalScore: number;
    targetNumber: number;
}

export interface ContestStats {
    participantCount: number;
    averageScore: number;
    cumulativeScore: number;
    averageTarget: number;
    bestScore: number;
    bestParticipantLabel: string;
    totalUsers: number;
    maxUsers: number;
}

function initialsOf(firstName: string): string {
    return firstName
        .split(/[\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

function archerLabelOf(participant: ContestParticipant): string {
    const lastName = (participant.last_name || "").trim();
    const firstName = (participant.first_name || "").trim();
    const weapon = (participant.weapon || "").trim();
    const name = [lastName.toUpperCase() || "-", initialsOf(firstName)].filter(Boolean).join(" ");
    return weapon && weapon !== "-" ? `${weapon} - ${name}` : name;
}

export function useContest() {
    const detail = useState<ContestDetail | null>("contest-detail", () => null);
    const loading = useState<boolean>("contest-loading", () => false);
    const error = useState<string>("contest-error", () => "");

    const { token, user } = useAuth();
    const solo = useSoloSession();

    /** Looks up a contest by join code + ruleset (mirrors connectToContest's POST /api/contest/connect). Does not create one. */
    async function connect(code: string, ruleset: Ruleset): Promise<ContestInfo | null> {
        error.value = "";
        const uuid = code.trim();
        if (!uuid) {
            error.value = "Merci de renseigner le code du concours.";
            return null;
        }
        try {
            const payload = await $fetch<{ exists: boolean; contest?: any }>("/api/contest/connect", {
                method: "POST",
                body: { uuid, ruleset },
            });
            if (!payload?.exists || !payload.contest) {
                error.value = "Aucun concours ne correspond à ce code.";
                return null;
            }
            return {
                uuid: payload.contest.uuid,
                name: payload.contest.name || "Concours",
                ruleset: payload.contest.ruleset || ruleset,
                startDate: payload.contest.start_date || "",
                endDate: payload.contest.end_date || "",
            };
        } catch {
            error.value = "Erreur réseau lors de la connexion au concours.";
            return null;
        }
    }

    /** Configures useSoloSession for individual, contest-linked scoring and links it to the given contest (mirrors startContestScoring). */
    function configureAndStartSoloSession(contest: ContestInfo, weapon: string) {
        const ruleset = (contest.ruleset as Ruleset) || "nature";
        const scoringMode = normalizeScoringMode("individual", ruleset);
        solo.startScoring({
            ruleset,
            scoringMode,
            weapon,
            lieu: "",
            sessionDate: new Date().toISOString().slice(0, 10),
            sessionTime: new Date().toISOString().slice(11, 16),
            contestIdentifier: "",
            useTargetGroups: false,
            soloSessionType: "training",
            timerMode: "none",
            showScores: true,
            successZone: 1,
            targetCount: getTargetCountForRuleset(ruleset),
        });
        solo.configureContest(contest);
    }

    /** Builds the progress snapshot pushed to the backend (mirrors buildContestUserDataSnapshot). */
    function buildProgressSnapshot() {
        return {
            updatedAt: new Date().toISOString(),
            ruleset: solo.state.value.ruleset,
            scoringMode: solo.state.value.scoringMode,
            arrowsPerVolley: solo.state.value.arrowsPerVolley,
            targetCount: solo.state.value.targetCount,
            completedTargets: solo.completedVolleys.value,
            completed: solo.isComplete.value,
            total: solo.totalScore.value,
            volleys: solo.state.value.volleys,
        };
    }

    /** Pushes current progress to the contest backend (mirrors upsertContestUserFromLocalProfile). */
    async function syncProgress() {
        const info = solo.state.value.contestInfo;
        if (!solo.state.value.contestMode || !info) return;
        try {
            await $fetch("/api/contest/users", {
                method: "POST",
                headers: token.value ? { authorization: `Bearer ${token.value}` } : {},
                body: {
                    contest_uuid: info.uuid,
                    first_name: user.value?.firstName ?? "",
                    last_name: user.value?.lastName ?? "",
                    weapon: solo.state.value.weapon,
                    data: buildProgressSnapshot(),
                },
            });
        } catch {
            // Best-effort sync: local scoring keeps working even if the push fails.
        }
    }

    /** Auto-syncs every SYNC_EVERY_N_VOLLEYS completed volleys, and once more on completion. */
    watch(
        () => solo.completedVolleys.value,
        (count, previousCount) => {
            if (!solo.state.value.contestMode) return;
            if (count <= previousCount) return;
            if (count % SYNC_EVERY_N_VOLLEYS === 0 || solo.isComplete.value) {
                void syncProgress();
            }
        },
    );

    /** Fetches the contest currently linked to the authenticated user, with participants (mirrors GET /api/contest/current). */
    async function fetchCurrent() {
        loading.value = true;
        error.value = "";
        try {
            const payload = await $fetch<{ found: boolean; contest?: ContestDetail }>("/api/contest/current", {
                method: "GET",
                headers: token.value ? { authorization: `Bearer ${token.value}` } : {},
            });
            detail.value = payload?.found && payload.contest ? payload.contest : null;
            if (!detail.value) error.value = "Aucun concours actif pour le moment.";
        } catch {
            detail.value = null;
            error.value = "Erreur réseau lors du chargement du concours.";
        } finally {
            loading.value = false;
        }
    }

    /** Participants sorted by score desc / target desc / name (mirrors buildContestRankingMarkup). */
    const ranking = computed<ContestRankedParticipant[]>(() => {
        const participants = detail.value?.participants ?? [];
        return [...participants]
            .map((participant) => ({
                archerLabel: archerLabelOf(participant),
                totalScore: Number(participant.total_score) || 0,
                targetNumber: Number(participant.target_number) || 0,
            }))
            .sort((a, b) => {
                if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
                if (b.targetNumber !== a.targetNumber) return b.targetNumber - a.targetNumber;
                return a.archerLabel.localeCompare(b.archerLabel, "fr");
            });
    });

    /** Mirrors buildContestStatsMarkup. */
    const stats = computed<ContestStats>(() => {
        const participants = detail.value?.participants ?? [];
        const participantCount = participants.length;
        const totals = participants.map((p) => Number(p.total_score) || 0);
        const targets = participants.map((p) => Number(p.target_number) || 0);
        const cumulativeScore = totals.reduce((sum, value) => sum + value, 0);
        const averageScore = participantCount > 0 ? cumulativeScore / participantCount : 0;
        const averageTarget = participantCount > 0 ? targets.reduce((sum, value) => sum + value, 0) / participantCount : 0;

        let bestParticipantLabel = "-";
        let bestScore = 0;
        participants.forEach((participant) => {
            const totalScore = Number(participant.total_score) || 0;
            if (totalScore < bestScore) return;
            bestScore = totalScore;
            bestParticipantLabel = archerLabelOf(participant);
        });

        return {
            participantCount,
            averageScore,
            cumulativeScore,
            averageTarget,
            bestScore,
            bestParticipantLabel,
            totalUsers: detail.value?.totalUsers ?? 0,
            maxUsers: detail.value?.maxUsers ?? 0,
        };
    });

    function reset() {
        detail.value = null;
        error.value = "";
        loading.value = false;
    }

    return {
        detail,
        loading,
        error,
        ranking,
        stats,
        connect,
        configureAndStartSoloSession,
        syncProgress,
        fetchCurrent,
        reset,
    };
}
