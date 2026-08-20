export default defineNuxtPlugin(async () => {
    const { restore, isAuthenticated } = useAuth();
    const { isOnline } = useOnline();
    const { mergeAndSync } = useSync();

    await restore();

    // On login and on every online reconnect while logged in, reconcile local
    // IndexedDB with the server via a merge (never a blind push) — pushing
    // local data as-is here would silently wipe the server's copy the first
    // time the app is opened on a new device (empty local IndexedDB).
    // Later local-only mutations (e.g. deleting a history entry) push
    // directly since by then local state already reflects a safe merge.
    watch(
        [isOnline, isAuthenticated],
        ([online, authed], previous) => {
            const wasReady = previous ? previous[0] && previous[1] : false;
            if (online && authed && !wasReady) {
                void mergeAndSync();
            }
        },
        { immediate: true },
    );
});

