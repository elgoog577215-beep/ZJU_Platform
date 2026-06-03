import { useEffect, useRef } from "react";

const interactiveSelector =
  "input, textarea, select, option, [contenteditable='true'], [data-section-pager-ignore]";

const canNestedElementScroll = (target, deltaY, container) => {
  let element = target instanceof Element ? target : target?.parentElement;

  while (element && element !== container) {
    if (element.matches?.(interactiveSelector)) return true;

    const style = window.getComputedStyle(element);
    const canScroll =
      /(auto|scroll)/.test(style.overflowY) &&
      element.scrollHeight > element.clientHeight + 2;

    if (canScroll) {
      const atTop = element.scrollTop <= 1;
      const atBottom =
        element.scrollTop + element.clientHeight >= element.scrollHeight - 1;

      if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) {
        return true;
      }
    }

    element = element.parentElement;
  }

  return false;
};

const getSectionElements = (sectionIds) =>
  sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

const getCurrentSectionIndex = (container, sections) => {
  const probe = container.scrollTop + container.clientHeight * 0.36;
  let currentIndex = 0;

  sections.forEach((section, index) => {
    if (section.offsetTop <= probe) {
      currentIndex = index;
    }
  });

  return currentIndex;
};

const shouldLetTallSectionScroll = (container, section, deltaY) => {
  if (!section || section.offsetHeight <= container.clientHeight * 1.12) {
    return false;
  }

  const start = Math.max(section.offsetTop, 0);
  const end = Math.max(section.offsetTop + section.offsetHeight - container.clientHeight, start);
  const current = container.scrollTop;
  const nearStart = current <= start + 24;
  const nearEnd = current >= end - 24;

  if (deltaY > 0 && nearStart) return false;
  if (deltaY < 0 && nearEnd) return false;

  if (deltaY > 0) return current < end - 24;
  return current > start + 24;
};

export const useSectionPager = ({
  containerRef,
  sectionIds,
  setActiveIndex,
  reduceMotion = false,
  minWidth = 1024,
  lockMs = 820,
}) => {
  const lockRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !Array.isArray(sectionIds) || sectionIds.length < 2) {
      return undefined;
    }

    let unlockTimer = null;

    const scrollToSection = (index, sections) => {
      const targetIndex = Math.max(0, Math.min(index, sections.length - 1));
      const target = sections[targetIndex];
      if (!target) return;

      lockRef.current = true;
      setActiveIndex?.(targetIndex);

      container.scrollTo({
        top: Math.max(target.offsetTop, 0),
        behavior: reduceMotion ? "auto" : "smooth",
      });

      window.clearTimeout(unlockTimer);
      unlockTimer = window.setTimeout(() => {
        lockRef.current = false;
      }, reduceMotion ? 180 : lockMs);
    };

    const handleWheel = (event) => {
      if (window.innerWidth < minWidth || event.ctrlKey || event.metaKey) {
        return;
      }

      const deltaY = event.deltaY;
      if (Math.abs(deltaY) < 8) return;

      if (lockRef.current) {
        event.preventDefault();
        return;
      }

      if (canNestedElementScroll(event.target, deltaY, container)) {
        return;
      }

      const sections = getSectionElements(sectionIds);
      if (sections.length < 2) return;

      const currentIndex = getCurrentSectionIndex(container, sections);
      const currentSection = sections[currentIndex];

      if (shouldLetTallSectionScroll(container, currentSection, deltaY)) {
        return;
      }

      const direction = deltaY > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(currentIndex + direction, sections.length - 1));

      if (nextIndex === currentIndex) return;

      event.preventDefault();
      scrollToSection(nextIndex, sections);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.clearTimeout(unlockTimer);
      container.removeEventListener("wheel", handleWheel);
    };
  }, [
    containerRef,
    lockMs,
    minWidth,
    reduceMotion,
    sectionIds,
    setActiveIndex,
  ]);
};
