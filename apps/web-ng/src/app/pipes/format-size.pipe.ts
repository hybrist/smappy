import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pure pipe to format bytes into human-readable file sizes
 *
 * @example
 * {{ 1024 | formatSize }} // "1 KB"
 * {{ 1048576 | formatSize }} // "1 MB"
 * {{ 0 | formatSize }} // "0 B"
 */
@Pipe({
  name: 'formatSize',
  pure: true,
})
export class FormatSizePipe implements PipeTransform {
  transform(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
