export type FragmentType =
  | 'class'
  | 'function'
  | 'method'
  | 'variable'
  | 'import'
  | 'export'
  | 'interface'
  | 'type'
  | 'enum'
  | 'namespace'
  | 'unknown';

export interface SourceFragment {
  id: string;
  name: string;
  type: FragmentType;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  sourceSize: number; // Size in source code
  bundleSize?: number; // Size in the bundle (if included)
  isIncludedInBundle: boolean;
  description?: string;
  signature?: string; // Function/method signature
  accessibility?: 'public' | 'private' | 'protected';
  isStatic?: boolean;
  isAsync?: boolean;
  parameters?: string[];
  returnType?: string;
  dependencies?: string[]; // Other fragments this depends on
}

export interface SourceAnalysisResult {
  filePath: string;
  totalFragments: number;
  includedFragments: number;
  totalSourceSize: number;
  totalBundleSize: number;
  fragments: SourceFragment[];
  imports: SourceFragment[];
  exports: SourceFragment[];
  classes: SourceFragment[];
  methods: SourceFragment[];
  functions: SourceFragment[];
  variables: SourceFragment[];
  types: SourceFragment[];
  unusedFragments: SourceFragment[];
}

export interface FragmentUsage {
  fragment: SourceFragment;
  usageCount: number;
  referencedBy: string[]; // Other fragments that reference this one
  references: string[]; // Other fragments this one references
}
