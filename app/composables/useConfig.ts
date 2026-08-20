import type { ConfigRecord } from "./useDb";

const CONFIG_RECORD_ID = "current" as const;

const DEFAULT_CONFIG: Omit<ConfigRecord, "id"> = {
    fullTarget_team: 7,
    fullTarget_individual: 5,
    missLimit_team: 5,
    missLimit_individual: 3,
    successZoneByRuleset: {},
    enabledRulesets: ["nature", "campagne", "3d", "3d2", "3dh", "ar", "field"],
    soloBeeps: {
        preparationSeconds: 5,
        tiringSecondsByRuleset: { nature: 40, campagne: 180, "3d": 90 },
    },
};

interface ConfigurationGetResponse {
    configuration?: Record<string, unknown>;
}

// Vue's `ref`/`useState` deep-wraps object values (and nested arrays/objects)
// in reactive Proxies. `toRaw()` only unwraps the outer layer, and Dexie/
// IndexedDB's structured clone cannot serialize the remaining nested
// Proxies (throws DataCloneError). A JSON round-trip guarantees a fully
// plain, cloneable copy — safe here since ConfigRecord only ever holds
// JSON-serializable data.
function toPlain<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Local (IndexedDB) + server (`/api/users/configuration`) copy of app.js's
 * `appConfig` (CONFIG_KEY). Unlike history, configuration sync is never
 * automatic here either — mirrors the original app, which only ever
 * saves/restores configuration on explicit button clicks (see
 * saveConfigToServer/restoreConfigFromServer in app.js) — an automatic push
 * on login would silently overwrite a server-saved configuration with
 * whatever (possibly still-default) values happen to be in a fresh local
 * IndexedDB.
 */
export function useConfig() {
    const { token, isAuthenticated, handleAuthFailure } = useAuth();
    const { isOnline } = useOnline();
    const config = useState<ConfigRecord>("app-config", () => ({ id: CONFIG_RECORD_ID, ...DEFAULT_CONFIG }));
    const loaded = useState<boolean>("app-config-loaded", () => false);
    const syncing = useState<boolean>("config-sync-in-progress", () => false);

    async function load() {
        if (!import.meta.client || loaded.value) return;
        try {
            const record = await useDb().configuration.get(CONFIG_RECORD_ID);
            if (record) {
                config.value = { ...config.value, ...record };
            }
        } finally {
            loaded.value = true;
        }
    }

    async function save() {
        await useDb().configuration.put(toPlain(config.value));
    }

    /** Explicit "Sauvegarder" action: pushes the local configuration as-is to the server. */
    async function pushToServer(): Promise<boolean> {
        if (!import.meta.client || !isOnline.value || !isAuthenticated.value) return false;
        if (syncing.value) return false;

        syncing.value = true;
        try {
            const { id, ...configuration } = toPlain(config.value);
            const res = await $fetch.raw("/api/users/configuration", {
                method: "PUT",
                headers: { authorization: `Bearer ${token.value}` },
                body: { configuration },
                ignoreResponseError: true,
            });

            if (res.status === 401) {
                await handleAuthFailure((res._data as { error?: string } | undefined)?.error);
                return false;
            }
            return res.status >= 200 && res.status < 300;
        } catch {
            return false;
        } finally {
            syncing.value = false;
        }
    }

    /**
     * Explicit "Restaurer" action: pulls the server's configuration and
     * merges known fields into the local copy (mirrors
     * restoreConfigFromServer in app.js — only recognized fields are
     * applied, so unrelated/future fields already saved server-side by a
     * newer client aren't clobbered by an older one).
     */
    async function pullFromServer(): Promise<boolean> {
        if (!import.meta.client || !isOnline.value || !isAuthenticated.value) return false;
        if (syncing.value) return false;

        syncing.value = true;
        try {
            const res = await $fetch.raw<ConfigurationGetResponse>("/api/users/configuration", {
                headers: { authorization: `Bearer ${token.value}` },
                ignoreResponseError: true,
            });

            if (res.status === 401) {
                await handleAuthFailure((res._data as { error?: string } | undefined)?.error);
                return false;
            }
            if (res.status < 200 || res.status >= 300) return false;

            const saved = res._data?.configuration;
            if (!saved || typeof saved !== "object") return false;

            const next: ConfigRecord = { ...config.value };
            if (Number.isFinite(saved.fullTarget_team)) next.fullTarget_team = saved.fullTarget_team as number;
            if (Number.isFinite(saved.fullTarget_individual)) {
                next.fullTarget_individual = saved.fullTarget_individual as number;
            }
            if (Number.isFinite(saved.missLimit_team)) next.missLimit_team = saved.missLimit_team as number;
            if (Number.isFinite(saved.missLimit_individual)) {
                next.missLimit_individual = saved.missLimit_individual as number;
            }
            if (saved.successZoneByRuleset && typeof saved.successZoneByRuleset === "object") {
                next.successZoneByRuleset = { ...next.successZoneByRuleset, ...(saved.successZoneByRuleset as object) };
            }
            if (Array.isArray(saved.enabledRulesets)) {
                next.enabledRulesets = saved.enabledRulesets as string[];
            }

            config.value = next;
            await save();
            return true;
        } finally {
            syncing.value = false;
        }
    }

    return { config, loaded, syncing, load, save, pushToServer, pullFromServer };
}
