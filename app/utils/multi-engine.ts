import type { Ruleset } from "./scoring-format";
import { scoreToValue, getSelectablePointsForArrow, type ScoringMode } from "./scoring-engine";

/**
 * Pure, stateless helpers for Mode Multi (Duel + Peloton), ported from
 * app.js's duel-bot / peloton-bonus / handicap logic. See
 * app/composables/useDuelSession.ts and app/composables/usePelotonSession.ts
 * for the stateful machines that use these.
 */

export type MultiScore = number | null;

/* ---------------------------------------------------------------------- */
/* Duel bot ("Paquito")                                                   */
/* ---------------------------------------------------------------------- */

function mixHexColor(hexA: string, hexB: string, ratio: number): string {
    const parse = (hex: string) => [
        Number.parseInt(hex.slice(1, 3), 16),
        Number.parseInt(hex.slice(3, 5), 16),
        Number.parseInt(hex.slice(5, 7), 16),
    ];
    const [r1, g1, b1] = parse(hexA);
    const [r2, g2, b2] = parse(hexB);
    const mix = (a: number, b: number) => Math.round(a + (b - a) * ratio);
    const r = mix(r1, r2);
    const g = mix(g1, g2);
    const b = mix(b1, b2);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Mirrors app.js's getDuelBotSliderColor(). */
export function getDuelBotSliderColor(level: number): string {
    const normalized = Math.max(0, Math.min(1, level / 20));
    const colorStops = [
        { at: 0, color: "#1f6feb" },
        { at: 0.25, color: "#2d6a4f" },
        { at: 0.5, color: "#facc15" },
        { at: 0.75, color: "#f59e0b" },
        { at: 1, color: "#c62828" },
    ];
    for (let i = 0; i < colorStops.length - 1; i += 1) {
        const left = colorStops[i]!;
        const right = colorStops[i + 1]!;
        if (normalized <= right.at) {
            const localRatio = (normalized - left.at) / (right.at - left.at);
            return mixHexColor(left.color, right.color, localRatio);
        }
    }
    return colorStops[colorStops.length - 1]!.color;
}

/** Mirrors app.js's updateDuelBotLevelUI()'s label/avatar mapping. */
export function getDuelBotLevelInfo(level: number): { label: string; avatarLevel: number } {
    if (level === 20) return { label: "Élite", avatarLevel: 6 };
    if (level >= 18) return { label: "Expert", avatarLevel: 5 };
    if (level >= 14) return { label: "Pro", avatarLevel: 4 };
    if (level >= 10) return { label: "Avancé", avatarLevel: 3 };
    if (level >= 8) return { label: "Intermédiare", avatarLevel: 2 };
    return { label: "Débutant", avatarLevel: 1 };
}

/** Mirrors app.js's getDuelBotMissChance(). */
export function getDuelBotMissChance(level: number): number {
    const safeLevel = Math.min(20, Math.max(1, Number(level) || 1));
    const minMissChance = 0.03;
    const hyperbolaBase = -0.005263157894736858;
    const hyperbolaScale = 1.2157894736842105;
    const hyperbolaOffset = 2;
    const rawMissChance = hyperbolaBase + hyperbolaScale / (safeLevel + hyperbolaOffset);
    return Math.max(minMissChance, rawMissChance);
}

/** Mirrors app.js's getDuelBotMinimumArrowScore(). */
export function getDuelBotMinimumArrowScore(level: number): number {
    const safeLevel = Math.min(20, Math.max(1, Number(level) || 1));
    if (safeLevel === 20) return 8;
    if (safeLevel >= 14 && safeLevel < 18) return 5;
    return 0;
}

/** Mirrors app.js's isDuelBotExpertLevel(). */
export function isDuelBotExpertLevel(level: number): boolean {
    const safeLevel = Math.min(20, Math.max(1, Number(level) || 1));
    return safeLevel >= 18 && safeLevel < 20;
}

/** Mirrors app.js's pickDuelBotScore(). */
export function pickDuelBotScore(
    selectablePoints: number[],
    level: number,
    options: { currentTargetScores?: MultiScore[] } = {},
): number {
    if (!Array.isArray(selectablePoints) || selectablePoints.length === 0) return 0;

    const sorted = [...selectablePoints].sort((a, b) => scoreToValue(b) - scoreToValue(a));
    const minimumArrowScore = getDuelBotMinimumArrowScore(level);
    const currentTargetScores = Array.isArray(options.currentTargetScores) ? options.currentTargetScores : [];
    const hasTargetMiss = currentTargetScores.some((value) => scoreToValue(value) === 0);
    const forbidMiss = minimumArrowScore > 0 || (isDuelBotExpertLevel(level) && hasTargetMiss);
    const allScoringPoints = sorted.filter((point) => scoreToValue(point) > 0);
    const constrainedScoringPoints = minimumArrowScore > 0
        ? allScoringPoints.filter((point) => scoreToValue(point) >= minimumArrowScore)
        : allScoringPoints;
    const scoringOnly = constrainedScoringPoints.length > 0 ? constrainedScoringPoints : allScoringPoints.slice(0, 1);
    const missValue = forbidMiss ? undefined : sorted.find((point) => scoreToValue(point) === 0);
    if (scoringOnly.length === 0) return missValue ?? 0;

    const missChance = getDuelBotMissChance(level);
    const topBandChance = Math.min(0.95, 0.1 + level * 0.035);
    const highBandCount = Math.max(1, Math.ceil(scoringOnly.length * 0.45));
    const highBand = scoringOnly.slice(0, highBandCount);
    const lowBand = scoringOnly.slice(highBandCount);

    const roll = Math.random();
    if (missValue !== undefined && roll < missChance) {
        return missValue;
    }

    const roll2 = Math.random();
    const pool = roll2 < topBandChance || lowBand.length === 0 ? highBand : lowBand;

    const spread = Math.max(0, pool.length - 1);
    const exponent = 1 + level * 0.12;
    const index = Math.min(spread, Math.floor(roll2 ** exponent * (spread + 1)));
    return pool[index] ?? pool[0]!;
}

/* ---------------------------------------------------------------------- */
/* Duel totals & handicap                                                  */
/* ---------------------------------------------------------------------- */

/** Mirrors app.js's getDuelTotal(). */
export function getDuelTotal(scores: MultiScore[][]): number {
    let total = 0;
    for (const targetArrows of scores) {
        if (Array.isArray(targetArrows)) {
            for (const arrowScore of targetArrows) total += scoreToValue(arrowScore);
        } else {
            total += scoreToValue(targetArrows as unknown as MultiScore);
        }
    }
    return total;
}

/** Mirrors app.js's getDuelDisplayTotals(): applies the handicap % visually only. */
export function getDuelDisplayTotals(
    scoresP1: MultiScore[][],
    scoresP2: MultiScore[][],
    nameP2: string,
    handicap: number,
): { p1Total: number; p2Total: number } {
    const safeHandicap = nameP2?.trim().toLowerCase() === "paquito"
        ? 0
        : Number.isInteger(handicap)
            ? Math.min(50, Math.max(-50, handicap))
            : 0;
    const rawP1Total = getDuelTotal(scoresP1 || []);
    const rawP2Total = getDuelTotal(scoresP2 || []);
    const handicapPct = Math.abs(safeHandicap) / 100;
    return {
        p1Total: safeHandicap < 0 ? Math.round(rawP1Total * (1 + handicapPct)) : rawP1Total,
        p2Total: safeHandicap > 0 ? Math.round(rawP2Total * (1 + handicapPct)) : rawP2Total,
    };
}

/** Mirrors app.js's formatDuelHandicapLabel(). */
export function formatDuelHandicapLabel(handicap: number): string {
    const safeHandicap = Number.isInteger(handicap) ? Math.min(50, Math.max(-50, handicap)) : 0;
    if (safeHandicap === 0) return "0%";
    if (safeHandicap < 0) return `J1 +${Math.abs(safeHandicap)}%`;
    return `J2 +${safeHandicap}%`;
}

/** Mirrors app.js's isPaquitoSelectedAsDuelOpponent() (given a player-2 name). */
export function isPaquitoName(name: string): boolean {
    return (name || "").trim().toLowerCase() === "paquito";
}

/** Volley pill class for a duel/peloton history row, mirrors renderDuelVolleyHistory's inline logic. */
export function getDuelVolleyPillClass(
    arrows: MultiScore[],
    opponentArrows: MultiScore[] | null,
    options: { maxVolleyTotal?: number | null; highlightBestScore?: boolean } = {},
): string {
    const isCompleted = (values: MultiScore[] | null) =>
        Array.isArray(values) && values.length > 0 && values.every((v) => v !== null && v !== undefined);

    const completed = isCompleted(arrows);
    if (!completed) return "is-gray";

    const total = arrows.reduce((sum, v) => sum + scoreToValue(v), 0);
    const missCount = arrows.reduce((count, v) => count + (scoreToValue(v) === 0 ? 1 : 0), 0);
    const maxVolleyTotal = options.maxVolleyTotal ?? null;
    const isFullVolley = maxVolleyTotal !== null && Math.abs(total - maxVolleyTotal) < 0.0001;

    if (options.highlightBestScore) {
        const opponentCompleted = isCompleted(opponentArrows);
        const opponentTotal = opponentCompleted
            ? (opponentArrows as MultiScore[]).reduce((sum, v) => sum + scoreToValue(v), 0)
            : null;
        return opponentCompleted && opponentTotal !== null && total > opponentTotal ? "is-green" : "is-gray";
    }

    if (missCount >= 2) return "is-red";
    if (missCount === 1) return "is-orange";
    if (isFullVolley) return "is-green";
    return "is-gray";
}

/* ---------------------------------------------------------------------- */
/* Peloton ludic bonus events                                              */
/* ---------------------------------------------------------------------- */

export interface PelotonBonusEvent {
    id: string;
    label: string;
    description: (name?: string) => string;
    weight: number;
}

/** Mirrors app.js's PELOTON_BONUS_EVENTS (weights out of 100). */
export const PELOTON_BONUS_EVENTS: PelotonBonusEvent[] = [
    { id: "nothing", label: "Rien ne se passe", description: () => "Le sort protège les archers... Cette fois.", weight: 20 },
    { id: "one_worst_zero", label: "Paille !", description: (n) => `Le pire tir de ${n} sur cette cible est annulé.`, weight: 30 },
    { id: "all_worst_zero", label: "Paille collective !", description: () => "Le pire tir de chaque archer sur cette cible est annulé.", weight: 15 },
    { id: "best_downgrade_one", label: "Déjaugeage !", description: (n) => `Le meilleur tir de ${n} descend d'un cran.`, weight: 20 },
    { id: "best_downgrade_all", label: "Malédiction collective !", description: () => "Le meilleur tir de chaque archer descend d'un cran.", weight: 7 },
    { id: "swap_scores", label: "L'arbalétrier maléfique !", description: (n) => `${n} échange son meilleur et son pire tir.`, weight: 5 },
    { id: "double_curse", label: "Double peine !", description: (n) => `${n} : meilleur tir réduit + pire tir annulé.`, weight: 3 },
];

/** Mirrors app.js's pickWeightedEvent(). */
export function pickWeightedEvent(events: PelotonBonusEvent[]): PelotonBonusEvent {
    const total = events.reduce((sum, e) => sum + e.weight, 0);
    let r = Math.random() * total;
    for (const event of events) {
        r -= event.weight;
        if (r <= 0) return event;
    }
    return events[events.length - 1]!;
}

/** Mirrors app.js's getDowngradedScore(). */
export function getDowngradedScore(score: number, allowedPoints: number[]): number {
    const finite = allowedPoints.filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
    const idx = finite.findIndex((p) => p === score);
    if (idx <= 0) return finite[0] ?? 0;
    return finite[idx - 1]!;
}

export interface PelotonBonusTarget {
    name: string;
    /** Mutable reference to that archer's arrows for the affected target — mutated in place. */
    arrows: MultiScore[];
}

/**
 * Mirrors app.js's applyPelotonBonusEvent(): mutates `others[].arrows` in
 * place according to the picked event, and returns the flash message to show.
 */
export function applyPelotonBonusEvent(
    eventId: string,
    others: PelotonBonusTarget[],
    allowedPoints: number[],
): { label: string; description: string } {
    if (others.length === 0) return { label: "Rien ne se passe", description: "Pas d'autre archer." };
    const minI = (ar: MultiScore[]) =>
        ar.reduce((mi, v, i) => (scoreToValue(v ?? 0) < scoreToValue(ar[mi] ?? 0) ? i : mi), 0);
    const maxI = (ar: MultiScore[]) =>
        ar.reduce((mi, v, i) => (scoreToValue(v ?? 0) > scoreToValue(ar[mi] ?? 0) ? i : mi), 0);
    const ev = (id: string) => PELOTON_BONUS_EVENTS.find((e) => e.id === id)!;
    const randomOther = () => others[Math.floor(Math.random() * others.length)]!;

    switch (eventId) {
        case "nothing":
            return { label: ev("nothing").label, description: ev("nothing").description() };
        case "one_worst_zero": {
            const t = randomOther();
            t.arrows[minI(t.arrows)] = 0;
            return { label: ev("one_worst_zero").label, description: ev("one_worst_zero").description(t.name) };
        }
        case "all_worst_zero": {
            others.forEach((a) => { a.arrows[minI(a.arrows)] = 0; });
            return { label: ev("all_worst_zero").label, description: ev("all_worst_zero").description() };
        }
        case "best_downgrade_one": {
            const t = randomOther();
            const mi = maxI(t.arrows);
            t.arrows[mi] = getDowngradedScore(scoreToValue(t.arrows[mi] ?? 0), allowedPoints);
            return { label: ev("best_downgrade_one").label, description: ev("best_downgrade_one").description(t.name) };
        }
        case "best_downgrade_all": {
            others.forEach((a) => {
                const mi = maxI(a.arrows);
                a.arrows[mi] = getDowngradedScore(scoreToValue(a.arrows[mi] ?? 0), allowedPoints);
            });
            return { label: ev("best_downgrade_all").label, description: ev("best_downgrade_all").description() };
        }
        case "swap_scores": {
            const t = randomOther();
            const bi = maxI(t.arrows);
            const wi = minI(t.arrows);
            if (bi !== wi) {
                const tmp = t.arrows[bi]!;
                t.arrows[bi] = t.arrows[wi]!;
                t.arrows[wi] = tmp;
            }
            return { label: ev("swap_scores").label, description: ev("swap_scores").description(t.name) };
        }
        case "double_curse": {
            const t = randomOther();
            const bi = maxI(t.arrows);
            const wi = minI(t.arrows);
            t.arrows[bi] = getDowngradedScore(scoreToValue(t.arrows[bi] ?? 0), allowedPoints);
            if (bi !== wi) t.arrows[wi] = 0;
            return { label: ev("double_curse").label, description: ev("double_curse").description(t.name) };
        }
        default:
            return { label: "Rien ne se passe", description: "Le sort protège les archers..." };
    }
}

/** Mirrors app.js's getPelotonVolleyMaxScore(). */
export function getPelotonVolleyMaxScore(ruleset: Ruleset, arrowsPerTarget: number, allowedPoints: number[]): number {
    let maxScore = 0;
    for (let i = 0; i < arrowsPerTarget; i += 1) {
        const selectablePoints = getSelectablePointsForArrow(ruleset, "individual", i, allowedPoints);
        const maxForThisArrow = Math.max(...selectablePoints.filter((p) => Number.isFinite(p)));
        maxScore += maxForThisArrow;
    }
    return maxScore;
}

/** Mirrors app.js's checkPelotonVolleyReachedMax(). */
export function checkPelotonVolleyReachedMax(currentTotal: number, maxScore: number): boolean {
    return currentTotal > 0 && currentTotal === maxScore;
}

/* ---------------------------------------------------------------------- */
/* Peloton turn rotation                                                   */
/* ---------------------------------------------------------------------- */

export interface PelotonArcherState {
    index: number;
    completed: boolean;
    currentTargetIndex: number;
}

const PAIR_RULESETS = new Set(["3d", "campagne", "ar"]);

/** Mirrors app.js's getNextPelotonArcherId(). */
export function getNextPelotonArcherId(
    archerIds: number[],
    getArcherState: (id: number) => PelotonArcherState | null,
    currentArcherIndex: number,
    finishedTargetIndex: number,
    ruleset: Ruleset,
): number | null {
    const currentPosition = archerIds.indexOf(currentArcherIndex);
    if (currentPosition < 0 || archerIds.length === 0) return null;

    const isPairRuleset = PAIR_RULESETS.has(ruleset);

    if (!isPairRuleset) {
        for (let offset = 1; offset <= archerIds.length; offset += 1) {
            const candidateId = archerIds[(currentPosition + offset) % archerIds.length]!;
            const candidate = getArcherState(candidateId);
            if (!candidate || candidate.completed) continue;
            return candidateId;
        }
        return null;
    }

    for (let offset = 1; offset <= archerIds.length; offset += 1) {
        const candidateId = archerIds[(currentPosition + offset) % archerIds.length]!;
        const candidate = getArcherState(candidateId);
        if (!candidate || candidate.completed) continue;
        if (candidate.currentTargetIndex === finishedTargetIndex) return candidateId;
    }

    let minTargetIndex = Infinity;
    archerIds.forEach((archerId) => {
        const candidate = getArcherState(archerId);
        if (!candidate || candidate.completed) return;
        minTargetIndex = Math.min(minTargetIndex, candidate.currentTargetIndex);
    });
    if (minTargetIndex === Infinity) return null;

    for (const candidateId of archerIds) {
        const candidate = getArcherState(candidateId);
        if (!candidate || candidate.completed) continue;
        if (candidate.currentTargetIndex === minTargetIndex) return candidateId;
    }
    return null;
}

/** Mirrors app.js's getPelotonGlobalTargetIndex(). */
export function getPelotonGlobalTargetIndex(
    archerIds: number[],
    getArcherState: (id: number) => PelotonArcherState | null,
    fallbackTargetCount: number,
): number {
    let minTargetIndex = Infinity;
    archerIds.forEach((archerId) => {
        const archerState = getArcherState(archerId);
        if (!archerState || archerState.completed) return;
        minTargetIndex = Math.min(minTargetIndex, archerState.currentTargetIndex || 0);
    });
    if (minTargetIndex === Infinity) return Math.max(0, fallbackTargetCount - 1);
    return minTargetIndex;
}

/** Mirrors app.js's getPelotonHeaderNames(). */
export function getPelotonHeaderNames(
    roster: { index: number; name: string }[],
    ruleset: Ruleset,
    globalTargetIndex: number,
): string {
    if (roster.length === 0) return "archers";
    const isGroupedRuleset = PAIR_RULESETS.has(ruleset);

    if (isGroupedRuleset) {
        const pairCount = Math.max(1, Math.ceil(roster.length / 2));
        const pairStart = (globalTargetIndex % pairCount) * 2;
        const first = roster[pairStart]?.name || "";
        const second = roster[pairStart + 1]?.name || "";
        return [first, second].filter(Boolean).join(" / ") || "archers";
    }

    const leadArcherIndex = globalTargetIndex % roster.length;
    return roster[leadArcherIndex]?.name || "archer";
}
