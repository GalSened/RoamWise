/**
 * External Navigation Utility
 *
 * Opens external navigation apps (Waze, Google Maps, Apple Maps)
 * for turn-by-turn directions to a destination.
 *
 * Priority: Waze (if installed) > Platform default maps
 */

import { Linking, Platform, Alert } from 'react-native';

export interface NavigationTarget {
  lat: number;
  lng: number;
  label?: string;
}

/**
 * Check if Waze app is installed
 */
async function isWazeInstalled(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('waze://');
  } catch {
    return false;
  }
}

/**
 * Check if Google Maps app is installed (Android/iOS)
 */
async function isGoogleMapsInstalled(): Promise<boolean> {
  try {
    const scheme = Platform.OS === 'ios' ? 'comgooglemaps://' : 'google.navigation:q=0,0';
    return await Linking.canOpenURL(scheme);
  } catch {
    return false;
  }
}

/**
 * Open Waze with navigation to destination
 */
async function openWaze(target: NavigationTarget): Promise<boolean> {
  const { lat, lng, label } = target;
  const url = label
    ? `waze://?ll=${lat},${lng}&navigate=yes&q=${encodeURIComponent(label)}`
    : `waze://?ll=${lat},${lng}&navigate=yes`;

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open Google Maps with navigation to destination
 */
async function openGoogleMaps(target: NavigationTarget): Promise<boolean> {
  const { lat, lng, label } = target;

  let url: string;
  if (Platform.OS === 'ios') {
    url = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    if (label) {
      url += `&destination_place_id=${encodeURIComponent(label)}`;
    }
  } else {
    // Android - direct navigation intent
    url = `google.navigation:q=${lat},${lng}`;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    // Fall through to web fallback
  }

  // Fallback to web Google Maps
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  try {
    await Linking.openURL(webUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open Apple Maps with navigation to destination (iOS only)
 */
async function openAppleMaps(target: NavigationTarget): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  const { lat, lng, label } = target;
  let url = `maps://?daddr=${lat},${lng}&dirflg=d`;
  if (label) {
    url += `&q=${encodeURIComponent(label)}`;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open navigation to destination
 *
 * Priority:
 * 1. Waze (if installed) - best real-time traffic
 * 2. Google Maps (if installed)
 * 3. Apple Maps (iOS) / Google Maps web (Android)
 *
 * @param lat - Destination latitude
 * @param lng - Destination longitude
 * @param label - Optional label for the destination
 * @returns true if navigation app was opened
 *
 * @example
 * // Navigate to Ein Gedi
 * await openNavigation(31.4601, 35.3878, 'Ein Gedi Nature Reserve');
 */
export async function openNavigation(
  lat: number,
  lng: number,
  label?: string
): Promise<boolean> {
  const target: NavigationTarget = { lat, lng, label };

  // Try Waze first (best traffic data)
  const wazeInstalled = await isWazeInstalled();
  if (wazeInstalled) {
    const opened = await openWaze(target);
    if (opened) return true;
  }

  // Try Google Maps
  const gmapsInstalled = await isGoogleMapsInstalled();
  if (gmapsInstalled) {
    const opened = await openGoogleMaps(target);
    if (opened) return true;
  }

  // iOS: Apple Maps, Android: Google Maps web
  if (Platform.OS === 'ios') {
    return openAppleMaps(target);
  } else {
    return openGoogleMaps(target); // Falls back to web
  }
}

/**
 * Open navigation with app selection dialog
 * Lets user choose their preferred navigation app
 */
export async function openNavigationWithChoice(
  lat: number,
  lng: number,
  label?: string
): Promise<void> {
  const target: NavigationTarget = { lat, lng, label };
  const options: { name: string; action: () => Promise<boolean> }[] = [];

  // Build available options
  if (await isWazeInstalled()) {
    options.push({ name: 'Waze', action: () => openWaze(target) });
  }
  if (await isGoogleMapsInstalled()) {
    options.push({ name: 'Google Maps', action: () => openGoogleMaps(target) });
  }
  if (Platform.OS === 'ios') {
    options.push({ name: 'Apple Maps', action: () => openAppleMaps(target) });
  }

  if (options.length === 0) {
    // No apps available, use web fallback
    await openGoogleMaps(target);
    return;
  }

  if (options.length === 1) {
    // Only one option, use it directly
    await options[0].action();
    return;
  }

  // Show selection dialog
  Alert.alert(
    'Open Navigation',
    'Choose navigation app:',
    [
      ...options.map((opt) => ({
        text: opt.name,
        onPress: () => opt.action(),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ],
    { cancelable: true }
  );
}

/**
 * Get a shareable maps URL for the destination
 * Useful for copying/sharing location
 */
export function getMapsUrl(lat: number, lng: number, label?: string): string {
  const base = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return label ? `${base}&query_place_id=${encodeURIComponent(label)}` : base;
}

export default {
  openNavigation,
  openNavigationWithChoice,
  getMapsUrl,
};
