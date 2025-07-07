import { Injectable } from '@angular/core';
import { SourceFragment } from '../models/source-analysis.models';

@Injectable({
  providedIn: 'root',
})
export class FileParsersService {
  parseCSSStyleSheets(
    lines: string[],
    fragments: SourceFragment[],
    filePath: string,
  ): void {
    let currentSelector = '';
    let startLine = 0;
    let bracketDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

      if (line.includes('{')) {
        if (bracketDepth === 0) {
          currentSelector = line.replace('{', '').trim();
          startLine = i + 1;
        }
        bracketDepth++;
      }

      if (line.includes('}')) {
        bracketDepth--;
        if (bracketDepth === 0 && currentSelector) {
          fragments.push({
            id: `${filePath}:${startLine}`,
            name: currentSelector,
            type: 'unknown',
            startLine,
            endLine: i + 1,
            startColumn: 0,
            endColumn: line.length,
            sourceSize: this.calculateFragmentSize(lines, startLine - 1, i),
            isIncludedInBundle: true,
          });
          currentSelector = '';
        }
      }
    }
  }

  parseHTML(
    lines: string[],
    fragments: SourceFragment[],
    filePath: string,
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const tagMatch = line.match(/<(\w+)(?:\s|>)/);

      if (tagMatch) {
        fragments.push({
          id: `${filePath}:${i + 1}`,
          name: tagMatch[1],
          type: 'unknown',
          startLine: i + 1,
          endLine: i + 1,
          startColumn: 0,
          endColumn: line.length,
          sourceSize: line.length,
          isIncludedInBundle: true,
        });
      }
    }
  }

  parseGeneric(
    lines: string[],
    fragments: SourceFragment[],
    filePath: string,
  ): void {
    fragments.push({
      id: `${filePath}:1`,
      name: filePath.split('/').pop() || 'unknown',
      type: 'unknown',
      startLine: 1,
      endLine: lines.length,
      startColumn: 0,
      endColumn: 0,
      sourceSize: lines.join('\n').length,
      isIncludedInBundle: true,
    });
  }

  getFileExtension(filePath: string): string {
    return filePath.split('.').pop()?.toLowerCase() || '';
  }

  private calculateFragmentSize(
    lines: string[],
    startIndex: number,
    endIndex: number,
  ): number {
    return lines.slice(startIndex, endIndex + 1).join('\n').length;
  }
}
