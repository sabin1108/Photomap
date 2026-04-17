import { useState, useEffect } from 'react';


export function useGridBreakpoints() {
  const [columns, setColumns] = useState(3);
  const [gap, setGap] = useState(2); // in pixels

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      let newCols = 3;
      let newGap = 2;

      if (width >= 1024) {
        newCols = 8;
        newGap = 4;
      } else if (width >= 768) {
        newCols = 6;
        newGap = 4; // md:gap-1 (1 = 0.25rem = 4px)
      } else if (width >= 640) {
        newCols = 4;
        newGap = 2;
      }

      setColumns(newCols);
      setGap(newGap);
    };

    // Initial call
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { columns, gap };
}
