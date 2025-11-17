import * as Prism from 'prismjs';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-typescript';

export class SyntaxHighlightingUtils {
  static getLanguageFromPath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        return 'javascript';
      case 'css':
      case 'scss':
      case 'sass':
        return 'css';
      case 'json':
        return 'json';
      case 'html':
      case 'htm':
        return 'html';
      default:
        return 'javascript';
    }
  }

  static highlightCode(code: string, language: string): string {
    try {
      const grammar =
        Prism.languages[language] || Prism.languages['javascript'];
      return Prism.highlight(code, grammar, language);
    } catch (error) {
      return code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }

  static applyBasicHighlighting(code: string): string {
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    try {
      const grammar = Prism.languages['javascript'];
      highlighted = Prism.highlight(highlighted, grammar, 'javascript');
    } catch (error) {
      // If highlighting fails, return escaped code
    }

    return highlighted;
  }
}
