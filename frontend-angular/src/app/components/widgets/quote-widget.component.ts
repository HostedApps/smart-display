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
    <div class="quote-card">
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
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85));
      border-radius: 12px;
      padding: 16px;
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      position: relative;
    }
    .quote-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .category-chip {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 2px 8px;
      border-radius: 10px;
    }
    .quote-mark {
      font-size: 2.2rem;
      line-height: 0.8;
      font-family: Georgia, serif;
      color: rgba(255, 255, 255, 0.15);
      margin-top: 4px;
    }
    .quote-body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;
    }
    .quote-text {
      font-size: 0.95rem;
      font-weight: 400;
      line-height: 1.45;
      font-style: italic;
      color: #f8fafc;
      margin: 0 0 10px 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Georgia, serif;
    }
    .author-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }
    .dash {
      color: #94a3b8;
      font-weight: 300;
    }
    .author-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: #cbd5e1;
      letter-spacing: 0.2px;
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

    // Pick quote based on day of year for consistency throughout the day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const index = dayOfYear % (filtered.length || 1);
    this.activeQuote = filtered[index] || this.quotesLibrary[0];
  }
}
