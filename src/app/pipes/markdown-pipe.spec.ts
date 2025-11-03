import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownPipe } from './markdown-pipe';

describe('MarkdownPipe', () => {
  let pipe: MarkdownPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MarkdownPipe],
    });
    sanitizer = TestBed.inject(DomSanitizer);
    pipe = new MarkdownPipe(sanitizer);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should transform markdown to HTML', () => {
    const markdown = '**bold** and *italic*';
    const result = pipe.transform(markdown);
    expect(result).toBeTruthy();
  });

  it('should handle null input', () => {
    const result = pipe.transform(null);
    expect(result).toBe('');
  });

  it('should handle undefined input', () => {
    const result = pipe.transform(undefined);
    expect(result).toBe('');
  });
});
