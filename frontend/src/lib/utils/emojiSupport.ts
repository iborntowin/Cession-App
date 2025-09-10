import { browser } from '$app/environment';

/**
 * Utility for detecting emoji support and providing fallbacks
 * Addresses Windows emoji display issues by providing CSS-based alternatives
 */

export class EmojiSupport {
  private static instance: EmojiSupport;
  private emojiSupport: boolean | null = null;
  private testEmoji = '🟢'; // Green dot emoji used in the app

  private constructor() {}

  static getInstance(): EmojiSupport {
    if (!EmojiSupport.instance) {
      EmojiSupport.instance = new EmojiSupport();
    }
    return EmojiSupport.instance;
  }

  /**
   * Detects if the current browser/OS supports emoji rendering
   * Uses multiple detection methods for reliability
   */
  private detectEmojiSupport(): boolean {
    if (typeof window === 'undefined') return true;

    try {
      // Method 1: Canvas rendering test
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      ctx.textBaseline = 'top';
      ctx.font = '32px Arial';
      ctx.fillText(this.testEmoji, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Check if the emoji rendered as more than just a solid color
      let hasVariation = false;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== data[i + 4] || data[i + 1] !== data[i + 5] || data[i + 2] !== data[i + 6]) {
          hasVariation = true;
          break;
        }
      }

      if (!hasVariation) return false;

      // Method 2: Font support test
      const testString = '🟢💚';
      const testDiv = document.createElement('div');
      testDiv.style.fontSize = '32px';
      testDiv.style.position = 'absolute';
      testDiv.style.left = '-9999px';
      testDiv.textContent = testString;
      document.body.appendChild(testDiv);

      const width = testDiv.offsetWidth;
      const height = testDiv.offsetHeight;
      document.body.removeChild(testDiv);

      // If dimensions are too small, emoji likely didn't render
      if (width < 20 || height < 20) return false;

      // Method 3: Windows-specific detection
      const userAgent = navigator.userAgent.toLowerCase();
      const isWindows = userAgent.includes('windows');

      if (isWindows) {
        // Windows versions before Windows 10 have poor emoji support
        const windowsVersion = this.getWindowsVersion();
        if (windowsVersion && windowsVersion < 10) {
          return false;
        }

        // Even on Windows 10/11, some older builds have issues
        const isOldWindows10 = this.isOldWindows10Build();
        if (isOldWindows10) return false;
      }

      return true;
    } catch (error) {
      console.warn('Emoji support detection failed:', error);
      return false;
    }
  }

  private getWindowsVersion(): number | null {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/Windows NT (\d+\.\d+)/);
    return match ? parseFloat(match[1]) : null;
  }

  private isOldWindows10Build(): boolean {
    // Windows 10 builds before 16299 have poor emoji support
    try {
      const userAgent = navigator.userAgent;
      const buildMatch = userAgent.match(/Windows NT 10\.0; Win64; x64.*Build (\d+)/);
      if (buildMatch) {
        const build = parseInt(buildMatch[1]);
        return build < 16299;
      }
    } catch (error) {
      // Ignore errors in version detection
    }
    return false;
  }

  /**
   * Checks if emoji are supported on the current platform
   */
  public isEmojiSupported(): boolean {
    if (this.emojiSupport === null) {
      this.emojiSupport = this.detectEmojiSupport();
    }
    return this.emojiSupport;
  }

  /**
   * Returns the appropriate status indicator based on platform support
   */
  public getStatusIndicator(isActive: boolean): string {
    if (isActive) {
      return this.isEmojiSupported() ? '🟢' : '●';
    }
    return '⚪';
  }

  /**
   * Returns CSS class for status indicator styling
   */
  public getStatusIndicatorClass(isActive: boolean): string {
    return isActive ? 'status-indicator active' : 'status-indicator inactive';
  }

  /**
   * Forces a re-detection of emoji support (useful for testing)
   */
  public refreshSupport(): void {
    this.emojiSupport = null;
  }
}

// Export singleton instance
export const emojiSupport = EmojiSupport.getInstance();
