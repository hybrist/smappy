export interface GeneratedLocation {
  chunkId: string;
  line: number;
  column: number;
  sizeImpact: number;
  highlightedCode: string;
}

export interface HoveredMappingInfo {
  originalLine: number;
  originalColumn: number;
  generatedLocations: GeneratedLocation[];
}

export interface TooltipPosition {
  x: number;
  y: number;
}
