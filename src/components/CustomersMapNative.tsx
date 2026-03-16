// src/components/CustomersMapNative.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { GoogleMap } from "@capacitor/google-maps";
import axios from "../api/axiosClient";

type Customer = {
  id: number;
  fullName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Coordinates = {
  lat: number;
  lng: number;
};

const FALLBACK_CENTER: Coordinates = {
  lat: 28.2489,
  lng: -81.2812,
};

function pickCoordinates(customer: Customer): Coordinates | null {
  const lat =
    typeof customer.lat === "number"
      ? customer.lat
      : typeof customer.latitude === "number"
      ? customer.latitude
      : null;

  const lng =
    typeof customer.lng === "number"
      ? customer.lng
      : typeof customer.longitude === "number"
      ? customer.longitude
      : null;

  if (lat == null || lng == null) return null;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}

function buildSnippet(customer: Customer): string {
  return [customer.address, customer.city, customer.state, customer.zipCode]
    .filter(Boolean)
    .join(", ");
}

const CustomersMapNative: React.FC = () => {
  const isNativeApp = Capacitor.getPlatform() !== "web";

  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerIdsRef = useRef<string[]>([]);
  const mountedRef = useRef(false);
  const createdRef = useRef(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";

  const customersWithCoords = useMemo(() => {
    return customers
      .map((customer) => ({
        customer,
        coord: pickCoordinates(customer),
      }))
      .filter(
        (
          item
        ): item is {
          customer: Customer;
          coord: Coordinates;
        } => item.coord !== null
      );
  }, [customers]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const res = await axios.get("/customers");
        if (!mountedRef.current) return;
        setCustomers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error loading customers for native map", err);
        if (!mountedRef.current) return;
        setCustomers([]);
      } finally {
        if (mountedRef.current) {
          setLoadingCustomers(false);
        }
      }
    };

    void loadCustomers();
  }, []);

  useEffect(() => {
    if (!isNativeApp) return;
    if (!hostRef.current) return;
    if (!apiKey) {
      setMapError("Missing Google Maps API key.");
      return;
    }
    if (createdRef.current) return;

    createdRef.current = true;
    let cancelled = false;

    const createMap = async () => {
      try {
        console.log("📍 Creating native map...");

        const map = await GoogleMap.create({
          id: "rycus-native-map",
          element: hostRef.current as HTMLDivElement,
          apiKey,
          forceCreate: true,
          config: {
            center: FALLBACK_CENTER,
            zoom: 10,
          },
        });

        if (cancelled || !mountedRef.current) {
          await map.destroy();
          return;
        }

        mapRef.current = map;
        setMapReady(true);
        setMapError(null);
        console.log("✅ Native map created");
      } catch (err) {
        console.error("❌ Error creating native map", err);
        if (mountedRef.current) {
          setMapError("Could not initialize native map.");
        }
      }
    };

    const timer = window.setTimeout(() => {
      void createMap();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [apiKey, isNativeApp]);

  useEffect(() => {
    if (!isNativeApp) return;
    if (!mapReady) return;
    if (!mapRef.current) return;

    let cancelled = false;

    const syncMarkers = async () => {
      try {
        const map = mapRef.current;
        if (!map) return;

        if (markerIdsRef.current.length > 0) {
          try {
            await map.removeMarkers(markerIdsRef.current);
          } catch (err) {
            console.error("Error removing existing markers", err);
          }
          markerIdsRef.current = [];
        }

        if (cancelled) return;
        if (customersWithCoords.length === 0) return;

        const ids = await map.addMarkers(
          customersWithCoords.map(({ customer, coord }) => ({
            coordinate: coord,
            title: customer.fullName || "Customer",
            snippet: buildSnippet(customer),
          }))
        );

        if (cancelled) return;

        markerIdsRef.current = ids;
        console.log(`📌 Native markers added: ${ids.length}`);
      } catch (err) {
        console.error("❌ Error syncing native map markers", err);
        if (mountedRef.current) {
          setMapError("Could not load customer markers.");
        }
      }
    };

    void syncMarkers();

    return () => {
      cancelled = true;
    };
  }, [customersWithCoords, isNativeApp, mapReady]);

  useEffect(() => {
    return () => {
      const destroyMap = async () => {
        try {
          if (mapRef.current) {
            if (markerIdsRef.current.length > 0) {
              try {
                await mapRef.current.removeMarkers(markerIdsRef.current);
              } catch (err) {
                console.error("Error removing markers on cleanup", err);
              }
            }

            await mapRef.current.destroy();
            mapRef.current = null;
            markerIdsRef.current = [];
          }
        } catch (err) {
          console.error("Error destroying native map", err);
        }
      };

      void destroyMap();
    };
  }, []);

  if (!isNativeApp) return null;

  if (loadingCustomers) {
    return (
      <div className="native-map-loading">
        Loading customer locations...
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="native-map-error">
        Missing Google Maps API key.
      </div>
    );
  }

  if (customersWithCoords.length === 0) {
    return (
      <div className="native-map-loading">
        No customers with coordinates available yet.
      </div>
    );
  }

  if (mapError) {
    return <div className="native-map-error">{mapError}</div>;
  }

  return (
    <div className="native-map-shell">
      <div className="native-map-debug">
        Native map ready: {mapReady ? "YES" : "NO"} · Pins:{" "}
        {customersWithCoords.length}
      </div>

      <div ref={hostRef} className="native-map-canvas" />
    </div>
  );
};

export default CustomersMapNative;