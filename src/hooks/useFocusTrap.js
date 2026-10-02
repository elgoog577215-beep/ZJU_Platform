import { useEffect, useRef } from "react";

export const useFocusTrap = (isActive = true) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return undefined;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // 自动聚焦到第一个元素
        firstElement?.focus();

        const handleTabKey = (event) => {
            if (event.key !== "Tab") return;

            if (event.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement?.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener("keydown", handleTabKey);
        return () => container.removeEventListener("keydown", handleTabKey);
    }, [isActive]);

    return containerRef;
};
