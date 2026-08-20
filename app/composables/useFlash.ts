/** App-wide transient flash message, mirrors app.js's #flash-info / showFlashInfo(). */
export function useFlash() {
    const message = useState<string>("flash-message", () => "");
    const timer = useState<ReturnType<typeof setTimeout> | undefined>("flash-timer", () => undefined);

    function showFlash(text: string, durationMs = 3200) {
        message.value = text;
        if (timer.value) clearTimeout(timer.value);
        timer.value = setTimeout(() => {
            message.value = "";
        }, durationMs);
    }

    return { message, showFlash };
}
