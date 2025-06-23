import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { SourceFileListComponent, SourceFileItem } from './source-file-list.component';
import { BundleService } from '../../services/bundle.service';

describe('SourceFileListComponent', () => {
  let component: SourceFileListComponent;
  let fixture: any;
  let bundleServiceSpy: jasmine.SpyObj<BundleService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('BundleService', ['bundle']);

    TestBed.configureTestingModule({
      imports: [SourceFileListComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: BundleService, useValue: spy },
      ],
    });

    fixture = TestBed.createComponent(SourceFileListComponent);
    component = fixture.componentInstance;
    bundleServiceSpy = TestBed.inject(BundleService) as jasmine.SpyObj<BundleService>;

    // Mock bundle data
    bundleServiceSpy.bundle.and.returnValue({
      totalSize: 1000,
      chunks: [],
      sourceBreakdown: new Map(),
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display file list with basic information', () => {
    const mockFiles: SourceFileItem[] = [
      { path: 'src/app/component.ts', size: 500 },
      { path: 'src/utils/helper.js', size: 300 },
    ];

    component.files = mockFiles;
    fixture.detectChanges();

    const fileElements = fixture.nativeElement.querySelectorAll('.hover\\:bg-gray-50');
    expect(fileElements.length).toBe(2);
  });

  it('should display badges when provided', () => {
    const mockFiles: SourceFileItem[] = [
      { path: 'src/test.ts', size: 100, badge: 'Content Available' },
    ];

    component.files = mockFiles;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.bg-green-100');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('Content Available');
  });

  it('should format file sizes correctly', () => {
    expect(component.formatSize(0)).toBe('0 B');
    expect(component.formatSize(1024)).toBe('1 KB');
    expect(component.formatSize(1536)).toBe('1.5 KB');
    expect(component.formatSize(1048576)).toBe('1 MB');
  });

  it('should extract file names correctly', () => {
    expect(component.getFileName('src/app/component.ts')).toBe('component.ts');
    expect(component.getFileName('file.js')).toBe('file.js');
    expect(component.getFileName('')).toBe('');
  });

  it('should calculate percentage of total correctly', () => {
    expect(component.getPercentageOfTotal(500)).toBe('50.0');
    expect(component.getPercentageOfTotal(250)).toBe('25.0');
  });

  it('should handle clickable and non-clickable files correctly', () => {
    const mockFiles: SourceFileItem[] = [
      { path: 'src/default.ts', size: 100 }, // Default is clickable
      { path: 'src/non-clickable.ts', size: 100, clickable: false },
    ];

    component.files = mockFiles;
    fixture.detectChanges();

    const allFileElements = fixture.nativeElement.querySelectorAll('.hover\\:bg-gray-50');
    expect(allFileElements.length).toBe(2); // Both files are displayed
    
    // Check that we have the correct structure for both files
    const fileNames = fixture.nativeElement.querySelectorAll('.text-sm.font-medium.text-gray-900.truncate');
    expect(fileNames.length).toBe(2);
  });
});