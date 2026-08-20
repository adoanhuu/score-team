interface ConfirmState {
    visible: boolean;
    message: string;
    confirmLabel: string;
    resolve: ((value: boolean) => void) | null;
}

/**
 * App-wide confirmation dialog, mirrors app.js's confirmAction()/#confirm-modal.
 * The actual modal markup lives once in app/components/ConfirmModal.vue,
 * mounted in app.vue; pages just call confirmAction(message).
 */
export function useConfirm() {
    const confirmState = useState<ConfirmState>("confirm-modal-state", () => ({
        visible: false,
        message: "",
        confirmLabel: "Supprimer",
        resolve: null,
    }));

    function confirmAction(message: string, confirmLabel = "Supprimer"): Promise<boolean> {
        return new Promise((resolve) => {
            confirmState.value = { visible: true, message, confirmLabel, resolve };
        });
    }

    function resolveConfirm(value: boolean) {
        confirmState.value.resolve?.(value);
        confirmState.value = { visible: false, message: "", confirmLabel: "Supprimer", resolve: null };
    }

    return { confirmState, confirmAction, resolveConfirm };
}
