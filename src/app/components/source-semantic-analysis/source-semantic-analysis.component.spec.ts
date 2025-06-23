import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SourceSemanticAnalysisComponent } from './source-semantic-analysis.component';
import { SourceAnalysisService } from '../../services/source-analysis.service';
import { BundleService } from '../../services/bundle.service';
import {
  SourceAnalysisResult,
  SourceFragment,
} from '../../models/source-analysis.models';

describe('SourceSemanticAnalysisComponent', () => {
  let component: SourceSemanticAnalysisComponent;
  let fixture: any;
  let sourceAnalysisServiceSpy: jasmine.SpyObj<SourceAnalysisService>;
  let bundleServiceSpy: jasmine.SpyObj<BundleService>;

  beforeEach(() => {
    const sourceAnalysisSpy = jasmine.createSpyObj('SourceAnalysisService', [
      'analyzeSourceFile',
    ]);
    const bundleSpy = jasmine.createSpyObj('BundleService', [
      'getSourceContent',
      'getMappingImpacts',
      'getGeneratedLocations',
    ]);

    TestBed.configureTestingModule({
      imports: [SourceSemanticAnalysisComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: SourceAnalysisService, useValue: sourceAnalysisSpy },
        { provide: BundleService, useValue: bundleSpy },
      ],
    });

    fixture = TestBed.createComponent(SourceSemanticAnalysisComponent);
    component = fixture.componentInstance;
    sourceAnalysisServiceSpy = TestBed.inject(
      SourceAnalysisService,
    ) as jasmine.SpyObj<SourceAnalysisService>;
    bundleServiceSpy = TestBed.inject(
      BundleService,
    ) as jasmine.SpyObj<BundleService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle fragment expansion toggle', () => {
    const fragmentId = 'test-fragment-1';

    expect(component.isFragmentExpanded(fragmentId)).toBe(false);

    component.toggleFragment(fragmentId);
    expect(component.isFragmentExpanded(fragmentId)).toBe(true);

    component.toggleFragment(fragmentId);
    expect(component.isFragmentExpanded(fragmentId)).toBe(false);
  });

  it('should get fragment code with syntax highlighting', () => {
    const mockFragment: SourceFragment = {
      id: 'test-1',
      name: 'testFunction',
      type: 'function',
      startLine: 5,
      endLine: 7,
      startColumn: 0,
      endColumn: 10,
      sourceSize: 100,
      isIncludedInBundle: true,
      bundleSize: 50,
    };

    const mockSourceContent = `line 1
line 2
line 3
line 4
function testFunction() {
  return 'hello';
}
line 8`;

    bundleServiceSpy.getSourceContent.and.returnValue(mockSourceContent);
    bundleServiceSpy.getMappingImpacts.and.returnValue([]);
    bundleServiceSpy.getGeneratedLocations.and.returnValue([]);
    component.path = 'test.ts';

    const result = component.getFragmentCode(mockFragment);

    // Should contain the actual code content (tokens may be wrapped in spans)
    expect(result).toContain('function');
    expect(result).toContain('testFunction');
    expect(result).toContain('return');
    expect(result).toContain('hello');
    expect(result).toContain('5'); // Line number
    expect(bundleServiceSpy.getSourceContent).toHaveBeenCalledWith('test.ts');
  });

  it('should handle missing source content', () => {
    const mockFragment: SourceFragment = {
      id: 'test-1',
      name: 'testFunction',
      type: 'function',
      startLine: 1,
      endLine: 3,
      startColumn: 0,
      endColumn: 10,
      sourceSize: 100,
      isIncludedInBundle: true,
    };

    bundleServiceSpy.getSourceContent.and.returnValue(null);
    bundleServiceSpy.getMappingImpacts.and.returnValue([]);
    bundleServiceSpy.getGeneratedLocations.and.returnValue([]);
    component.path = 'test.ts';

    const result = component.getFragmentCode(mockFragment);

    expect(result).toContain('Source content not available');
  });

  it('should filter fragments correctly', () => {
    const mockAnalysis: SourceAnalysisResult = {
      filePath: 'test.ts',
      totalFragments: 3,
      includedFragments: 2,
      totalSourceSize: 1000,
      totalBundleSize: 500,
      fragments: [
        {
          id: '1',
          name: 'MyClass',
          type: 'class',
          startLine: 1,
          endLine: 5,
          startColumn: 0,
          endColumn: 1,
          sourceSize: 200,
          isIncludedInBundle: true,
        },
        {
          id: '2',
          name: 'myFunc',
          type: 'function',
          startLine: 6,
          endLine: 8,
          startColumn: 0,
          endColumn: 1,
          sourceSize: 150,
          isIncludedInBundle: true,
        },
        {
          id: '3',
          name: 'myVar',
          type: 'variable',
          startLine: 9,
          endLine: 9,
          startColumn: 0,
          endColumn: 1,
          sourceSize: 50,
          isIncludedInBundle: false,
        },
      ],
      imports: [],
      exports: [],
      classes: [
        {
          id: '1',
          name: 'MyClass',
          type: 'class',
          startLine: 1,
          endLine: 5,
          startColumn: 0,
          endColumn: 1,
          sourceSize: 200,
          isIncludedInBundle: true,
        },
      ],
      methods: [],
      functions: [
        {
          id: '2',
          name: 'myFunc',
          type: 'function',
          startLine: 6,
          endLine: 8,
          startColumn: 0,
          endColumn: 1,
          sourceSize: 150,
          isIncludedInBundle: true,
        },
      ],
      variables: [
        {
          id: '3',
          name: 'myVar',
          type: 'variable',
          startLine: 9,
          endLine: 9,
          startColumn: 0,
          endColumn: 1,
          sourceSize: 50,
          isIncludedInBundle: false,
        },
      ],
      types: [],
      unusedFragments: [
        {
          id: '3',
          name: 'myVar',
          type: 'variable',
          startLine: 9,
          endLine: 9,
          startColumn: 0,
          endColumn: 1,
          sourceSize: 50,
          isIncludedInBundle: false,
        },
      ],
    };

    sourceAnalysisServiceSpy.analyzeSourceFile.and.returnValue(mockAnalysis);
    component.path = 'test.ts';
    fixture.detectChanges();

    // Test "all" filter
    component.setActiveFilter('all');
    fixture.detectChanges();
    expect(component.filteredFragments().length).toBe(3);

    // Test "class" filter
    component.setActiveFilter('class');
    fixture.detectChanges();
    expect(component.filteredFragments().length).toBe(1);
    expect(component.filteredFragments()[0].type).toBe('class');

    // Test "function" filter
    component.setActiveFilter('function');
    fixture.detectChanges();
    expect(component.filteredFragments().length).toBe(1);
    expect(component.filteredFragments()[0].type).toBe('function');
  });

  it('should format sizes correctly', () => {
    expect(component.formatSize(0)).toBe('0 B');
    expect(component.formatSize(1024)).toBe('1 KB');
    expect(component.formatSize(1536)).toBe('1.5 KB');
    expect(component.formatSize(1048576)).toBe('1 MB');
  });

  it('should apply line-level bundle impact colors', () => {
    const mockFragment: SourceFragment = {
      id: 'test-1',
      name: 'testFunction',
      type: 'function',
      startLine: 5,
      endLine: 7,
      startColumn: 0,
      endColumn: 10,
      sourceSize: 100,
      isIncludedInBundle: true,
      bundleSize: 50,
    };

    const mockSourceContent = `line 1
line 2
line 3
line 4
function testFunction() {
  return 'hello';
}
line 8`;

    const mockMappingImpacts = [
      { chunkId: 'chunk1', originalLine: 5, originalColumn: 0, sizeImpact: 25 },
      { chunkId: 'chunk1', originalLine: 6, originalColumn: 2, sizeImpact: 15 },
    ];

    bundleServiceSpy.getSourceContent.and.returnValue(mockSourceContent);
    bundleServiceSpy.getMappingImpacts.and.returnValue(mockMappingImpacts);
    bundleServiceSpy.getGeneratedLocations.and.returnValue([]);
    component.path = 'test.ts';

    const result = component.getFragmentCode(mockFragment);

    // Should contain line numbers with bundle impact styling
    expect(result).toContain('5'); // Line number
    expect(result).toContain('6'); // Line number
    expect(result).toContain('bg-green-100'); // Medium impact color for line 5 (25 bytes)
    expect(result).toContain('title="Line 5: 25 bytes in bundle"'); // Tooltip
    expect(bundleServiceSpy.getMappingImpacts).toHaveBeenCalledWith('test.ts');
  });

  it('should show hover tooltips with generated code mappings', () => {
    const mockGeneratedLocations = [
      {
        chunkId: 'chunk1',
        generatedLine: 10,
        generatedColumn: 5,
        sizeImpact: 25,
        snippet: 'console.log("test");',
      },
    ];

    bundleServiceSpy.getGeneratedLocations.and.returnValue(
      mockGeneratedLocations,
    );
    component.path = 'test.ts';

    // Test the hover functionality indirectly by calling the method
    const mappingInfo = (component as any).getGeneratedMappingInfo(5, 0);

    expect(mappingInfo).toBeTruthy();
    expect(mappingInfo.originalLine).toBe(5);
    expect(mappingInfo.generatedLocations.length).toBe(1);
    expect(mappingInfo.generatedLocations[0].chunkId).toBe('chunk1');
    expect(mappingInfo.generatedLocations[0].sizeImpact).toBe(25);
    expect(bundleServiceSpy.getGeneratedLocations).toHaveBeenCalledWith(
      'test.ts',
      5,
      0,
    );
  });
});
