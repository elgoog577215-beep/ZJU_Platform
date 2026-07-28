import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * 移动端触摸反馈优化
 * 提供更精致的交互体验
 */

// 触摸反馈 Hook
export const useTouchFeedback = () => {
    const [isPressed, setIsPressed] = useState(false);

    const handleTouchStart = () => setIsPressed(true);
    const handleTouchEnd = () => setIsPressed(false);

    return {
        isPressed,
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchEnd: handleTouchEnd,
            onMouseDown: handleTouchStart,
            onMouseUp: handleTouchEnd,
            onMouseLeave: handleTouchEnd,
        },
    };
};

// 触摸反馈按钮包装器
export const TouchFeedback = ({ children, className = "", scale = 0.95, ...props }) => {
    const { isPressed, handlers } = useTouchFeedback();

    return (
        <motion.div
            animate={{ scale: isPressed ? scale : 1 }}
            transition={{ duration: 0.1 }}
            className={`cursor-pointer ${className}`}
            {...handlers}
            {...props}
        >
            {children}
        </motion.div>
    );
};

// 涟漪效果组件
export const RippleEffect = ({ children, className = "", color = "rgba(255, 255, 255, 0.3)" }) => {
    const [ripples, setRipples] = useState([]);

    const handleClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = {
            id: Date.now(),
            x,
            y,
            size: Math.max(rect.width, rect.height),
        };

        setRipples((prev) => [...prev, ripple]);

        // 清理涟漪
        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
        }, 600);
    };

    return (
        <div className={`relative overflow-hidden ${className}`} onClick={handleClick}>
            {children}
            {ripples.map((ripple) => (
                <span
                    key={ripple.id}
                    className="absolute pointer-events-none rounded-full animate-ping"
                    style={{
                        left: ripple.x - ripple.size / 2,
                        top: ripple.y - ripple.size / 2,
                        width: ripple.size,
                        height: ripple.size,
                        backgroundColor: color,
                    }}
                />
            ))}
        </div>
    );
};

// 滑动删除组件
export const SwipeToDelete = ({ children, onSwipe, threshold = 100 }) => {
    const [offset, setOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const handleTouchStart = (e) => {
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (!isSwiping) return;
        const touchX = e.touches[0].clientX;
        const deltaX = touchX - (e.target.getBoundingClientRect().left + offset);
        if (deltaX < 0) {
            setOffset(Math.max(deltaX, -threshold));
        }
    };

    const handleTouchEnd = () => {
        setIsSwiping(false);
        if (offset < -threshold) {
            onSwipe?.();
            setOffset(0);
        } else {
            setOffset(0);
        }
    };

    return (
        <motion.div
            style={{ x: offset }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="select-none"
        >
            {children}
        </motion.div>
    );
};

// 下拉刷新 Hook
export const usePullToRefresh = (onRefresh, threshold = 100) => {
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);

    useEffect(() => {
        let startY = 0;
        let currentY = 0;
        let isPulling = false;

        const handleTouchStart = (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        };

        const handleTouchMove = (e) => {
            if (!isPulling) return;
            currentY = e.touches[0].clientY;
            const delta = currentY - startY;

            if (delta > 0) {
                e.preventDefault();
                setPullDistance(Math.min(delta, threshold * 2));
            }
        };

        const handleTouchEnd = async () => {
            if (pullDistance > threshold && !refreshing) {
                setRefreshing(true);
                try {
                    await onRefresh();
                } finally {
                    setRefreshing(false);
                }
            }
            setPullDistance(0);
            isPulling = false;
        };

        document.addEventListener("touchstart", handleTouchStart, { passive: true });
        document.addEventListener("touchmove", handleTouchMove, { passive: false });
        document.addEventListener("touchend", handleTouchEnd);

        return () => {
            document.removeEventListener("touchstart", handleTouchStart);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
        };
    }, [onRefresh, threshold, refreshing, pullDistance]);

    return { refreshing, pullDistance };
};

// 移动端手势导航
export const useGestureNavigation = () => {
    const [startX, setStartX] = useState(0);

    useEffect(() => {
        const handleSwipe = (direction) => {
            if (direction === "left") {
                window.history.back();
            } else if (direction === "right") {
                window.history.forward();
            }
        };

        let touchStartX = 0;
        let touchEndX = 0;

        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
        };

        const handleTouchMove = (e) => {
            touchEndX = e.touches[0].clientX;
        };

        const handleTouchEnd = () => {
            const swipeDistance = touchEndX - touchStartX;

            if (Math.abs(swipeDistance) > 100) {
                if (swipeDistance > 0 && touchStartX < 50) {
                    handleSwipe("right");
                } else if (swipeDistance < 0 && touchEndX > window.innerWidth - 50) {
                    handleSwipe("left");
                }
            }
        };

        document.addEventListener("touchstart", handleTouchStart, { passive: true });
        document.addEventListener("touchmove", handleTouchMove, { passive: true });
        document.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener("touchstart", handleTouchStart);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
        };
    }, []);
};

export default {
    useTouchFeedback,
    TouchFeedback,
    RippleEffect,
    SwipeToDelete,
    usePullToRefresh,
    useGestureNavigation,
};
