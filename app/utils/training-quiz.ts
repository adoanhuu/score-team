// Blazon ("Quiz blasons") image pool, ported verbatim from app.js's
// SHIELDS_BY_CATEGORY / QUIZ_SHIELDS_DISTRIBUTION. Images live in
// public/images/blasons/{category}/{filename}.
export type ShieldCategory = "PA" | "PG" | "MG" | "GG";

export const SHIELDS_BY_CATEGORY: Record<ShieldCategory, string[]> = {
    PA: [
        "img_3_0.png", "img_3_1.png", "img_3_2.png", "img_3_3.png", "img_3_4.png", "img_3_5.png", "img_3_6.png",
        "img_4_1.png", "img_4_2.png", "img_4_3.png", "img_4_4.png", "img_4_5.png", "img_4_6.png", "img_4_7.png",
        "img_4_8.png", "img_5_2.png", "img_5_4.png", "img_6_0.png", "img_6_1.png", "img_6_3.png", "img_6_4.png",
        "img_6_5.png", "img_6_6.png", "img_6_7.png", "img_6_8.png", "img_6_9.png", "img_7_3.png", "img_7_6.png",
        "img_7_7.png", "img_8_2.png", "img_8_3.png", "img_8_4.png",
    ],
    PG: [
        "img_10_0.png", "img_10_1.png", "img_10_5.png", "img_10_7.png", "img_10_8.png", "img_11_0.png",
        "img_11_1.png", "img_11_2.png", "img_11_3.png", "img_11_6.png", "img_11_7.png", "img_12_1.png",
        "img_12_2.png", "img_12_3.png", "img_12_5.png", "img_12_6.png", "img_13_0.png", "img_13_1.png",
        "img_9_0.png", "img_9_1.png", "img_9_2.png", "img_9_3.png", "img_9_4.png", "img_9_5.png", "img_9_6.png",
    ],
    MG: [
        "img_14_0.png", "img_14_1.png", "img_14_2.png", "img_14_3.png", "img_14_4.png", "img_14_5.png",
        "img_14_6.png", "img_15_1.png", "img_15_2.png", "img_15_4.png", "img_16_0.png", "img_16_1.png",
        "img_16_2.png", "img_16_3.png", "img_16_4.png", "img_16_5.png", "img_16_6.png", "img_16_8.png",
        "img_17_0.png", "img_17_1.png", "img_17_3.png", "img_17_4.png", "img_18_2.png", "img_18_3.png",
    ],
    GG: [
        "img_19_0.png", "img_19_1.png", "img_19_2.png", "img_19_3.png", "img_19_4.png", "img_19_5.png",
        "img_20_0.png", "img_21_0.png", "img_21_1.png", "img_21_2.png", "img_21_3.png", "img_21_4.png",
        "img_21_5.png", "img_21_6.png", "img_22_0.png", "img_22_1.png",
    ],
};

export const QUIZ_SHIELDS_DISTRIBUTION: Record<ShieldCategory, number> = {
    PA: 4,
    PG: 6,
    MG: 7,
    GG: 4,
};

export const QUIZ_SHIELDS_NEXT_DELAY_MS = 2000;

export interface QuizShieldQuestion {
    category: ShieldCategory;
    image: string;
}

function shuffleArray<T>(values: T[]): T[] {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
    }
    return copy;
}

export function buildQuizShieldsPool(selectedCategories: ShieldCategory[]): QuizShieldQuestion[] {
    const categories = selectedCategories.length > 0 ? selectedCategories : (["PA", "PG", "MG", "GG"] as ShieldCategory[]);
    const pool: QuizShieldQuestion[] = [];

    categories.forEach((category) => {
        const wantedCount = QUIZ_SHIELDS_DISTRIBUTION[category] || 0;
        const shields = SHIELDS_BY_CATEGORY[category] || [];
        const shuffledShields = shuffleArray(shields);
        const takeCount = Math.min(wantedCount, shuffledShields.length);
        for (let index = 0; index < takeCount; index += 1) {
            pool.push({ category, image: shuffledShields[index] });
        }
    });

    return shuffleArray(pool);
}
