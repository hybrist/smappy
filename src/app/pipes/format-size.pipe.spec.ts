import { FormatSizePipe } from './format-size.pipe';

describe('FormatSizePipe', () => {
  let pipe: FormatSizePipe;

  beforeEach(() => {
    pipe = new FormatSizePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format bytes', () => {
    expect(pipe.transform(0)).toBe('0 B');
    expect(pipe.transform(512)).toBe('512 B');
    expect(pipe.transform(1023)).toBe('1023 B');
  });

  it('should format kilobytes', () => {
    expect(pipe.transform(1024)).toBe('1 KB');
    expect(pipe.transform(1536)).toBe('1.5 KB');
    expect(pipe.transform(2048)).toBe('2 KB');
  });

  it('should format megabytes', () => {
    expect(pipe.transform(1024 * 1024)).toBe('1 MB');
    expect(pipe.transform(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(pipe.transform(2 * 1024 * 1024)).toBe('2 MB');
  });

  it('should format gigabytes', () => {
    expect(pipe.transform(1024 * 1024 * 1024)).toBe('1 GB');
    expect(pipe.transform(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
  });

  it('should round to 2 decimal places', () => {
    expect(pipe.transform(1234)).toBe('1.21 KB');
    expect(pipe.transform(1234567)).toBe('1.18 MB');
  });
});
