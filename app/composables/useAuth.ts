const AUTH_RECORD_ID = "current" as const;

export interface AuthUser {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
}

interface LoginResponse {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    token: string;
}

/** Messages returned by functions/_lib/auth.js-backed endpoints for an invalid/expired token. */
function isAuthErrorMessage(message: unknown): boolean {
    const normalized = typeof message === "string" ? message.trim().toLowerCase() : "";
    return (
        normalized === "invalid or missing token"
        || normalized === "missing bearer token"
        || normalized === "invalid token"
    );
}

/**
 * Auth state backed by IndexedDB (Dexie) instead of localStorage, so the
 * session survives and is usable offline. Mirrors the previous
 * AUTH_TOKEN_KEY / AUTH_USER_* localStorage keys used by app.js.
 */
export function useAuth() {
    const user = useState<AuthUser | null>("auth-user", () => null);
    const token = useState<string>("auth-token", () => "");
    const ready = useState<boolean>("auth-ready", () => false);
    const isAuthenticated = computed(() => Boolean(token.value));

    async function restore() {
        if (!import.meta.client || ready.value) return;
        try {
            const record = await useDb().authSession.get(AUTH_RECORD_ID);
            if (record) {
                token.value = record.token;
                user.value = {
                    id: record.userId,
                    email: record.email,
                    firstName: record.firstName,
                    lastName: record.lastName,
                };
            }
        } finally {
            ready.value = true;
        }
    }

    async function login(email: string, password: string) {
        let response: LoginResponse;
        try {
            response = await $fetch<LoginResponse>("/api/login", {
                method: "POST",
                body: { email, password },
            });
        } catch (error: any) {
            const message = error?.data?.error;
            throw new Error(message ? translateErrorToFrench(message) : "Identifiants invalides.");
        }

        await useDb().authSession.put({
            id: AUTH_RECORD_ID,
            token: response.token,
            userId: response.id,
            email: response.email,
            firstName: response.first_name,
            lastName: response.last_name,
        });

        token.value = response.token;
        user.value = {
            id: response.id,
            email: response.email,
            firstName: response.first_name,
            lastName: response.last_name,
        };
    }

    async function logout() {
        await useDb().authSession.delete(AUTH_RECORD_ID);
        token.value = "";
        user.value = null;
    }

    /** Call with an API error message; logs the user out if it signals an expired/invalid token. */
    async function handleAuthFailure(message: unknown): Promise<boolean> {
        if (!isAuthErrorMessage(message)) return false;
        await logout();
        return true;
    }

    return { user, token, isAuthenticated, ready, restore, login, logout, handleAuthFailure };
}
