import { Dimensions, PixelRatio } from 'react-native';

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive width and height based on screen percentage
export const wp = (percentage) => {
  const value = (percentage * SCREEN_WIDTH) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

export const hp = (percentage) => {
  const value = (percentage * SCREEN_HEIGHT) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

// Responsive font size
export const rf = (size) => {
  const scale = SCREEN_WIDTH / 375; // Base width (iPhone X)
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Check if device is small (width < 350)
export const isSmallDevice = () => SCREEN_WIDTH < 350;

// Check if device is tablet
export const isTablet = () => SCREEN_WIDTH >= 768;

// Get responsive padding based on screen size
export const getResponsivePadding = () => {
  if (isSmallDevice()) return wp(3);
  if (isTablet()) return wp(4);
  return wp(4);
};

// Get responsive margin based on screen size
export const getResponsiveMargin = () => {
  if (isSmallDevice()) return wp(2);
  if (isTablet()) return wp(3);
  return wp(4);
};

// Get responsive border radius
export const getResponsiveBorderRadius = () => {
  if (isSmallDevice()) return wp(2);
  return wp(3);
};

// Get safe area bottom padding for Android navigation
export const getAndroidNavHeight = () => {
  // Android devices typically need extra space for gesture navigation
  return hp(2.5);
};

// Check if device likely has gesture navigation (Android 10+)
export const hasGestureNavigation = () => {
  // This is a heuristic - in a real app you might use a native module
  return SCREEN_HEIGHT > 700; // Taller devices more likely to have gesture nav
};

export const RESPONSIVE_STYLES = {
  // Container styles
  container: {
    paddingHorizontal: getResponsivePadding(),
  },
  
  // Card styles
  card: {
    marginHorizontal: getResponsiveMargin(),
    marginVertical: hp(1),
    padding: getResponsivePadding(),
    borderRadius: getResponsiveBorderRadius(),
  },
  
  // Text styles
  title: {
    fontSize: rf(18),
  },
  subtitle: {
    fontSize: rf(16),
  },
  body: {
    fontSize: rf(14),
  },
  caption: {
    fontSize: rf(12),
  },
  
  // Button styles
  button: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: getResponsiveBorderRadius(),
  },
  
  // Input styles
  input: {
    height: hp(6),
    paddingHorizontal: wp(4),
    borderRadius: getResponsiveBorderRadius(),
  },
  
  // Tab bar styles
  tabBar: {
    height: hp(10), // Base height
    androidHeight: hp(12), // Android specific height
    paddingBottom: hp(1.5),
    paddingTop: hp(1.2),
  },
};