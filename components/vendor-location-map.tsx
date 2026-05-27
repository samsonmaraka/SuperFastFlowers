'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Coords = { lat: number; lng: number };

const DEFAULT_CENTER: Coords = { lat: 0.3136, lng: 32.5811 };
const MAP_ELEMENT_ID = 'vendor-location-google-map';

type VendorGoogleMaps = {
  maps: {
    Map: new (element: Element, options: Record<string, unknown>) => VendorGoogleMapInstance;
    Marker: new (options: { position: Coords; map: VendorGoogleMapInstance }) => VendorGoogleMarkerInstance;
  };
};

type VendorGoogleMapMouseEvent = { latLng?: { lat: () => number; lng: () => number } };
type VendorGoogleMapsListener = { remove: () => void };
type VendorGoogleMapInstance = {
  addListener: (event: 'click', handler: (event: VendorGoogleMapMouseEvent) => void) => VendorGoogleMapsListener;
};
type VendorGoogleMarkerInstance = { setPosition: (position: Coords) => void; setMap: (map: VendorGoogleMapInstance | null) => void };

function loadGoogleMapsScript(apiKey: string) {
  return new Promise<void>((resolve, reject) => {
    if ((window as Window & { google?: VendorGoogleMaps }).google?.maps) {
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

export function VendorLocationMap({
  latitude,
  longitude,
  onChange
}: {
  latitude?: number;
  longitude?: number;
  onChange: (coords: { vendorLatitude?: number; vendorLongitude?: number }) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<VendorGoogleMapInstance | null>(null);
  const markerRef = useRef<VendorGoogleMarkerInstance | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(!apiKey);

  const selectedCoords = useMemo<Coords | null>(() => {
    if (latitude === undefined || longitude === undefined) return null;
    return { lat: latitude, lng: longitude };
  }, [latitude, longitude]);

  useEffect(() => {
    if (!apiKey) return;

    let clickListener: VendorGoogleMapsListener | null = null;
    let disposed = false;

    const setupMap = async () => {
      try {
        await loadGoogleMapsScript(apiKey);
      } catch {
        if (!disposed) setMapUnavailable(true);
        return;
      }

      const g = (window as Window & { google?: VendorGoogleMaps }).google;
      if (disposed || !g?.maps) return;

      const mapElement = document.getElementById(MAP_ELEMENT_ID);
      if (!mapElement) return;

      const initialCenter = selectedCoords || DEFAULT_CENTER;
      const map = new g.maps.Map(mapElement, {
        center: initialCenter,
        zoom: selectedCoords ? 15 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        keyboardShortcuts: false
      });

      if (selectedCoords) {
        markerRef.current = new g.maps.Marker({ position: selectedCoords, map });
      }

      clickListener = map.addListener('click', (event: VendorGoogleMapMouseEvent) => {
        if (!event.latLng) return;
        const roundedLat = Number(event.latLng.lat().toFixed(6));
        const roundedLng = Number(event.latLng.lng().toFixed(6));
        const point = { lat: roundedLat, lng: roundedLng };

        if (!markerRef.current) {
          markerRef.current = new g.maps.Marker({ position: point, map });
        } else {
          markerRef.current.setPosition(point);
        }

        onChange({ vendorLatitude: roundedLat, vendorLongitude: roundedLng });
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

  useEffect(() => {
    const g = (window as Window & { google?: VendorGoogleMaps }).google;
    if (!mapRef.current || !g?.maps || !selectedCoords) return;
    if ('setCenter' in mapRef.current && typeof mapRef.current.setCenter === 'function') {
      mapRef.current.setCenter(selectedCoords);
    }
    if (!markerRef.current) {
      markerRef.current = new g.maps.Marker({ position: selectedCoords, map: mapRef.current });
      return;
    }
    markerRef.current.setPosition(selectedCoords);
  }, [selectedCoords]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-700">
        {mapUnavailable
          ? 'Map unavailable (Google Maps key missing or failed to load). Enter coordinates manually below.'
          : 'Click on the map to set vendor location coordinates.'}
      </p>
      {!mapUnavailable ? <div id={MAP_ELEMENT_ID} className="h-72 w-full overflow-hidden rounded border" /> : null}
      <p className="text-xs text-gray-600">
        {selectedCoords ? `Selected coordinates: ${selectedCoords.lat}, ${selectedCoords.lng}` : 'No coordinates selected yet.'}
      </p>
    </div>
  );
}
