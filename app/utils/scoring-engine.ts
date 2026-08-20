// Ported from app.js: pure scoring-rule helpers for the solo scoring engine
// (setup + points pad + volley/target math). Kept side-effect free so it can
// be unit-exercised independently of the Vue composable/UI layer.
import { FIELD_X, type Ruleset } from "./scoring-format";

export const TEAM_ARCHERS_PER_VOLLEY = 3;

export type ScoringMode = "team" | "individual" | "mixed";

export const presets: Record<Ruleset, number[]> = {
    nature: [20, 15, 10, 0],
    campagne: [6, 5, 4, 3, 2, 1, 0],
    "3d": [11, 10, 8, 5, 0],
    field: [FIELD_X, 5, 4, 3, 0],
    "3d2": [10, 8, 5, 0],
    "3dh": [20, 16, 10, 0],
    ar: [20, 18, 16, 14, 12, 10, 0],
};

export const defaultTargetsByRuleset: Record<Ruleset, number> = {
    nature: 21,
    campagne: 24,
    "3d": 24,
    field: 14,
    "3d2": 14,
    "3dh": 14,
    ar: 14,
};

// Max value achievable per arrow, used to compute the max possible volley
// total (drives the success-zone slider max and the "plein" pill color).
const maxArrowValuesByRuleset: Record<string, number[] | Partial<Record<ScoringMode, number[]>>> = {
    nature: {
        team: [20, 15, 20, 15, 20, 15],
        individual: [20, 15],
    },
    campagne: [6, 6, 6],
    "3d": {
        team: [11, 11, 11, 11, 11, 11],
        individual: [11, 11],
        mixed: [11, 11, 11, 11],
    },
    field: [5, 5, 5, 5],
    "3d2": [10, 10],
    "3dh": [20],
    ar: [20, 16, 12],
};

const targetGroupsByRuleset: Partial<Record<Ruleset, string[]>> = {
    nature: ["PA", "PG", "MG", "GG"],
    "3d": ["G1", "G2", "G3", "G4"],
    field: ["65", "50", "35", "20"],
    "3d2": ["G1", "G2", "G3", "G4"],
    "3dh": ["G1", "G2", "G3", "G4"],
    ar: ["G1", "G2", "G3", "G4"],
};

export interface WeaponInfo {
    code: string;
    libelle: string;
}

export const weaponsByFederation: Record<"FFTA" | "FFTL", WeaponInfo[]> = {
    FFTA: [
        { code: "AC", libelle: "Arc de chasse" },
        { code: "AD", libelle: "Arc droit" },
        { code: "BB", libelle: "Barebow" },
        { code: "CL", libelle: "Classique" },
        { code: "CO", libelle: "Compound" },
        { code: "TL", libelle: "Tir libre" },
    ],
    FFTL: [
        { code: "BB-C", libelle: "Barebow compound" },
        { code: "BB-R", libelle: "Barebow recurve" },
        { code: "BH-C", libelle: "Bowhunter compound" },
        { code: "BH-R", libelle: "Bowhunter recurve" },
        { code: "BL", libelle: "Bowhunter limited" },
        { code: "BU", libelle: "Bowhunter unlimited" },
        { code: "FS-R", libelle: "Freestyle recurve" },
        { code: "FS-C", libelle: "Freestyle compound" },
        { code: "FU", libelle: "Freestyle unlimited" },
        { code: "HB", libelle: "Historical bow" },
        { code: "LB", libelle: "Longbow" },
        { code: "TR", libelle: "Traditional recurve" },
    ],
};

export function isFFTLRuleset(ruleset: string): boolean {
    return ruleset === "3d2" || ruleset === "3dh" || ruleset === "ar" || ruleset === "field";
}

export function getFederationByRuleset(ruleset: string): "FFTA" | "FFTL" {
    return isFFTLRuleset(ruleset) ? "FFTL" : "FFTA";
}

export function getWeaponsForRuleset(ruleset: string): string[] {
    return weaponsByFederation[getFederationByRuleset(ruleset)].map((weapon) => weapon.code);
}

export function isWeaponAllowedForRuleset(weapon: string, ruleset: string): boolean {
    return getWeaponsForRuleset(ruleset).includes(weapon);
}

export function formatWeaponLabel(code: string): string {
    for (const weapon of weaponsByFederation.FFTA) if (weapon.code === code) return weapon.libelle;
    for (const weapon of weaponsByFederation.FFTL) if (weapon.code === code) return weapon.libelle;
    return code || "";
}

export function getGroupsForRuleset(ruleset: string): string[] {
    return targetGroupsByRuleset[ruleset as Ruleset] || [];
}

export function getGroupLabel(group: string): string {
    if (group === "PA") return "Petit animal";
    if (group === "PG") return "Petit gibier";
    if (group === "MG") return "Moyen gibier";
    if (group === "GG") return "Grand gibier";
    if (group === "G1") return "Groupe 1";
    if (group === "G2") return "Groupe 2";
    if (group === "G3") return "Groupe 3";
    if (group === "G4") return "Groupe 4";
    return group;
}

export function getTargetCountForRuleset(ruleset: string): number {
    return defaultTargetsByRuleset[ruleset as Ruleset] ?? 21;
}

export function isScoringModeAllowedForRuleset(mode: ScoringMode, ruleset: string): boolean {
    if (mode === "mixed") return ruleset === "3d";
    if (mode === "team") return !isFFTLRuleset(ruleset);
    return mode === "individual";
}

export function normalizeScoringMode(mode: unknown, ruleset: string): ScoringMode {
    if ((mode === "team" || mode === "individual" || mode === "mixed") && isScoringModeAllowedForRuleset(mode, ruleset)) {
        return mode;
    }
    return isFFTLRuleset(ruleset) ? "individual" : "team";
}

export function getArrowsPerVolley(ruleset: string, scoringMode: ScoringMode): number {
    let arrowsPerArcher = 2;
    if (ruleset === "3dh") arrowsPerArcher = 1;
    else if (ruleset === "ar") arrowsPerArcher = 3;
    else if (ruleset === "field") arrowsPerArcher = 4;
    else if (ruleset === "campagne") arrowsPerArcher = 3;

    if (scoringMode === "mixed" && ruleset === "3d") return 4;
    if (scoringMode === "team") return arrowsPerArcher * TEAM_ARCHERS_PER_VOLLEY;
    return arrowsPerArcher;
}

export function scoreToValue(score: number | null): number {
    return score === FIELD_X ? 5 : (score ?? 0);
}

function getPerArrowMaxValues(
    ruleset: string,
    scoringMode: ScoringMode,
    arrowsPerVolley: number,
    allowedPoints: number[],
): number[] {
    const entry = maxArrowValuesByRuleset[ruleset];
    let maxValues: number[] | null = null;

    if (Array.isArray(entry)) {
        maxValues = [...entry];
    } else if (entry && typeof entry === "object") {
        const byMode = entry[scoringMode];
        if (Array.isArray(byMode)) maxValues = [...byMode];
    }

    if (maxValues && maxValues.length > 0) {
        if (maxValues.length >= arrowsPerVolley) return maxValues.slice(0, arrowsPerVolley);
        const fallback = maxValues[maxValues.length - 1] ?? 0;
        const extended = [...maxValues];
        while (extended.length < arrowsPerVolley) extended.push(fallback);
        return extended;
    }

    const maxPoint = Math.max(...(allowedPoints || []).map(scoreToValue), 0);
    return Array(arrowsPerVolley).fill(maxPoint);
}

export function getMaxShootTotalForConfig(
    ruleset: string,
    scoringMode: ScoringMode,
    arrowsPerVolley: number,
    allowedPoints: number[],
): number {
    return getPerArrowMaxValues(ruleset, scoringMode, arrowsPerVolley, allowedPoints).reduce((sum, v) => sum + v, 0);
}

export function getMaxVolleyForConfig(ruleset: string, scoringMode: ScoringMode, arrowsPerVolley: number, allowedPoints: number[]): number {
    const arrowsPerVolleyIndividual = getArrowsPerVolley(ruleset, "individual");
    const maxSingleArcher = getMaxShootTotalForConfig(ruleset, "individual", arrowsPerVolleyIndividual, allowedPoints);
    const numberOfArchers = arrowsPerVolley / arrowsPerVolleyIndividual;
    if (Number.isFinite(maxSingleArcher)) return maxSingleArcher * numberOfArchers;
    return arrowsPerVolley * Math.max(...allowedPoints.map(scoreToValue), 0);
}

export function clampSuccessZoneForConfig(
    value: number,
    ruleset: string,
    scoringMode: ScoringMode,
    arrowsPerVolley: number,
    allowedPoints: number[],
): number {
    const max = getMaxShootTotalForConfig(ruleset, scoringMode, arrowsPerVolley, allowedPoints);
    if (!Number.isInteger(value) || value < 1) return 1;
    return Math.min(value, Math.max(1, max));
}

/**
 * Points selectable for a given arrow index within the current volley.
 * Nature alternates 20/15/M (odd arrows) then 15/10/M (even arrows) in
 * individual mode; Animal round assigns a fixed [20,18]/[16,14]/[12,10] set
 * per arrow (1st/2nd/3rd). All other rulesets/modes offer every allowed point.
 */
export function getSelectablePointsForArrow(
    ruleset: string,
    scoringMode: ScoringMode,
    arrowIndex: number,
    allowedPoints: number[],
): number[] {
    const sourcePoints = allowedPoints.length ? allowedPoints : [0];

    if (ruleset === "nature") {
        if (scoringMode === "team") {
            return [20, 15, 10, 0].filter((score) => sourcePoints.includes(score));
        }
        const isFirstArrowOfPair = arrowIndex % 2 === 0;
        const candidateScores = isFirstArrowOfPair ? [20, 15, 0] : [15, 10, 0];
        return candidateScores.filter((score) => sourcePoints.includes(score));
    }

    if (ruleset === "ar") {
        const arrowScores = [[20, 18, 0], [16, 14, 0], [12, 10, 0]];
        return (arrowScores[arrowIndex] || [0]).filter((score) => sourcePoints.includes(score));
    }

    return sourcePoints;
}

export function getScoreRuleHint(ruleset: string, scoringMode: ScoringMode, arrowIndex: number): string {
    if (ruleset === "nature") {
        if (scoringMode === "team") return "Équipe : 20 / 15 / 10 / M, max 3x20, 6x15, 3x10";
        const isFirstArrowOfPair = arrowIndex % 2 === 0;
        const arrowLabel = isFirstArrowOfPair ? "1re flèche" : "2e flèche";
        const values = isFirstArrowOfPair ? "20 / 15 / M" : "15 / 10 / M";
        return `${arrowLabel} : ${values}`;
    }
    if (ruleset === "ar") {
        const valuesByArrow = ["20 / 18 / M", "16 / 14 / M", "12 / 10 / M"];
        const values = valuesByArrow[arrowIndex];
        return values ? `Flèche ${arrowIndex + 1} : ${values}` : "";
    }
    return "";
}

export function roundTotal(round: (number | null)[]): number {
    return round.reduce((sum: number, value) => sum + scoreToValue(value), 0);
}

export function isDoubleZeroVolley(volley: (number | null)[]): boolean {
    return volley.length >= 2 && volley[0] === 0 && volley[1] === 0;
}

export function hasSingleMiss(volley: (number | null)[]): boolean {
    return volley.some((v) => v === 0);
}

export function getVolleyPillClass(volley: (number | null)[], total: number, maxVolley: number): string {
    if (isDoubleZeroVolley(volley)) return "is-red";
    if (total === maxVolley) return "is-green";
    if (hasSingleMiss(volley)) return "is-orange";
    return "is-gray";
}

export function getBarColorByZoneRatio(value: number, successZone: number): string {
    if (successZone <= 0) return "#8c929a";
    const pct = (value / successZone) * 100;
    if (pct >= 100) return "#16a34a";
    if (pct >= 80) return "#f97316";
    if (pct >= 60) return "#eab308";
    if (pct >= 30) return "#f97316";
    return "#dc2626";
}

export function getSegmentCount(targetCount: number, ruleset: string): number {
    if (isFFTLRuleset(ruleset)) return 2;
    if (targetCount >= 18) return 3;
    if (targetCount >= 10) return 2;
    return 1;
}

export function getSegmentTotals(shoots: (number | null)[][], targetCount: number, ruleset: string): number[] {
    const segmentCount = getSegmentCount(targetCount, ruleset);
    const totals: number[] = [];
    for (let i = 0; i < segmentCount; i++) {
        const start = Math.floor((i * targetCount) / segmentCount);
        const end = Math.floor(((i + 1) * targetCount) / segmentCount);
        let segTotal = 0;
        for (let j = start; j < end && j < shoots.length; j++) segTotal += roundTotal(shoots[j]);
        totals.push(segTotal);
    }
    return totals;
}

export function getSegmentAverages(totals: number[], segmentCount: number): number[] {
    const segments: number[] = [];
    for (let i = 0; i < segmentCount; i++) {
        const start = Math.floor((i * totals.length) / segmentCount);
        const end = Math.floor(((i + 1) * totals.length) / segmentCount);
        const part = totals.slice(start, end);
        const avg = part.length ? part.reduce((sum, v) => sum + v, 0) / part.length : 0;
        segments.push(Number(avg.toFixed(2)));
    }
    return segments;
}

export const SOLO_TIMER_MODE_NONE = "none" as const;
export const SOLO_TIMER_MODE_BEEPS = "beeps" as const;
export const SOLO_TIMER_MODE_HOLD = "hold" as const;
export type SoloTimerMode = typeof SOLO_TIMER_MODE_NONE | typeof SOLO_TIMER_MODE_BEEPS | typeof SOLO_TIMER_MODE_HOLD;

export function normalizeSoloTimerMode(value: unknown, fallback: SoloTimerMode = SOLO_TIMER_MODE_HOLD): SoloTimerMode {
    if (value === SOLO_TIMER_MODE_NONE || value === SOLO_TIMER_MODE_BEEPS || value === SOLO_TIMER_MODE_HOLD) return value;
    if (value === true) return SOLO_TIMER_MODE_HOLD;
    if (value === false) return SOLO_TIMER_MODE_NONE;
    return fallback;
}

export function isSoloTimerEnabled(mode: SoloTimerMode): boolean {
    return normalizeSoloTimerMode(mode, SOLO_TIMER_MODE_NONE) !== SOLO_TIMER_MODE_NONE;
}

/** Timer is only offered for individual scoring on the 3 rulesets with a stable per-arrow cadence. */
export function canUseTimerForSetup(scoringMode: ScoringMode, ruleset: string): boolean {
    return scoringMode === "individual" && (ruleset === "nature" || ruleset === "campagne" || ruleset === "3d");
}

export const SOLO_BEEPS_PREPARATION_MAX_SECONDS = 15;
export const SOLO_BEEPS_TIRING_MIN_SECONDS = 5;
const SOLO_BEEPS_DEFAULT_TIRING_SECONDS: Record<string, number> = { nature: 40, campagne: 180, "3d": 90 };

export function getSoloBeepsMaxTiringSecondsByRuleset(ruleset: string): number {
    if (ruleset === "nature") return 45;
    if (ruleset === "3d") return 90;
    if (ruleset === "campagne") return 180;
    return 90;
}

export function getSoloBeepsDefaultTiringSecondsByRuleset(ruleset: string): number {
    return SOLO_BEEPS_DEFAULT_TIRING_SECONDS[ruleset] ?? getSoloBeepsMaxTiringSecondsByRuleset(ruleset);
}
