  generateAllLayouts(): { name: string; icon: string; description: string; positions: { x: number; y: number; width: number; height: number }[] }[] {
    const widgets = this.pageWidgets;
    const cw = this.canvasWidth;
    const ch = this.canvasHeight;
    const n = widgets.length;
    if (n < 2) return [];

    return [
      { name: 'Golden Spiral', icon: '🌀', description: 'Fibonacci-inspired proportioned asymmetric layout', positions: this.layoutGoldenSpiral(widgets, cw, ch) },
      { name: 'Editorial Hero', icon: '📰', description: 'A massive visual hero block balanced by a neat sidebar of details', positions: this.layoutEditorialHero(widgets, cw, ch) },
      { name: 'Zen Overlap', icon: '🍃', description: 'Floating widgets with elegant negative space and slight overlaps', positions: this.layoutZenOverlap(widgets, cw, ch) },
      { name: 'Mondrian', icon: '🟥', description: 'Bold, structured abstract geometric compartments', positions: this.layoutMondrian(widgets, cw, ch) },
      { name: 'Rule of Thirds', icon: '◰', description: 'Classic photography grid alignment for strong visual anchors', positions: this.layoutRuleOfThirds(widgets, cw, ch) },
      { name: 'Typographic', icon: 'T', description: 'Ultra-wide and narrow contrast blocks for text-heavy displays', positions: this.layoutTypographic(widgets, cw, ch) }
    ];
  }

  private assignCreativeBoxes(widgets: Widget[], boxes: {x: number, y: number, width: number, height: number}[]): {x: number, y: number, width: number, height: number}[] {
    const heroTypes = ['photo', 'youtube', 'radar', 'ai_briefing', 'weather', 'clock'];
    const listTypes = ['calendar', 'todo', 'rss', 'chores', 'meal_planner'];

    const scored = widgets.map((w, i) => {
      let score = 0;
      if (heroTypes.includes(w.type)) score += 100 - heroTypes.indexOf(w.type);
      else if (listTypes.includes(w.type)) score += 50 - listTypes.indexOf(w.type);
      return { index: i, score: score, widget: w };
    });

    scored.sort((a, b) => b.score - a.score);
    const sortedBoxes = [...boxes].sort((a, b) => (b.width * b.height) - (a.width * a.height));
    const positions = new Array(widgets.length);
    for (let i = 0; i < scored.length; i++) {
      // Safely map in case we have more widgets than boxes (shouldn't happen but just in case)
      const box = i < sortedBoxes.length ? sortedBoxes[i] : sortedBoxes[sortedBoxes.length - 1];
      positions[scored[i].index] = { ...box };
    }
    return positions;
  }

  layoutGoldenSpiral(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 30;
    const gap = 20;
    const boxes = [];
    
    let x = margin;
    let y = margin;
    let w = cw - margin * 2;
    let h = ch - margin * 2;
    let dir = 0; // 0=right, 1=down, 2=left, 3=up

    for(let i = 0; i < n; i++) {
       if (i === n - 1) {
          boxes.push({x, y, width: w, height: h});
          break;
       }
       const ratio = 0.618;
       if (dir === 0) {
          const splitW = Math.floor((w - gap) * ratio);
          boxes.push({x, y, width: splitW, height: h});
          x += splitW + gap;
          w -= splitW + gap;
       } else if (dir === 1) {
          const splitH = Math.floor((h - gap) * ratio);
          boxes.push({x, y, width: w, height: splitH});
          y += splitH + gap;
          h -= splitH + gap;
       } else if (dir === 2) {
          const splitW = Math.floor((w - gap) * ratio);
          boxes.push({x: x + w - splitW, y, width: splitW, height: h});
          w -= splitW + gap;
       } else if (dir === 3) {
          const splitH = Math.floor((h - gap) * ratio);
          boxes.push({x, y: y + h - splitH, width: w, height: splitH});
          h -= splitH + gap;
       }
       dir = (dir + 1) % 4;
    }
    return this.assignCreativeBoxes(widgets, boxes);
  }

  layoutEditorialHero(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 40;
    const gap = 24;
    const boxes = [];
    
    const heroW = Math.floor((cw - margin*2 - gap) * 0.66);
    const heroH = ch - margin*2;
    boxes.push({x: margin, y: margin, width: heroW, height: heroH});
    
    const rightX = margin + heroW + gap;
    const rightW = cw - margin*2 - heroW - gap;
    const rem = n - 1;
    
    if (rem > 0) {
      if (rem === 1) {
         boxes.push({x: rightX, y: margin, width: rightW, height: heroH});
      } else {
         const topH = Math.floor((heroH - gap) * 0.4);
         boxes.push({x: rightX, y: margin, width: rightW, height: topH});
         
         const bottomRem = rem - 1;
         const bottomY = margin + topH + gap;
         const bottomH = heroH - topH - gap;
         const cellW = Math.floor((rightW - gap * (bottomRem - 1)) / bottomRem);
         
         for(let i = 0; i < bottomRem; i++) {
             boxes.push({
               x: rightX + i*(cellW + gap), 
               y: bottomY, 
               width: cellW, 
               height: bottomH
             });
         }
      }
    }
    return this.assignCreativeBoxes(widgets, boxes);
  }

  layoutZenOverlap(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 50;
    const boxes = [];
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const availW = cw - margin * 2;
    const availH = ch - margin * 2;
    const cellW = Math.floor(availW / cols);
    const cellH = Math.floor(availH / rows);
    
    for(let i = 0; i < n; i++) {
       const col = i % cols;
       const row = Math.floor(i / cols);
       const w = Math.floor(cellW * 0.65);
       const h = Math.floor(cellH * 0.75);
       
       const offsetX = (i % 2 === 0) ? cellW * 0.1 : cellW * 0.25;
       const offsetY = (i % 3 === 0) ? cellH * 0.1 : cellH * 0.2;
       
       boxes.push({
         x: margin + col * cellW + offsetX,
         y: margin + row * cellH + offsetY,
         width: w,
         height: h
       });
    }
    return this.assignCreativeBoxes(widgets, boxes);
  }

  layoutMondrian(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 0; 
    const gap = 12; 
    const boxes: {x: number, y: number, width: number, height: number}[] = [];
    
    function splitBox(box: {x: number, y: number, width: number, height: number}, splitsLeft: number, alternate: number) {
       if (splitsLeft <= 0) {
         boxes.push(box);
         return;
       }
       const splitRatio = 0.35 + (splitsLeft * 0.1) % 0.3; 
       
       if (alternate % 2 === 0) {
         const w1 = Math.floor((box.width - gap) * splitRatio);
         const w2 = box.width - gap - w1;
         splitBox({x: box.x, y: box.y, width: w1, height: box.height}, Math.floor((splitsLeft-1)/2), alternate+1);
         splitBox({x: box.x + w1 + gap, y: box.y, width: w2, height: box.height}, Math.ceil((splitsLeft-1)/2), alternate+1);
       } else {
         const h1 = Math.floor((box.height - gap) * splitRatio);
         const h2 = box.height - gap - h1;
         splitBox({x: box.x, y: box.y, width: box.width, height: h1}, Math.floor((splitsLeft-1)/2), alternate+1);
         splitBox({x: box.x, y: box.y + h1 + gap, width: box.width, height: h2}, Math.ceil((splitsLeft-1)/2), alternate+1);
       }
    }
    
    splitBox({x: margin, y: margin, width: cw - margin*2, height: ch - margin*2}, n - 1, 0);
    return this.assignCreativeBoxes(widgets, boxes);
  }

  layoutRuleOfThirds(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 40;
    const gap = 20;
    const boxes = [];
    
    const mainW = Math.floor((cw - margin*2) * (2/3)) - gap;
    const mainH = Math.floor((ch - margin*2) * (2/3)) - gap;
    boxes.push({x: margin, y: margin, width: mainW, height: mainH});
    
    if (n > 1) {
        const bottomY = margin + mainH + gap;
        const bottomH = ch - margin*2 - mainH - gap;
        boxes.push({x: margin, y: bottomY, width: mainW, height: bottomH});
    }
    if (n > 2) {
        const rightX = margin + mainW + gap;
        const rightW = cw - margin*2 - mainW - gap;
        const rem = n - 2;
        const remH = Math.floor((ch - margin*2 - gap*(rem-1)) / rem);
        for(let i = 0; i < rem; i++) {
           boxes.push({x: rightX, y: margin + i*(remH + gap), width: rightW, height: remH});
        }
    }
    return this.assignCreativeBoxes(widgets, boxes);
  }

  layoutTypographic(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 30;
    const gap = 16;
    const boxes = [];
    
    const narrowW = Math.floor((cw - margin*2 - gap*2) * 0.2);
    const wideW = cw - margin*2 - gap*2 - narrowW*2;
    
    const leftCount = Math.floor(n / 3);
    const centerCount = 1;
    let rightCount = n - leftCount - centerCount;
    if (rightCount < 0) rightCount = 0;
    
    if (leftCount > 0) {
      const leftH = Math.floor((ch - margin*2 - gap*(leftCount-1)) / leftCount);
      for(let i = 0; i < leftCount; i++) {
        boxes.push({x: margin, y: margin + i*(leftH + gap), width: narrowW, height: leftH});
      }
    }
    
    boxes.push({x: margin + narrowW + gap, y: margin, width: wideW, height: ch - margin*2});
    
    if (rightCount > 0) {
      const rightX = margin + narrowW + gap + wideW + gap;
      const rightH = Math.floor((ch - margin*2 - gap*(rightCount-1)) / rightCount);
      for(let i = 0; i < rightCount; i++) {
        boxes.push({x: rightX, y: margin + i*(rightH + gap), width: narrowW, height: rightH});
      }
    }
    return this.assignCreativeBoxes(widgets, boxes);
  }
