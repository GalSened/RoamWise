/**
 * InteractiveMap - Production-ready map component for hiking navigation
 *
 * Two modes:
 * - 'preview': Static view for route planning (PlannerScreen)
 * - 'navigation': Follow mode with real-time user tracking (LiveScreen)
 *
 * Features:
 * - Auto-center on user location in navigation mode
 * - Pan detection with re-center FAB
 * - Trail polyline visualization
 * - Pulsing user marker with accuracy circle
 * - Offline tile caching via fitToCoordinates
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import MapView, {
  Polyline,
  Marker,
  Circle,
  Region,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows, borderRadius } from '../../theme/tokens';

/**
 * Geographic point interface (matches NavigationManager)
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Map marker types for different waypoint purposes
 */
export interface MapMarker {
  id: string;
  coordinate: GeoPoint;
  type: 'start' | 'end' | 'water' | 'danger' | 'waypoint';
  title?: string;
}

/**
 * InteractiveMap component props
 */
export interface InteractiveMapProps {
  /** Map behavior mode */
  mode: 'preview' | 'navigation';

  /** Trail coordinates to render as polyline */
  routePolyline: GeoPoint[];

  /** Current user position (null if not tracking) */
  userLocation: GeoPoint | null;

  /** GPS accuracy in meters (for accuracy circle) */
  accuracy?: number | null;

  /** Waypoint markers to display */
  markers?: MapMarker[];

  /** Callback when map is ready */
  onMapReady?: () => void;

  /** Callback when user pans the map */
  onUserPan?: () => void;
}

/**
 * Default region (Ein Gedi, Israel - matches sample trail)
 */
const DEFAULT_REGION: Region = {
  latitude: 31.4675,
  longitude: 35.387,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

/**
 * Marker configuration by type
 */
const MARKER_CONFIG: Record<
  MapMarker['type'],
  { icon: keyof typeof Ionicons.glyphMap; color: string; size: number }
> = {
  start: { icon: 'flag', color: colors.success, size: 32 },
  end: { icon: 'flag-outline', color: colors.primary, size: 32 },
  water: { icon: 'water', color: colors.info, size: 24 },
  danger: { icon: 'warning', color: colors.danger, size: 28 },
  waypoint: { icon: 'location', color: colors.secondary, size: 20 },
};

/**
 * InteractiveMap Component
 */
export function InteractiveMap({
  mode,
  routePolyline,
  userLocation,
  accuracy,
  markers = [],
  onMapReady,
  onUserPan,
}: InteractiveMapProps) {
  // Refs
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // State
  const [isFollowing, setIsFollowing] = useState(mode === 'navigation');
  const [showRecenter, setShowRecenter] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Pulsing animation for user marker
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'navigation' && userLocation) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [mode, userLocation, pulseAnim]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-follow user location in navigation mode
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isFollowing && userLocation && mapRef.current && isMapReady) {
      mapRef.current.animateToRegion(
        {
          ...userLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  }, [userLocation, isFollowing, isMapReady]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fit to route in preview mode (offline tile caching hack)
  // ─────────────────────────────────────────────────────────────────────────────
  const fitToRoute = useCallback(() => {
    if (mapRef.current && routePolyline.length > 0) {
      mapRef.current.fitToCoordinates(routePolyline, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [routePolyline]);

  useEffect(() => {
    if (mode === 'preview' && routePolyline.length > 0 && isMapReady) {
      // Delay to ensure map is fully initialized
      const timer = setTimeout(fitToRoute, 500);
      return () => clearTimeout(timer);
    }
  }, [mode, routePolyline, isMapReady, fitToRoute]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handle pan gesture (stop following)
  // ─────────────────────────────────────────────────────────────────────────────
  const handlePanDrag = useCallback(() => {
    if (mode === 'navigation' && isFollowing) {
      setIsFollowing(false);
      setShowRecenter(true);
      onUserPan?.();
    }
  }, [mode, isFollowing, onUserPan]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Re-center button handler
  // ─────────────────────────────────────────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    setIsFollowing(true);
    setShowRecenter(false);
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...userLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        300
      );
    }
  }, [userLocation]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Map ready handler
  // ─────────────────────────────────────────────────────────────────────────────
  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
    onMapReady?.();
  }, [onMapReady]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Calculate initial region
  // ─────────────────────────────────────────────────────────────────────────────
  const getInitialRegion = (): Region => {
    if (userLocation && mode === 'navigation') {
      return {
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    if (routePolyline.length > 0) {
      // Center on first point of route
      return {
        ...routePolyline[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return DEFAULT_REGION;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render custom marker
  // ─────────────────────────────────────────────────────────────────────────────
  const renderMarker = (marker: MapMarker) => {
    const config = MARKER_CONFIG[marker.type];
    return (
      <Marker
        key={marker.id}
        coordinate={marker.coordinate}
        title={marker.title}
        anchor={{ x: 0.5, y: 1 }}
      >
        <View style={styles.markerContainer}>
          <View
            style={[styles.markerIcon, { backgroundColor: config.color }]}
          >
            <Ionicons
              name={config.icon}
              size={config.size * 0.6}
              color="#FFFFFF"
            />
          </View>
          <View style={[styles.markerPin, { backgroundColor: config.color }]} />
        </View>
      </Marker>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render user location marker
  // ─────────────────────────────────────────────────────────────────────────────
  const renderUserMarker = () => {
    if (!userLocation || mode === 'preview') return null;

    return (
      <>
        {/* Accuracy circle */}
        {accuracy && accuracy > 0 && (
          <Circle
            center={userLocation}
            radius={accuracy}
            strokeColor={`${colors.primary}40`}
            fillColor={`${colors.primary}20`}
            strokeWidth={1}
          />
        )}

        {/* User marker with pulsing animation */}
        <Marker
          coordinate={userLocation}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.userMarkerContainer}>
            {/* Pulsing ring */}
            <Animated.View
              style={[
                styles.userMarkerPulse,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.5],
                    outputRange: [0.4, 0],
                  }),
                },
              ]}
            />
            {/* User dot */}
            <View style={styles.userMarkerDot}>
              <View style={styles.userMarkerDotInner} />
            </View>
          </View>
        </Marker>
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={getInitialRegion()}
        showsUserLocation={false} // We render custom marker
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={mode === 'navigation'}
        onMapReady={handleMapReady}
        onPanDrag={handlePanDrag}
        rotateEnabled={mode === 'navigation'}
        pitchEnabled={false}
      >
        {/* Trail polyline */}
        {routePolyline.length > 1 && (
          <Polyline
            coordinates={routePolyline}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Waypoint markers */}
        {markers.map(renderMarker)}

        {/* User location marker */}
        {renderUserMarker()}
      </MapView>

      {/* Re-center FAB (only in navigation mode when panned) */}
      {mode === 'navigation' && showRecenter && (
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={24} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Marker styles
  markerContainer: {
    alignItems: 'center',
  },
  markerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  markerPin: {
    width: 4,
    height: 10,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: -2,
  },

  // User marker styles
  userMarkerContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  userMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  userMarkerDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  // Re-center button
  recenterButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
});

export default InteractiveMap;
