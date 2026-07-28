import { useEffect, useRef, useCallback } from "react";

/**
 * 键盘导航 Hook
 * 支持方向键导航、Enter/Space 激活、Esc 关闭
 */
export const useKeyboardNavigation = ({
    onEnter,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    enabled = true,
} = {}) => {
    useEffect(() => {
        if (!enabled) return undefined;

        const handleKeyDown = (event) => {
            switch (event.key) {
                case "Enter":
                case " ":
                    if (onEnter) {
                        event.preventDefault();
                        onEnter(event);
                    }
                    break;
                case "Escape":
                    if (onEscape) {
                        event.preventDefault();
                        onEscape(event);
                    }
                    break;
                case "ArrowUp":
                    if (onArrowUp) {
                        event.preventDefault();
                        onArrowUp(event);
                    }
                    break;
                case "ArrowDown":
                    if (onArrowDown) {
                        event.preventDefault();
                        onArrowDown(event);
                    }
                    break;
                case "ArrowLeft":
                    if (onArrowLeft) {
                        event.preventDefault();
                        onArrowLeft(event);
                    }
                    break;
                case "ArrowRight":
                    if (onArrowRight) {
                        event.preventDefault();
                        onArrowRight(event);
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, enabled]);
};

/**
 * 焦点管理 Hook
 * 自动聚焦、焦点循环、焦点陷阱
 */
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

/**
 * 屏幕阅读器公告 Hook
 * 用于向屏幕阅读器用户宣布重要更新
 */
export const useScreenReaderAnnouncement = () => {
    const [announcement, setAnnouncement] = React.useState("");

    const announce = useCallback((message, priority = "polite") => {
        setAnnouncement("");
        // 短暂延迟以确保更新
        setTimeout(() => {
            setAnnouncement(message);
        }, 100);
    }, []);

    const LiveRegion = () => (
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
        </div>
    );

    return { announce, LiveRegion };
};

/**
 * 跳过链接组件
 * 允许键盘用户跳过导航直接到主内容
 */
export const SkipLink = () => {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
            跳转到主要内容
        </a>
    );
};

/**
 * 焦点可见性样式
 * 确保所有焦点元素都有清晰的焦点指示器
 */
export const focusStyles = `
  /* 全局焦点样式 */
  *:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  *:focus:not(:focus-visible) {
    outline: none;
  }
  
  *:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  /* 按钮和链接的焦点样式 */
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
  }
  
  /* 输入框的焦点样式 */
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 0;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;
