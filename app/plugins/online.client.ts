export default defineNuxtPlugin(() => {
    const isOnline = useState<boolean>("is-online", () => true);

    if (import.meta.client) {
        isOnline.value = navigator.onLine;
        window.addEventListener("online", () => {
            isOnline.value = true;
        });
        window.addEventListener("offline", () => {
            isOnline.value = false;
        });
    }
});
