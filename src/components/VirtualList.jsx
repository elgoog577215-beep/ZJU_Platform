import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Virtual List Component
 * Efficiently renders large lists by only mounting visible items
 * Features:
 * - Dynamic item heights
 * - Smooth scrolling
 * - Overscan for smoother experience
 * - Windowing for memory efficiency
 */

const VirtualList = ({
  items = [],
  renderItem,
  itemHeight = 80,
  overscan = 5,
  className = '',
  containerHeight = '100vh',
  onEndReached,
  endReachedThreshold = 200,
  loading = false,
  LoadingComponent,
  EmptyComponent,
  keyExtractor = (item, index) => index,
  ...props
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightValue, setContainerHeightValue] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const endReachedTriggered = useRef(false);

  // Calculate visible range
  const { virtualItems, totalHeight, startIndex, endIndex } = useMemo(() => {
    if (!containerHeightValue) {
      return { virtualItems: [], totalHeight: 0, startIndex: 0, endIndex: 0 };
    }

    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeightValue / itemHeight);
    const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

    const virtualItems = items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute',
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        left: 0,
        right: 0,
      }
    }));

    return { virtualItems, totalHeight, startIndex, endIndex };
  }, [items, itemHeight, scrollTop, containerHeightValue, overscan]);

  // Update container height
  useEffect(() => {
    if (containerRef.current) {
      const updateHeight = () => {
        setContainerHeightValue(containerRef.current.clientHeight);
      };

      updateHeight();

      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(containerRef.current);

      return () => resizeObserver.disconnect();
    }
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Check if end is reached
    if (onEndReached && !endReachedTriggered.current && !loading) {
      const scrollBottom = newScrollTop + containerHeightValue;
      const threshold = totalHeight - endReachedThreshold;

      if (scrollBottom >= threshold) {
        endReachedTriggered.current = true;
        onEndReached();
      }
    }
  }, [containerHeightValue, totalHeight, onEndReached, loading, endReachedThreshold]);

  // Reset end reached trigger when items change
  useEffect(() => {
    endReachedTriggered.current = false;
  }, [items.length]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Empty state
  if (items.length === 0 && EmptyComponent) {
    return (
      <div
        ref={containerRef}
        className={`overflow-auto ${className}`}
        style={{ height: containerHeight }}
      >
        <EmptyComponent />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      {...props}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <AnimatePresence mode="popLayout">
          {virtualItems.map(({ item, index, style }) => (
            <motion.div
              key={keyExtractor(item, index)}
              style={style}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.2, delay: index * 0.02 }
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              {renderItem(item, index, isScrolling)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Loading indicator */}
      {loading && LoadingComponent && (
        <div className="py-4">
          <LoadingComponent />
        </div>
      )}
    </div>
  );
};

/**
 * Virtual Grid Component
 * For grid layouts with virtualization
 */
export const VirtualGrid = ({
  items = [],
  renderItem,
  columnWidth = 300,
  rowHeight = 300,
  gap = 16,
  overscan = 2,
  className = '',
  containerHeight = '100vh',
  onEndReached,
  loading = false,
  LoadingComponent,
  EmptyComponent,
  keyExtractor = (item, index) => index,
  ...props
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const endReachedTriggered = useRef(false);

  // Calculate columns based on container width
  const columns = useMemo(() => {
    if (containerDimensions.width === 0) return 1;
    return Math.max(1, Math.floor((containerDimensions.width + gap) / (columnWidth + gap)));
  }, [containerDimensions.width, columnWidth, gap]);

  // Calculate rows
  const rows = useMemo(() => {
    return Math.ceil(items.length / columns);
  }, [items.length, columns]);

  // Calculate visible range
  const { virtualItems, totalHeight } = useMemo(() => {
    if (containerDimensions.height === 0) {
      return { virtualItems: [], totalHeight: 0 };
    }

    const totalHeight = rows * (rowHeight + gap);
    const startRow = Math.max(0, Math.floor(scrollTop / (rowHeight + gap)) - overscan);
    const visibleRows = Math.ceil(containerDimensions.height / (rowHeight + gap));
    const endRow = Math.min(rows, startRow + visibleRows + overscan * 2);

    const virtualItems = [];
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index >= items.length) break;

        virtualItems.push({
          item: items[index],
          index,
          style: {
            position: 'absolute',
            top: row * (rowHeight + gap),
            left: col * (columnWidth + gap),
            width: columnWidth,
            height: rowHeight,
          }
        });
      }
    }

    return { virtualItems, totalHeight };
  }, [items, columns, rows, rowHeight, gap, scrollTop, containerDimensions.height, overscan]);

  // Update container dimensions
  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      };

      updateDimensions();

      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);

      return () => resizeObserver.disconnect();
    }
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Check if end is reached
    if (onEndReached && !endReachedTriggered.current && !loading) {
      const scrollBottom = newScrollTop + containerDimensions.height;
      const threshold = totalHeight - rowHeight * 2;

      if (scrollBottom >= threshold) {
        endReachedTriggered.current = true;
        onEndReached();
      }
    }
  }, [containerDimensions.height, totalHeight, onEndReached, loading, rowHeight]);

  // Reset end reached trigger
  useEffect(() => {
    endReachedTriggered.current = false;
  }, [items.length]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Empty state
  if (items.length === 0 && EmptyComponent) {
    return (
      <div
        ref={containerRef}
        className={`overflow-auto ${className}`}
        style={{ height: containerHeight }}
      >
        <EmptyComponent />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      {...props}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div key={keyExtractor(item, index)} style={style}>
            {renderItem(item, index, isScrolling)}
          </div>
        ))}
      </div>

      {loading && LoadingComponent && (
        <div className="py-4">
          <LoadingComponent />
        </div>
      )}
    </div>
  );
};

/**
 * Masonry Virtual List
 * For Pinterest-style masonry layouts
 */
export const VirtualMasonry = ({
  items = [],
  renderItem,
  columnCount = 3,
  gap = 16,
  className = '',
  containerHeight = '100vh',
  estimateHeight = 300,
  keyExtractor = (item, index) => index,
  ...props
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [itemHeights, setItemHeights] = useState({});

  const columnWidth = useMemo(() => {
    return (containerWidth - (columnCount - 1) * gap) / columnCount;
  }, [containerWidth, columnCount, gap]);

  // Calculate positions
  const { positions, totalHeight } = useMemo(() => {
    const positions = [];
    const columnHeights = new Array(columnCount).fill(0);

    items.forEach((item, index) => {
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      const height = itemHeights[index] || estimateHeight;

      positions.push({
        item,
        index,
        x: shortestColumn * (columnWidth + gap),
        y: columnHeights[shortestColumn],
        height,
        column: shortestColumn
      });

      columnHeights[shortestColumn] += height + gap;
    });

    return { positions, totalHeight: Math.max(...columnHeights) };
  }, [items, columnCount, columnWidth, gap, itemHeights, estimateHeight]);

  // Update container width
  useEffect(() => {
    if (containerRef.current) {
      const updateWidth = () => {
        setContainerWidth(containerRef.current.clientWidth);
      };

      updateWidth();

      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(containerRef.current);

      return () => resizeObserver.disconnect();
    }
  }, []);

  // Measure item heights
  const measureRef = useCallback((node, index) => {
    if (node) {
      const height = node.getBoundingClientRect().height;
      setItemHeights(prev => ({
        ...prev,
        [index]: height
      }));
    }
  }, []);

  // Filter visible items
  const visibleItems = useMemo(() => {
    return positions.filter(pos => {
      const isVisible = 
        pos.y + pos.height >= scrollTop - estimateHeight &&
        pos.y <= scrollTop + containerRef.current?.clientHeight + estimateHeight;
      return isVisible;
    });
  }, [positions, scrollTop, estimateHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      {...props}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, x, y }) => (
          <div
            key={keyExtractor(item, index)}
            ref={(node) => measureRef(node, index)}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: columnWidth,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualList;
