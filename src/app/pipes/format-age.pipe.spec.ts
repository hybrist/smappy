import { FormatAgePipe } from './format-age.pipe';

describe('FormatAgePipe', () => {
  let pipe: FormatAgePipe;

  beforeEach(() => {
    pipe = new FormatAgePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format milliseconds to days', () => {
    const oneDayInMs = 24 * 60 * 60 * 1000;
    expect(pipe.transform(oneDayInMs)).toBe('1d ago');
    expect(pipe.transform(2 * oneDayInMs)).toBe('2d ago');
  });

  it('should format milliseconds to hours', () => {
    const oneHourInMs = 60 * 60 * 1000;
    expect(pipe.transform(oneHourInMs)).toBe('1h ago');
    expect(pipe.transform(2 * oneHourInMs)).toBe('2h ago');
  });

  it('should format milliseconds to minutes', () => {
    const oneMinuteInMs = 60 * 1000;
    expect(pipe.transform(oneMinuteInMs)).toBe('1m ago');
    expect(pipe.transform(2 * oneMinuteInMs)).toBe('2m ago');
  });

  it('should return "just now" for very recent times', () => {
    expect(pipe.transform(30000)).toBe('just now'); // 30 seconds
    expect(pipe.transform(0)).toBe('just now');
  });

  it('should prioritize larger units', () => {
    const oneDayAndOneHourInMs = 25 * 60 * 60 * 1000;
    expect(pipe.transform(oneDayAndOneHourInMs)).toBe('1d ago');
  });
});