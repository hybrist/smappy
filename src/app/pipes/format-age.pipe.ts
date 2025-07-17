import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pure pipe to format age in milliseconds to a human-readable string
 *
 * @example
 * {{ 86400000 | formatAge }} // "1d ago"
 * {{ 3600000 | formatAge }}  // "1h ago"
 * {{ 60000 | formatAge }}    // "1m ago"
 * {{ 30000 | formatAge }}    // "just now"
 */
@Pipe({
  name: 'formatAge',
  pure: true,
})
export class FormatAgePipe implements PipeTransform {
  transform(ageMs: number): string {
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'just now';
    }
  }
}
