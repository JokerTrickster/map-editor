/**
 * Parking Status Indicator Component
 * Displays real-time occupancy status for parking locations
 *
 * Note: This component currently returns null because parking status
 * is shown via color changes on the parking space elements themselves
 * (handled in StatusOverlay.tsx). This component is kept for potential
 * future use if overlay indicators are needed.
 */

interface ParkingStatusIndicatorProps {
  /** Object ID of the parking location */
  objectId: string;
}

/**
 * Parking Status Indicator
 * Currently disabled - status shown via element color changes only
 */
export function ParkingStatusIndicator({ objectId }: ParkingStatusIndicatorProps) {
  // Parking status is displayed via color changes on the parking space elements
  // No overlay indicator is needed
  void objectId; // Suppress unused parameter warning
  return null;
}
