import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanesProps {
  children: [React.ReactElement, React.ReactElement];
  direction: 'vertical' | 'horizontal';
  initialSize?: number;
  minSize?: number;
}

const ResizablePanes: React.FC<ResizablePanesProps> = ({ children, direction, initialSize = 50, minSize = 15 }) => {
  const [firstPaneSize, setFirstPaneSize] = useState(initialSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = 'auto';
    document.body.style.userSelect = 'auto';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    let newSize;

    if (direction === 'vertical') { // side-by-side
      const clientX = e.clientX;
      const newWidth = clientX - containerRect.left;
      newSize = (newWidth / containerRect.width) * 100;
    } else { // top-and-bottom
      const clientY = e.clientY;
      const newHeight = clientY - containerRect.top;
      newSize = (newHeight / containerRect.height) * 100;
    }
    
    const clampedSize = Math.max(minSize, Math.min(newSize, 100 - minSize));
    setFirstPaneSize(clampedSize);
  }, [direction, minSize]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  useEffect(() => {
    setFirstPaneSize(initialSize);
  }, [direction, initialSize]);

  const [pane1, pane2] = children;
  const isVertical = direction === 'vertical';
  const [isHovered, setIsHovered] = useState(false);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isVertical ? 'row' : 'column',
    height: '100%',
    width: '100%',
  };

  const firstPaneStyle: React.CSSProperties = {
    flexBasis: `${firstPaneSize}%`,
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'hidden',
    minWidth: isVertical ? `${minSize}%` : '100%',
    minHeight: !isVertical ? `${minSize}%` : '100%',
  };

  const secondPaneStyle: React.CSSProperties = {
    flex: '1 1 0%',
    overflow: 'hidden',
  };

  const dividerStyle: React.CSSProperties = {
    flexShrink: 0,
    cursor: isVertical ? 'col-resize' : 'row-resize',
    backgroundColor: isHovered || isDragging.current ? '#3b82f6' : '#d1d5db',
    userSelect: 'none',
    transition: 'background-color 0.2s ease-in-out',
    ...(isVertical ? { width: '8px', margin: '0 4px' } : { height: '8px', margin: '4px 0' })
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <div style={firstPaneStyle}>
        {pane1}
      </div>
      <div
        style={dividerStyle}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="separator"
        aria-orientation={direction}
        aria-valuenow={firstPaneSize}
        aria-valuemin={minSize}
        aria-valuemax={100 - minSize}
      />
      <div style={secondPaneStyle}>
        {pane2}
      </div>
    </div>
  );
};

export default ResizablePanes;
