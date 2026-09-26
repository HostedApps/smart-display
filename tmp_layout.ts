  // AUTO ARRANGE LAYOUTS
  // ========================

  openAutoArrangeModal(): void {
    this.selectedLayoutIndex = -1;
    this.layoutPreviews = this.generateAllLayouts();
    this.showAutoArrangeModal = true;
  }

  generateAllLayouts(): { name: string; icon: string; description: string; positions: { x: number; y: number; width: number; height: number }[] }[] {
    const widgets = this.pageWidgets;
    const cw = this.canvasWidth;
    const ch = this.canvasHeight;
    const n = widgets.length;
    if (n < 2) return [];

    return [
      { name: 'Even Grid', icon: '⊞', description: 'Clean symmetric grid with equal-sized cells', positions: this.layoutEvenGrid(n, cw, ch) },
      { name: 'Featured + Grid', icon: '◧', description: 'Hero widget on the left, smaller tiles on the right', positions: this.layoutFeaturedGrid(n, cw, ch) },
      { name: 'Two Column', icon: '▥', description: 'Balanced left-right columns', positions: this.layoutTwoColumn(n, cw, ch) },
      { name: 'Horizontal Bands', icon: '☰', description: 'Full-width rows stacked vertically', positions: this.layoutHorizontalBands(n, cw, ch) },
      { name: 'Command Center', icon: '◉', description: 'Large center widget surrounded by edge panels', positions: this.layoutCommandCenter(n, cw, ch) },
      { name: 'Mosaic', icon: '◫', description: 'Varied sizes in staggered columns for visual depth', positions: this.layoutMosaic(n, cw, ch) }
    ];
  }

  layoutEvenGrid(n: number, cw: number, ch: number): { x: number; y: number; width: number; height: number }[] {
    const gap = 16;
    const margin = 20;
    const cols = Math.ceil(Math.sqrt(n * (cw / ch)));
    const rows = Math.ceil(n / cols);
    const cellW = Math.floor((cw - margin * 2 - gap * (cols - 1)) / cols);
    const cellH = Math.floor((ch - margin * 2 - gap * (rows - 1)) / rows);
    const positions: { x: number; y: number; width: number; height: number }[] = [];
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({
        x: margin + col * (cellW + gap),
        y: margin + row * (cellH + gap),
        width: Math.max(100, cellW),
        height: Math.max(60, cellH)
      });
    }
    return positions;
  }

  layoutFeaturedGrid(n: number, cw: number, ch: number): { x: number; y: number; width: number; height: number }[] {
    const gap = 16;
    const margin = 20;
    const positions: { x: number; y: number; width: number; height: number }[] = [];
    if (n === 1) {
      positions.push({ x: margin, y: margin, width: cw - margin * 2, height: ch - margin * 2 });
      return positions;
    }
    const featuredW = Math.floor((cw - margin * 2 - gap) * 0.55);
    const featuredH = ch - margin * 2;
    positions.push({ x: margin, y: margin, width: featuredW, height: featuredH });

    const rightX = margin + featuredW + gap;
    const rightW = cw - rightX - margin;
    const sideCount = n - 1;
    const sideCols = sideCount > 4 ? 2 : 1;
    const sideRows = Math.ceil(sideCount / sideCols);
    const sideCellW = Math.floor((rightW - gap * (sideCols - 1)) / sideCols);
    const sideCellH = Math.floor((featuredH - gap * (sideRows - 1)) / sideRows);
    for (let i = 0; i < sideCount; i++) {
      const col = i % sideCols;
      const row = Math.floor(i / sideCols);
      positions.push({
        x: rightX + col * (sideCellW + gap),
        y: margin + row * (sideCellH + gap),
        width: Math.max(100, sideCellW),
        height: Math.max(60, sideCellH)
      });
    }
    return positions;
  }

  layoutTwoColumn(n: number, cw: number, ch: number): { x: number; y: number; width: number; height: number }[] {
    const gap = 16;
    const margin = 20;
    const colW = Math.floor((cw - margin * 2 - gap) / 2);
    const leftCount = Math.ceil(n / 2);
    const rightCount = n - leftCount;
    const positions: { x: number; y: number; width: number; height: number }[] = [];

    const leftCellH = Math.floor((ch - margin * 2 - gap * (leftCount - 1)) / leftCount);
    for (let i = 0; i < leftCount; i++) {
      positions.push({
        x: margin,
        y: margin + i * (leftCellH + gap),
        width: colW,
        height: Math.max(60, leftCellH)
      });
    }

    const rightCellH = rightCount > 0 ? Math.floor((ch - margin * 2 - gap * (rightCount - 1)) / rightCount) : 0;
    for (let i = 0; i < rightCount; i++) {
      positions.push({
        x: margin + colW + gap,
        y: margin + i * (rightCellH + gap),
        width: colW,
        height: Math.max(60, rightCellH)
      });
    }
    return positions;
  }

  layoutHorizontalBands(n: number, cw: number, ch: number): { x: number; y: number; width: number; height: number }[] {
    const gap = 16;
    const margin = 20;
    const bandW = cw - margin * 2;
    const bandH = Math.floor((ch - margin * 2 - gap * (n - 1)) / n);
    const positions: { x: number; y: number; width: number; height: number }[] = [];
    for (let i = 0; i < n; i++) {
      positions.push({
        x: margin,
        y: margin + i * (bandH + gap),
        width: bandW,
        height: Math.max(60, bandH)
      });
    }
    return positions;
  }

  layoutCommandCenter(n: number, cw: number, ch: number): { x: number; y: number; width: number; height: number }[] {
    const gap = 16;
    const margin = 20;
    const positions: { x: number; y: number; width: number; height: number }[] = [];

    if (n <= 2) return this.layoutEvenGrid(n, cw, ch);

    const edgeSize = Math.min(180, Math.floor(Math.min(cw, ch) * 0.22));
    const centerX = margin + edgeSize + gap;
    const centerY = margin + edgeSize + gap;
    const centerW = cw - margin * 2 - (edgeSize + gap) * 2;
    const centerH = ch - margin * 2 - (edgeSize + gap) * 2;
    positions.push({ x: centerX, y: centerY, width: Math.max(100, centerW), height: Math.max(60, centerH) });

    const edgeWidgets = n - 1;
    const perSide = Math.ceil(edgeWidgets / 4);
    let placed = 0;

    // Top edge
    const topCount = Math.min(perSide, edgeWidgets - placed);
    const topW = Math.floor((cw - margin * 2 - gap * (topCount - 1)) / topCount);
    for (let i = 0; i < topCount && placed < edgeWidgets; i++, placed++) {
      positions.push({ x: margin + i * (topW + gap), y: margin, width: Math.max(100, topW), height: edgeSize });
    }

    // Bottom edge
    const bottomCount = Math.min(perSide, edgeWidgets - placed);
    const bottomW = Math.floor((cw - margin * 2 - gap * (bottomCount - 1)) / Math.max(1, bottomCount));
