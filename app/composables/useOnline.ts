/** Reactive connectivity state, kept up to date by app/plugins/online.client.ts. */
export function useOnline() {
    const isOnline = useState<boolean>("is-online", () => true);
    return { isOnline };
}
