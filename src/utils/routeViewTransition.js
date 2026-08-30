import { flushSync } from "react-dom";

const isPrimaryUnmodifiedClick = (event) =>
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

const isLowPowerDevice = () => {
    if (typeof navigator === "undefined") return false;
    const cores = Number(navigator.hardwareConcurrency || 0);
    const memory = Number(navigator.deviceMemory || 0);
    return (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
};

export const startRouteViewTransition = ({
    event,
    navigate,
    to,
    state,
    replace = false,
    reducedMotion = false,
}) => {
    if (
        event.defaultPrevented ||
        !isPrimaryUnmodifiedClick(event) ||
        reducedMotion ||
        isLowPowerDevice() ||
        typeof document === "undefined" ||
        typeof document.startViewTransition !== "function"
    ) {
        return false;
    }

    event.preventDefault();
    const transition = document.startViewTransition(() => {
        flushSync(() => navigate(to, { replace, state }));
    });
    transition.finished.catch(() => {});
    return true;
};
