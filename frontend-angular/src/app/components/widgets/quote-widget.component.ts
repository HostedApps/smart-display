import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { QuoteConfig } from '../../models/display.model';

interface QuoteItem {
  quote: string;
  author: string;
  category: string;
}

@Component({
  selector: 'app-quote-widget',
  template: `
    <div class="quote-card sd-card">
      <div class="quote-header">
        <span class="category-chip">{{ categoryLabel }}</span>
        <span class="quote-mark">“</span>
      </div>

      <div class="quote-body">
        <p class="quote-text">{{ activeQuote.quote }}</p>
        <div class="author-row">
          <span class="dash">—</span>
          <span class="author-name">{{ activeQuote.author }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quote-card {
      height: 100%;
      box-sizing: border-box;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
    }
    .quote-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .category-chip {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--sd-accent);
      background: var(--sd-accent-soft);
      border: 1px solid var(--sd-accent-border);
      padding: 2px 8px;
      border-radius: var(--sd-radius-sm);
    }
    .quote-mark {
      font-size: var(--sd-fs-xl);
      line-height: 0.6;
      font-family: var(--font-serif, Georgia, serif);
      color: var(--sd-text-subtle);
      opacity: 0.5;
      margin-top: 8px;
    }
    .quote-body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;
    }
    .quote-text {
      font-family: var(--font-serif, 'Newsreader', Georgia, serif);
      font-size: var(--sd-fs-title);
      font-weight: 400;
      line-height: 1.4;
      font-style: italic;
      color: var(--sd-text);
      margin: 0 0 8px 0;
      letter-spacing: 0.2px;
    }
    .author-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }
    .dash {
      color: var(--sd-text-muted);
      font-weight: 300;
    }
    .author-name {
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      color: var(--sd-text-muted);
      letter-spacing: 0.3px;
    }
  `]
})
export class QuoteWidgetComponent implements OnInit, OnChanges {
  @Input() config: QuoteConfig = {
    category: 'inspirational',
    customQuote: '',
    customAuthor: ''
  };

  activeQuote: QuoteItem = { quote: '', author: '', category: '' };

  private quotesLibrary: QuoteItem[] = [
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain", category: "Inspirational" },
    { quote: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "Inspirational" },
    { quote: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt", category: "Wisdom" },
    { quote: "We suffer more often in imagination than in reality.", author: "Seneca", category: "Wisdom" },
    { quote: "Simplicity is the soul of efficiency.", author: "Austin Freeman", category: "Wisdom" },
    { quote: "Small deeds done are better than great deeds planned.", author: "Peter Marshall", category: "Inspirational" },
    { quote: "On this day in 1969, Apollo 11 landed humans on the Moon for the first time.", author: "Historical Milestone", category: "On This Day" },
    { quote: "On this day in 1977, NASA launched the Voyager 2 spacecraft to explore interstellar space.", author: "Space History", category: "On This Day" },
    { quote: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt", category: "Inspirational" }
  ];

  get categoryLabel(): string {
    if (this.config.category === 'custom') return 'Family Motto';
    return this.activeQuote.category || 'Thought of the Day';
  }

  ngOnInit(): void {
    this.selectQuote();
  }

  ngOnChanges(): void {
    this.selectQuote();
  }

  private selectQuote(): void {
    if (this.config.category === 'custom' && this.config.customQuote) {
      this.activeQuote = {
        quote: this.config.customQuote,
        author: this.config.customAuthor || 'Family',
        category: 'Custom'
      };
      return;
    }

    let filtered = this.quotesLibrary;
    if (this.config.category === 'wisdom') {
      filtered = this.quotesLibrary.filter(q => q.category === 'Wisdom');
    } else if (this.config.category === 'history') {
      filtered = this.quotesLibrary.filter(q => q.category === 'On This Day');
    } else {
      filtered = this.quotesLibrary.filter(q => q.category === 'Inspirational');
    }

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const index = dayOfYear % (filtered.length || 1);
    this.activeQuote = filtered[index] || this.quotesLibrary[0];
  }
}
