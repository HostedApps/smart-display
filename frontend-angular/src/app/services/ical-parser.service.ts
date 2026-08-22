import { Injectable } from '@angular/core';

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  isAllDay: boolean;
}

@Injectable({ providedIn: 'root' })
export class ICalParserService {
  parse(icsData: string): CalendarEvent[] {
    const lines = icsData.split(/\r\n|\n|\r/);
    const events: CalendarEvent[] = [];
    let currentEvent: Partial<CalendarEvent> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.title && currentEvent.startDate) {
          events.push({
            title: currentEvent.title,
            startDate: currentEvent.startDate,
            endDate: currentEvent.endDate || currentEvent.startDate,
            location: currentEvent.location,
            isAllDay: !!currentEvent.isAllDay
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
      .filter(e => e.endDate >= new Date()) // Keep only upcoming and ongoing events
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  private parseDateLine(line: string): { date: Date; isAllDay: boolean } {
    const parts = line.split(':');
    const value = parts[1];
    const isAllDay = parts[0].includes('VALUE=DATE');

    if (isAllDay) {
      const year = parseInt(value.substring(0, 4), 10);
      const month = parseInt(value.substring(4, 6), 10) - 1;
      const day = parseInt(value.substring(6, 8), 10);
      return { date: new Date(year, month, day), isAllDay: true };
    }

    // Parse UTC / standard timestamp YYYYMMDDTHHMMSSZ
    const year = parseInt(value.substring(0, 4), 10);
    const month = parseInt(value.substring(4, 6), 10) - 1;
    const day = parseInt(value.substring(6, 8), 10);
    const hour = parseInt(value.substring(9, 11), 10) || 0;
    const min = parseInt(value.substring(11, 13), 10) || 0;
    const sec = parseInt(value.substring(13, 15), 10) || 0;

    return { date: new Date(Date.UTC(year, month, day, hour, min, sec)), isAllDay: false };
  }
}
