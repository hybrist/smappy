import { MappingImpact } from '../models/bundle.models';

export class BundleSizeUtils {
  static calculateLineBundleContribution(
    mappingImpacts: MappingImpact[],
  ): Map<number, number> {
    const lineBundleBytes = new Map<number, number>();

    for (const impact of mappingImpacts) {
      const line = impact.originalLine;
      const currentBytes = lineBundleBytes.get(line) || 0;
      lineBundleBytes.set(line, currentBytes + impact.sizeImpact);
    }

    return lineBundleBytes;
  }

  static getLineBackgroundClass(bundleBytes: number): string {
    if (bundleBytes === 0) {
      return 'text-gray-400';
    }

    if (bundleBytes < 10) {
      return 'text-gray-700 bg-green-50 border-l-2 border-green-200';
    } else if (bundleBytes < 50) {
      return 'text-gray-800 bg-green-100 border-l-2 border-green-300';
    } else if (bundleBytes < 100) {
      return 'text-gray-800 bg-yellow-50 border-l-2 border-yellow-300';
    } else if (bundleBytes < 200) {
      return 'text-gray-900 bg-orange-50 border-l-2 border-orange-400';
    } else {
      return 'text-gray-900 bg-red-100 border-l-2 border-red-500 font-semibold';
    }
  }
}
