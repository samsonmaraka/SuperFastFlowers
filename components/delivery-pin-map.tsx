'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    L?: any;
  }
}

const DEFAULT_CENTER: [number, number] = [0.3136, 32.5811];

function loadLeafletAssets() {
  if (document.querySelector('link[data-leaflet="1"]')) return;

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  css.setAttribute('data-leaflet', '1');
  document.head.appendChild(css);
}

function loadLeafletScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.L) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-leaflet="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Leaflet.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.setAttribute('data-leaflet', '1');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load Leaflet.')), { once: true });
    document.body.appendChild(script);
  });
}

export function DeliveryPinMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [deliveryPinUrl, setDeliveryPinUrl] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let disposed = false;

    const bootMap = async () => {
      if (!mapRef.current) return;
      loadLeafletAssets();

      try {
        await loadLeafletScript();
      } catch {
        return;
      }

      if (disposed || !mapRef.current || !window.L) return;

      const L = window.L;
      const map = L.map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const setPin = (lat: number, lng: number) => {
        const roundedLat = Number(lat.toFixed(6));
        const roundedLng = Number(lng.toFixed(6));
        if (!markerRef.current) {
          markerRef.current = L.marker([roundedLat, roundedLng]).addTo(map);
        } else {
          markerRef.current.setLatLng([roundedLat, roundedLng]);
        }

        setSelectedCoords({ lat: roundedLat, lng: roundedLng });
        setDeliveryPinUrl(`https://www.google.com/maps?q=${roundedLat},${roundedLng}`);
      };

      map.on('click', (event: any) => {
        setPin(event.latlng.lat, event.latlng.lng);
      });

      mapInstanceRef.current = map;
    };

    bootMap();

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    };
  }, []);

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-800">Delivery pin on map (optional)</span>
      <p className="text-sm text-gray-700">
        Pan/drag and zoom on the map, then click the exact delivery spot to drop a pin automatically.
      </p>
      <div ref={mapRef} className="h-72 w-full overflow-hidden rounded border" />
      <input type="hidden" name="deliveryLatitude" value={selectedCoords?.lat ?? ''} />
      <input type="hidden" name="deliveryLongitude" value={selectedCoords?.lng ?? ''} />
      <input
        name="deliveryPinUrl"
        type="url"
        value={deliveryPinUrl}
        onChange={(event) => setDeliveryPinUrl(event.target.value)}
        placeholder="Pin link will be auto-filled (you can still edit)."
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
