import { Injectable } from '@angular/core';

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  isAllDay: boolean;
  color?: string;
  feedName?: string;
}

@Injectable({ providedIn: 'root' })
export class ICalParserService {
  parse(icsData: string, feedName: string = '', color: string = '#38bdf8'): CalendarEvent[] {
    const lines = icsData.split(/\r\n|\n|\r/);
    const events: CalendarEvent[] = [];
    let currentEvent: Partial<CalendarEvent> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === 'BEGIN:VEVENT') {
        currentEvent = { color, feedName };
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.title && currentEvent.startDate) {
          events.push({
            title: currentEvent.title,
            startDate: currentEvent.startDate,
            endDate: currentEvent.endDate || currentEvent.startDate,
            location: currentEvent.location,
            isAllDay: !!currentEvent.isAllDay,
            color: currentEvent.color || color,
            feedName: currentEvent.feedName || feedName
          });
        }
        currentEvent = null;
      } else if (currentEvent) {
        if (line.startsWith('SUMMARY:')) {
          currentEvent.title = line.substring(8);
        } else if (line.startsWith('LOCATION:')) {
          currentEvent.location = line.substring(9);
        } else if (line.startsWith('DTSTART')) {
          const parsed = this.parseDateLine(line);
          currentEvent.startDate = parsed.date;
          currentEvent.isAllDay = parsed.isAllDay;
        } else if (line.startsWith('DTEND')) {
          currentEvent.endDate = this.parseDateLine(line).date;
        }
      }
    }

    return events
      .filter(e => e.endDate >= new Date(Date.now() - 3600000 * 24)) // keep current day and upcoming
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  private parseDateLine(line: string): { date: Date; isAllDay: boolean } {
    const parts = line.split(':');
    const value = parts[1] || '';
    const isAllDay = parts[0].includes('VALUE=DATE') || value.length === 8;

    if (isAllDay && value.length >= 8) {
      const year = parseInt(value.substring(0, 4), 10);
      const month = parseInt(value.substring(4, 6), 10) - 1;
      const day = parseInt(value.substring(6, 8), 10);
      return { date: new Date(year, month, day), isAllDay: true };
    }

    if (value.length >= 15) {
      const year = parseInt(value.substring(0, 4), 10);
      const month = parseInt(value.substring(4, 6), 10) - 1;
      const day = parseInt(value.substring(6, 8), 10);
      const hour = parseInt(value.substring(9, 11), 10) || 0;
      const min = parseInt(value.substring(11, 13), 10) || 0;
      const sec = parseInt(value.substring(13, 15), 10) || 0;

      if (value.endsWith('Z')) {
        return { date: new Date(Date.UTC(year, month, day, hour, min, sec)), isAllDay: false };
      }
      return { date: new Date(year, month, day, hour, min, sec), isAllDay: false };
    }

    return { date: new Date(), isAllDay: false };
  }

  /**
   * Cleans and normalizes provider calendar links (Google, Apple iCloud, Outlook, Nextcloud)
   */
  normalizeCalendarUrl(url: string): string {
    if (!url) return '';
    let clean = url.trim();
    // Convert webcal:// or webcals:// to https://
    if (clean.startsWith('webcal://')) {
      clean = 'https://' + clean.substring(9);
    } else if (clean.startsWith('webcals://')) {
      clean = 'https://' + clean.substring(10);
    }
    return clean;
  }
}
