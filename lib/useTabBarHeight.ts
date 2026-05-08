import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

/**
 * Returns the height of the bottom tab bar including safe area insets.
 * Replaces @react-navigation/bottom-tabs useBottomTabBarHeight to avoid
 * the external dependency.
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  // Standard tab bar height + bottom safe area (notch/home indicator)
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;
  return TAB_BAR_HEIGHT + insets.bottom;
}
