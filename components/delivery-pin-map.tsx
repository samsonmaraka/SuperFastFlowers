'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type SelectedCoords = { lat: number; lng: number };

const DEFAULT_CENTER: SelectedCoords = { lat: 0.3136, lng: 32.5811 };
const MAP_ELEMENT_ID = 'delivery-pin-google-map';

function buildGoogleMapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

type GoogleMaps = {
  maps: {
    Map: new (element: Element, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: { position: SelectedCoords; map: GoogleMapInstance }) => GoogleMarkerInstance;
  };
};

type GoogleMapMouseEvent = {
  latLng?: { lat: () => number; lng: () => number };
};

type GoogleMapsListener = { remove: () => void };

type GoogleMapInstance = {
  addListener: (event: 'click', handler: (event: GoogleMapMouseEvent) => void) => GoogleMapsListener;
};

type GoogleMarkerInstance = {
  setPosition: (position: SelectedCoords) => void;
  setMap: (map: GoogleMapInstance | null) => void;
};

declare global {
  interface Window {
    google?: GoogleMaps;
  }
}

function loadGoogleMapsScript(apiKey: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', '1');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load Google Maps.')), { once: true });
    document.body.appendChild(script);
  });
}

export function DeliveryPinMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);

  const [selectedCoords, setSelectedCoords] = useState<SelectedCoords | null>(null);
  const [deliveryPinUrl, setDeliveryPinUrl] = useState('');
  const [mapUnavailable, setMapUnavailable] = useState(!apiKey);

  const helperText = useMemo(() => {
    if (mapUnavailable) {
      return 'Google Maps API key is not configured. Paste a Google Maps pin link manually.';
    }

    return 'Pan/drag and zoom on the map, then click the exact delivery spot to drop a pin automatically.';
  }, [mapUnavailable]);

  useEffect(() => {
    if (!apiKey) return;

    let clickListener: GoogleMapsListener | null = null;
    let disposed = false;

    const setupMap = async () => {
      try {
        await loadGoogleMapsScript(apiKey);
      } catch {
        if (!disposed) setMapUnavailable(true);
        return;
      }

      if (disposed || !window.google?.maps) return;

      const mapElement = document.getElementById(MAP_ELEMENT_ID);
      if (!mapElement) return;

      const map = new window.google.maps.Map(mapElement, {
        center: DEFAULT_CENTER,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        keyboardShortcuts: false
      });

      const setPin = (lat: number, lng: number) => {
        const roundedLat = Number(lat.toFixed(6));
        const roundedLng = Number(lng.toFixed(6));
        const point = { lat: roundedLat, lng: roundedLng };

        if (!markerRef.current) {
          markerRef.current = new window.google!.maps.Marker({ position: point, map });
        } else {
          markerRef.current.setPosition(point);
        }

        setSelectedCoords(point);
        setDeliveryPinUrl(buildGoogleMapsLink(roundedLat, roundedLng));
      };

      clickListener = map.addListener('click', (event: GoogleMapMouseEvent) => {
        if (!event.latLng) return;
        setPin(event.latLng.lat(), event.latLng.lng());
      });

      mapRef.current = map;
      setMapUnavailable(false);
    };

    void setupMap();

    return () => {
      disposed = true;
      if (clickListener) clickListener.remove();
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey]);

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-800">Delivery pin on map (optional)</span>
      <p className="text-sm text-gray-700">{helperText}</p>
      {!mapUnavailable ? <div id={MAP_ELEMENT_ID} className="h-72 w-full overflow-hidden rounded border" /> : null}
      <input type="hidden" name="deliveryLatitude" value={selectedCoords?.lat ?? ''} />
      <input type="hidden" name="deliveryLongitude" value={selectedCoords?.lng ?? ''} />
      <input
        name="deliveryPinUrl"
        type="url"
        value={deliveryPinUrl}
        onChange={(event) => setDeliveryPinUrl(event.target.value)}
        placeholder="Paste or use auto-filled Google Maps pin link."
        className="w-full rounded border p-2"
      />
      {selectedCoords ? (
        <p className="text-xs text-gray-600">
          Selected pin: {selectedCoords.lat}, {selectedCoords.lng}
        </p>
      ) : (
        <p className="text-xs text-gray-600">No pin selected yet.</p>
      )}
    </label>
  );
}
