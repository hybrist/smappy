import { FragmentType } from '../models/source-analysis.models';

export class FragmentIconUtils {
  static getIconClass(type: FragmentType, inBundle: boolean): string {
    if (!inBundle) {
      return 'bg-gray-100 text-gray-600';
    }

    const iconClasses: Record<FragmentType, string> = {
      class: 'bg-purple-100 text-purple-600',
      function: 'bg-blue-100 text-blue-600',
      method: 'bg-blue-100 text-blue-600',
      variable: 'bg-green-100 text-green-600',
      import: 'bg-yellow-100 text-yellow-600',
      export: 'bg-orange-100 text-orange-600',
      interface: 'bg-indigo-100 text-indigo-600',
      type: 'bg-indigo-100 text-indigo-600',
      enum: 'bg-pink-100 text-pink-600',
      namespace: 'bg-teal-100 text-teal-600',
      unknown: 'bg-teal-100 text-teal-600',
    };
    return iconClasses[type] || iconClasses.unknown;
  }

  static getIconPath(type: FragmentType): string {
    const iconPaths: Record<FragmentType, string> = {
      class:
        'M7 8a3 3 0 000 6h6a3 3 0 000-6H7zM4.5 12a4.5 4.5 0 019 0 4.5 4.5 0 01-9 0z',
      function: 'M4 6h16M4 12h16M4 18h16',
      method: 'M4 6h16M4 12h16M4 18h16',
      variable: 'M5 12h14M12 5l7 7-7 7',
      import: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
      export: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4 4m0 0l-4 4m4-4H7',
      interface:
        'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      type: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      enum: 'M4 6h16M4 10h16M4 14h16M4 18h16',
      namespace: 'M19 11H5m14-4H5m14 8H5',
      unknown:
        'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    return iconPaths[type] || iconPaths.unknown;
  }

  static getTypeLabel(type: FragmentType): string {
    const labels: Record<FragmentType, string> = {
      class: 'Class',
      function: 'Function',
      method: 'Method',
      variable: 'Variable',
      import: 'Import',
      export: 'Export',
      interface: 'Interface',
      type: 'Type Alias',
      enum: 'Enum',
      namespace: 'Namespace',
      unknown: 'Unknown',
    };
    return labels[type] || 'Unknown';
  }
}
