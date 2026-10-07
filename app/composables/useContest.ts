// Concours (contest) linking for Mode Multi's third sub-mode. Mirrors app.js's
// connectToContest()/startContestScoring()/upsertContestUserFromLocalProfile()/
// openContestModal() family: joining an existing contest reuses Mode Solo's
// own scoring engine (via useSoloSession) tagged with contestMode/contestInfo,
// with periodic progress sync to the backend (every SYNC_EVERY_N_VOLLEYS
// volleys + on completion). Creating a contest is out of scope (join only).
import type { Ruleset } from "~/utils/scoring-format";
import {
    getTargetCountForRuleset,
    getWeaponsForRuleset,
    isWeaponAllowedForRuleset,
    normalizeScoringMode,
    presets,
} from "~/utils/scoring-engine";
import { translateErrorToFrench } from "./useErrorTranslation";
import { getCurrentSessionDateTime, type ContestInfo } from "./useSoloSession";

/** Mirrors app.js's contest score auto-sync cadence. */
const SYNC_EVERY_N_VOLLEYS = 3;

/** Same localStorage keys as app.js (CONTEST_UUID_KEY / CONTEST_WEAPON_KEY); CONTEST_PROGRESS_KEY lives in useSoloSession. */
const CONTEST_UUID_KEY = "score-team-contest-uuid-v1";
const CONTEST_WEAPON_KEY = "score-team-contest-weapon-v1";

/** Raw contest returned by POST /api/contest/connect. */
export interface ContestConnectPayload {
    id?: number | string;
    uuid: string;
    name?: string;
    ruleset?: string;
    start_date?: string;
    end_date?: string;
}

/** Mirrors getStoredContestUuid(). */
export function getStoredContestUuid(): string {
    try {
        return (window.localStorage.getItem(CONTEST_UUID_KEY) || "").trim();
    } catch {
        return "";
    }
}

/** Mirrors getStoredContestWeapon(). */
export function getStoredContestWeapon(): string {
    try {
        return (window.localStorage.getItem(CONTEST_WEAPON_KEY) || "").trim();
    } catch {
        return "";
    }
}

/** Mirrors storeContestWeapon(). */
export function storeContestWeapon(weapon: string) {
    if (typeof weapon !== "string") return;
    const normalizedWeapon = weapon.trim();
    try {
        if (!normalizedWeapon) {
            window.localStorage.removeItem(CONTEST_WEAPON_KEY);
            return;
        }
        window.localStorage.setItem(CONTEST_WEAPON_KEY, normalizedWeapon);
    } catch {
        // Ignore storage failures.
    }
}

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

    const { showFlash } = useFlash();
    const { config } = useConfig();

    /**
     * Mirrors app.js's connectToContest(): POST /api/contest/connect with the
     * join code + ruleset (does not create one). Flashes the legacy messages,
     * stores the UUID on success. Returns the raw contest, `null` when not
     * found / invalid / network error, `false` on an HTTP error.
     */
    async function connect(code: string, ruleset: Ruleset | string): Promise<ContestConnectPayload | null | false> {
        error.value = "";
        const uuid = code.trim();
        let payload: { exists?: boolean; contest?: ContestConnectPayload; error?: string } | null = null;
        try {
            payload = await $fetch<{ exists?: boolean; contest?: ContestConnectPayload }>("/api/contest/connect", {
                method: "POST",
                body: { uuid, ruleset },
            });
        } catch (err: any) {
            // $fetch throws a FetchError: with a `response` for HTTP errors
            // (app.js's !response.ok branch), without one for network failures.
            if (err?.response) {
                const errorPayload = err.data && typeof err.data === "object" ? err.data : null;
                error.value = errorPayload?.error
                    ? translateErrorToFrench(errorPayload.error)
                    : "Impossible de se connecter au concours.";
                showFlash(error.value);
                return false;
            }
            error.value = "Erreur réseau lors de la connexion au concours.";
            showFlash(error.value);
            return null;
        }

        if (!payload?.exists) {
            error.value = "Concours introuvable pour ce code et ce parcours.";
            showFlash(error.value);
            return null;
        }

        try {
            window.localStorage.setItem(CONTEST_UUID_KEY, uuid);
        } catch {
            // Ignore storage errors.
        }

        if (!payload.contest || typeof payload.contest !== "object") {
            error.value = "Réponse concours invalide.";
            showFlash(error.value);
            return null;
        }

        showFlash("Connexion au concours réussie.");
        return payload.contest;
    }

    /**
     * Mirrors app.js's startContestScoring(): configures useSoloSession for
     * individual, contest-linked scoring, restores local progress and sends
     * a first contest-user upsert. Returns false for an invalid contest.
     */
    function startContestScoring(contest: ContestConnectPayload, preferredWeapon = ""): boolean {
        if (!contest || !contest.ruleset || !presets[contest.ruleset as Ruleset]) {
            showFlash("Configuration concours invalide.");
            return false;
        }
        const ruleset = contest.ruleset as Ruleset;
        const scoringMode = normalizeScoringMode("individual", ruleset);
        const weapon = preferredWeapon && isWeaponAllowedForRuleset(preferredWeapon, ruleset)
            ? preferredWeapon
            : getWeaponsForRuleset(ruleset)[0] ?? "";
        if (weapon) storeContestWeapon(weapon);

        const contestInfo: ContestInfo = {
            id: contest.id,
            uuid: contest.uuid,
            name: contest.name || "Concours",
            ruleset,
            startDate: contest.start_date || "",
            endDate: contest.end_date || "",
        };
        // app.js's startScoring() reads the success-zone slider, which the ruleset/weapon
        // change reloads from appConfig.successZoneByRuleset["ruleset:mode:weapon"]
        // (else keeps its current value); configureForSetup() clamps it.
        const savedZone = config.value.successZoneByRuleset?.[`${ruleset}:${scoringMode}:${weapon}`];
        const successZone = Number.isInteger(savedZone) && (savedZone as number) >= 1
            ? (savedZone as number)
            : solo.state.value.successZone || 1;
        // Local date/time (not UTC), as app.js's getCurrentSessionDateTime().
        const { date, time } = getCurrentSessionDateTime();
        solo.startScoring({
            ruleset,
            scoringMode,
            weapon,
            lieu: "",
            sessionDate: date,
            sessionTime: time,
            contestIdentifier: "",
            useTargetGroups: false,
            soloSessionType: "training",
            timerMode: "none",
            showScores: true,
            successZone,
            targetCount: getTargetCountForRuleset(ruleset),
        });
        solo.configureContest(contestInfo);

        // Local progress persistence/restore lives in useSoloSession (persistContestProgressState / restoreContestProgressState).
        if (solo.restoreContestProgress(contestInfo)) {
            showFlash("Scores concours restaurés.");
        }

        void syncProgress();
        return true;
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
            successZone: solo.state.value.successZone,
            completed: solo.isComplete.value,
            total: solo.totalScore.value,
            volleys: solo.state.value.volleys,
            // app.js's snapshot shape, read back by restoreSoloContestUserProgress().
            shoots: solo.state.value.volleys.map((volley) => [...volley.arrows]),
            shootGroups: solo.state.value.volleys.map((volley) => volley.group),
        };
    }

    /** Pushes current progress to the contest backend (mirrors upsertContestUserFromLocalProfile). */
    async function syncProgress() {
        const info = solo.state.value.contestInfo;
        if (!solo.state.value.contestMode || !info) return;
        // app.js skips the upsert when there is neither a solo participant nor an auth token.
        if (!token.value) return;
        const weapon = (solo.state.value.weapon || "").trim() || "-";
        try {
            await $fetch("/api/contest/users", {
                method: "POST",
                headers: { authorization: `Bearer ${token.value}` },
                body: {
                    contest_uuid: info.uuid,
                    first_name: (user.value?.firstName ?? "").trim() || "Archer",
                    last_name: (user.value?.lastName ?? "").trim() || "Inconnu",
                    weapon,
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
        startContestScoring,
        syncProgress,
        fetchCurrent,
        reset,
    };
}
