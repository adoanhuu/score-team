const ERROR_TRANSLATIONS: Record<string, string> = {
    "Invalid JSON payload": "Corps JSON invalide.",
    "email and password are required": "L'identifiant et le mot de passe sont requis.",
    "Invalid credentials": "Identifiants invalides.",
    "Login failed": "Connexion impossible.",
    "Invalid or missing token": "Connexion requise.",
    "Missing bearer token": "Jeton d'authentification manquant.",
    "current_password and new_password are required": "Le mot de passe actuel et le nouveau mot de passe sont requis.",
    "Invalid token": "Jeton invalide.",
    "Password update failed": "La mise à jour du mot de passe a échoué.",
    "uuid and ruleset are required": "Le code concours et le type de parcours sont requis.",
    "contest_uuid is required": "L'identifiant du concours est requis.",
    "user_id is required": "L'identifiant de l'appareil est requis.",
    "first_name and last_name are required": "Le nom et le prénom sont requis.",
    "Contest not found": "Concours introuvable.",
    "Failed to verify contest": "Impossible de vérifier le concours.",
    "Failed to load contest user": "Impossible de récupérer l'historique du concours.",
};

/** Mirrors app.js's translateErrorToFrench() so API error messages read consistently across the app. */
export function translateErrorToFrench(message: unknown): string {
    const msg = typeof message === "string" ? message.trim() : "";
    if (!msg) return "Une erreur est survenue.";

    if (ERROR_TRANSLATIONS[msg]) return ERROR_TRANSLATIONS[msg];

    const normalized = msg.toLowerCase();
    if (
        normalized.includes("new_password")
        && (normalized.includes("at least 8") || normalized.includes("at least 12"))
        && normalized.includes("upper")
        && normalized.includes("lower")
        && normalized.includes("number")
        && normalized.includes("symbol")
    ) {
        return normalized.includes("at least 8")
            ? "Le nouveau mot de passe doit contenir au moins 8 caractères avec majuscule, minuscule, chiffre et symbole."
            : "Le nouveau mot de passe doit contenir au moins 12 caractères avec majuscule, minuscule, chiffre et symbole.";
    }

    if (msg.startsWith("Method ") && msg.endsWith(" not allowed")) {
        return "Méthode non autorisée.";
    }
    return msg;
}
