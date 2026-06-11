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
    Marker: new (options: { position: SelectedCoords; map: GoogleMapInstance; draggable?: boolean }) => GoogleMarkerInstance;
    importLibrary?: (name: 'places') => Promise<GooglePlacesLibrary>;
    places?: {
      PlaceAutocompleteElement?: GooglePlaceAutocompleteElementConstructor;
    };
  };
};

type GoogleMapMouseEvent = {
  latLng?: { lat: () => number; lng: () => number };
};

type GoogleMapsListener = { remove: () => void };

type GoogleMapInstance = {
  addListener: (event: 'click', handler: (event: GoogleMapMouseEvent) => void) => GoogleMapsListener;
  setCenter: (position: SelectedCoords) => void;
  setZoom: (zoom: number) => void;
};

type GoogleMarkerInstance = {
  addListener: (event: 'dragend', handler: (event: GoogleMapMouseEvent) => void) => GoogleMapsListener;
  setPosition: (position: SelectedCoords) => void;
  setMap: (map: GoogleMapInstance | null) => void;
};

type GoogleLatLng = { lat: () => number; lng: () => number };

type GooglePlace = {
  fetchFields: (request: { fields: string[] }) => Promise<void>;
  location?: GoogleLatLng;
};

type GooglePlacePredictionSelectEvent = Event & {
  placePrediction?: {
    toPlace: () => GooglePlace;
  };
};

type GooglePlaceAutocompleteElement = HTMLElement & {
  placeholder: string;
};

type GooglePlaceAutocompleteElementConstructor = new (options?: Record<string, unknown>) => GooglePlaceAutocompleteElement;

type GooglePlacesLibrary = {
  PlaceAutocompleteElement: GooglePlaceAutocompleteElementConstructor;
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
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
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const [selectedCoords, setSelectedCoords] = useState<SelectedCoords | null>(null);
  const [deliveryPinUrl, setDeliveryPinUrl] = useState('');
  const [mapUnavailable, setMapUnavailable] = useState(!apiKey);
  const [searchUnavailable, setSearchUnavailable] = useState(false);

  const helperText = useMemo(() => {
    if (mapUnavailable) {
      return 'Google Maps API key is not configured. Paste a Google Maps pin link manually.';
    }

    return 'Search for a landmark or address, select a result to drop a pin, then drag the pin or click the exact delivery spot to adjust it.';
  }, [mapUnavailable]);

  useEffect(() => {
    if (!apiKey) return;

    let clickListener: GoogleMapsListener | null = null;
    let dragListener: GoogleMapsListener | null = null;
    let placeAutocompleteElement: GooglePlaceAutocompleteElement | null = null;
    let placeAutocompleteHandler: ((event: Event) => void) | null = null;
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

      const setPin = (lat: number, lng: number, shouldZoom = false) => {
        const roundedLat = Number(lat.toFixed(6));
        const roundedLng = Number(lng.toFixed(6));
        const point = { lat: roundedLat, lng: roundedLng };

        if (!markerRef.current) {
          markerRef.current = new window.google!.maps.Marker({ position: point, map, draggable: true });
          dragListener = markerRef.current.addListener('dragend', (event: GoogleMapMouseEvent) => {
            if (!event.latLng) return;
            setPin(event.latLng.lat(), event.latLng.lng());
          });
        } else {
          markerRef.current.setPosition(point);
        }

        if (shouldZoom) {
          map.setCenter(point);
          map.setZoom(16);
        }

        setSelectedCoords(point);
        setDeliveryPinUrl(buildGoogleMapsLink(roundedLat, roundedLng));
      };

      clickListener = map.addListener('click', (event: GoogleMapMouseEvent) => {
        if (!event.latLng) return;
        setPin(event.latLng.lat(), event.latLng.lng());
      });

      const searchContainer = searchContainerRef.current;
      let PlaceAutocompleteElement = window.google.maps.places?.PlaceAutocompleteElement;

      if (!PlaceAutocompleteElement && window.google.maps.importLibrary) {
        try {
          PlaceAutocompleteElement = (await window.google.maps.importLibrary('places')).PlaceAutocompleteElement;
        } catch {
          PlaceAutocompleteElement = undefined;
        }
      }

      if (disposed) return;

      if (PlaceAutocompleteElement && searchContainer) {
        searchContainer.replaceChildren();

        placeAutocompleteElement = new PlaceAutocompleteElement();
        placeAutocompleteElement.placeholder = 'Search for a landmark, building, or address';
        placeAutocompleteElement.className = 'block w-full';

        placeAutocompleteHandler = async (event: Event) => {
          const placePrediction = (event as GooglePlacePredictionSelectEvent).placePrediction;
          if (!placePrediction) return;

          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['location'] });

          if (disposed) return;

          const location = place.location;
          if (!location) return;
          setPin(location.lat(), location.lng(), true);
        };

        placeAutocompleteElement.addEventListener('gmp-select', placeAutocompleteHandler);
        searchContainer.appendChild(placeAutocompleteElement);
        setSearchUnavailable(false);
      } else {
        setSearchUnavailable(true);
      }

      mapRef.current = map;
      setMapUnavailable(false);
    };

    void setupMap();

    return () => {
      disposed = true;
      if (clickListener) clickListener.remove();
      if (dragListener) dragListener.remove();
      if (placeAutocompleteElement && placeAutocompleteHandler) {
        placeAutocompleteElement.removeEventListener('gmp-select', placeAutocompleteHandler);
      }
      placeAutocompleteElement?.remove();
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey]);

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-800">Delivery pin on map (optional)</span>
      <p className="text-sm text-gray-700">{helperText}</p>
      {!mapUnavailable ? (
        <>
          <div ref={searchContainerRef} className="w-full rounded border p-2" />
          {searchUnavailable ? (
            <p className="text-xs text-amber-700">Location search is unavailable. You can still pan and click the map to set a pin.</p>
          ) : null}
          <div id={MAP_ELEMENT_ID} className="h-72 w-full overflow-hidden rounded border" />
        </>
      ) : null}
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
