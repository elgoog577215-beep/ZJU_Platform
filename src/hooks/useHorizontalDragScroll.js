import { useCallback, useRef } from "react";

const DRAG_THRESHOLD = 5;

export const useHorizontalDragScroll = () => {
  const scrollRef = useRef(null);
  const dragState = useRef({
    active: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
  });

  const finishDrag = useCallback(() => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
  }, []);

  const onPointerDown = useCallback((event) => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches
    ) {
      return;
    }
    if (event.pointerType === "touch") return;
    if (event.button !== undefined && event.button !== 0) return;

    const element = scrollRef.current;
    if (!element) return;
    if (
      event.target instanceof Element &&
      event.target.closest(
        'button, a, input, textarea, select, [role="button"]',
      )
    ) {
      return;
    }

    dragState.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: element.scrollLeft,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event) => {
    const element = scrollRef.current;
    const state = dragState.current;
    if (!element || !state.active) return;

    const deltaX = event.clientX - state.startX;
    if (Math.abs(deltaX) > DRAG_THRESHOLD) {
      state.moved = true;
    }

    if (state.moved) {
      element.scrollLeft = state.scrollLeft - deltaX;
      event.preventDefault();
    }
  }, []);

  const onClickCapture = useCallback((event) => {
    if (dragState.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragState.current.moved = false;
    }
  }, []);

  return {
    scrollRef,
    dragScrollProps: {
      onClickCapture,
      onPointerCancel: finishDrag,
      onPointerDown,
      onPointerLeave: finishDrag,
      onPointerMove,
      onPointerUp: finishDrag,
    },
  };
};
