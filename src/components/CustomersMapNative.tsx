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

const messageBoxStyle: React.CSSProperties = {
  height: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: 16,
  fontSize: 14,
  color: "#6b7280",
  background: "#fff",
  borderRadius: 12,
};

const errorBoxStyle: React.CSSProperties = {
  ...messageBoxStyle,
  color: "#b91c1c",
};

const hostStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const CustomersMapNative: React.FC = () => {
  const isNativeApp = Capacitor.getPlatform() !== "web";

  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerIdsRef = useRef<string[]>([]);
  const mountedRef = useRef(false);
  const creatingRef = useRef(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hostReady, setHostReady] = useState(false);

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

  const mapCenter =
    customersWithCoords.length > 0
      ? customersWithCoords[0].coord
      : FALLBACK_CENTER;

  const mapZoom = customersWithCoords.length <= 1 ? 14 : 10;

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
        setMapError(null);

        const res = await axios.get("/customers");

        if (!mountedRef.current) return;
        setCustomers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error loading customers for native map", err);
        if (!mountedRef.current) return;
        setCustomers([]);
        setMapError("Could not load customer locations.");
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

    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let timeoutId: number | null = null;

    const measure = () => {
      if (cancelled) return;
      const host = hostRef.current;
      if (!host) {
        setHostReady(false);
        return;
      }

      const rect = host.getBoundingClientRect();
      const ready = rect.width > 0 && rect.height > 0;

      console.log("📐 Native map host size:", rect.width, rect.height);
      setHostReady(ready);
    };

    const setup = () => {
      const host = hostRef.current;
      if (!host) {
        timeoutId = window.setTimeout(setup, 150);
        return;
      }

      measure();

      observer = new ResizeObserver(() => {
        measure();
      });

      observer.observe(host);
      window.addEventListener("resize", measure);
    };

    timeoutId = window.setTimeout(setup, 150);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [isNativeApp]);

  useEffect(() => {
    if (!isNativeApp) return;
    if (!apiKey) {
      setMapError("Missing Google Maps API key.");
      return;
    }
    if (!hostReady) return;
    if (!hostRef.current) return;
    if (mapRef.current) return;
    if (creatingRef.current) return;
    if (loadingCustomers) return;
    if (customersWithCoords.length === 0) return;

    let cancelled = false;
    creatingRef.current = true;

    const createMap = async () => {
      try {
        const host = hostRef.current;
        if (!host) {
          throw new Error("Map host not found.");
        }

        const rect = host.getBoundingClientRect();
        console.log("📍 Creating native map...");
        console.log("📐 Final host rect:", rect.width, rect.height);

        if (rect.width <= 0 || rect.height <= 0) {
          throw new Error("Map host has invalid size.");
        }

        const map = await GoogleMap.create({
          id: `rycus-native-map-${Date.now()}`,
          element: host,
          apiKey,
          forceCreate: true,
          config: {
            center: mapCenter,
            zoom: mapZoom,
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
          setMapError(
            err instanceof Error
              ? `Could not initialize native map: ${err.message}`
              : "Could not initialize native map."
          );
        }
      } finally {
        creatingRef.current = false;
      }
    };

    const timer = window.setTimeout(() => {
      void createMap();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    apiKey,
    customersWithCoords.length,
    hostReady,
    isNativeApp,
    loadingCustomers,
    mapCenter,
    mapZoom,
  ]);

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
    return <div style={messageBoxStyle}>Loading customer locations...</div>;
  }

  if (!apiKey) {
    return <div style={errorBoxStyle}>Missing Google Maps API key.</div>;
  }

  if (customersWithCoords.length === 0) {
    return (
      <div style={messageBoxStyle}>
        No customers with coordinates available yet.
      </div>
    );
  }

  if (mapError) {
    return <div style={errorBoxStyle}>{mapError}</div>;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 300,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 10,
          zIndex: 10,
          fontSize: 12,
          background: "rgba(255,255,255,0.8)",
          padding: "4px 6px",
          borderRadius: 6,
        }}
      >
        Native: {mapReady ? "YES" : "NO"} · Host:{" "}
        {hostReady ? "YES" : "NO"} · Pins: {customersWithCoords.length}
      </div>

      <div ref={hostRef} id="rycus-native-map-host" style={hostStyle} />
    </div>
  );
};

export default CustomersMapNative;