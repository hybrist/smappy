import {
  inputBinding,
  provideZonelessChangeDetection,
  resource,
  signal,
} from '@angular/core';
import { ComponentFixture, flush, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BundleAnalysis } from '../../models/bundle.models';
import { BundleService } from '../../services/bundle.service';
import {
  SourceFileItem,
  SourceFileListComponent,
} from './source-file-list.component';

describe('SourceFileListComponent', () => {
  let component: SourceFileListComponent;
  let fixture: ComponentFixture<SourceFileListComponent>;
  let mockFiles = signal<SourceFileItem[]>([]);
  let bundleServiceSpy: jasmine.SpyObj<BundleService>;

  beforeEach(() => {
    const mockBundleData: BundleAnalysis = {
      bundleId: 'test-bundle-id',
      totalSize: 1000,
      chunks: [],
      sourceBreakdown: new Map(),
      mappingImpacts: new Map(),
    };

    const mockBundle = resource({
      loader: () => Promise.resolve(mockBundleData),
    });

    bundleServiceSpy = jasmine.createSpyObj('BundleService', []);

    TestBed.configureTestingModule({
      imports: [SourceFileListComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: BundleService, useValue: bundleServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { bundle: mockBundle } },
            parent: null,
          },
        },
      ],
    });

    fixture = TestBed.createComponent(SourceFileListComponent, {
      bindings: [inputBinding('files', mockFiles)],
    });
    component = fixture.componentInstance;
    tick();
    flush();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display file list with basic information', () => {
    mockFiles.set([
      { path: 'src/app/component.ts', size: 500, displayName: 'component.ts' },
      { path: 'src/utils/helper.js', size: 300, displayName: 'helper.js' },
    ]);

    fixture.detectChanges();

    const fileElements = fixture.nativeElement.querySelectorAll(
      '.hover\\:bg-gray-50',
    );
    expect(fileElements.length).toBe(2);
  });

  it('should display badges when provided', () => {
    mockFiles.set([
      {
        path: 'src/test.ts',
        size: 100,
        displayName: 'test.ts',
        badge: 'Content Available',
      },
    ]);

    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.bg-green-100');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('Content Available');
  });

  it('should calculate percentage of total correctly', () => {
    expect(component.getPercentageOfTotal(500)).toBe('50.0');
    expect(component.getPercentageOfTotal(250)).toBe('25.0');
  });

  it('should handle clickable and non-clickable files correctly', () => {
    mockFiles.set([
      { path: 'src/default.ts', size: 100, displayName: 'default.ts' }, // Default is clickable
      {
        path: 'src/non-clickable.ts',
        size: 100,
        displayName: 'non-clickable.ts',
        clickable: false,
      },
    ]);

    fixture.detectChanges();

    const allFileElements = fixture.nativeElement.querySelectorAll(
      '.hover\\:bg-gray-50',
    );
    expect(allFileElements.length).toBe(2); // Both files are displayed

    // Check that we have the correct structure for both files
    const fileNames = fixture.nativeElement.querySelectorAll(
      '.text-sm.font-medium.text-gray-900.truncate',
    );
    expect(fileNames.length).toBe(2);
  });
});
