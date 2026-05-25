// src/components/CustomerMap.tsx
import React, { useEffect, useMemo, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
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

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
};

const centerDefault: Coordinates = {
  lat: 39.8283,
  lng: -98.5795,
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

function buildAddress(customer: Customer): string {
  return [customer.address, customer.city, customer.state, customer.zipCode]
    .filter(Boolean)
    .join(", ");
}

const CustomerMap: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";

  const isNativeApp = false;

  const { isLoaded, loadError } = useJsApiLoader({
    id: "rycus-google-map-script",
    googleMapsApiKey: apiKey,
  });

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/customers");
        setCustomers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error loading customers for map", err);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    void loadCustomers();
  }, []);

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

  const mapCenter = customersWithCoords[0]?.coord ?? centerDefault;
  const mapZoom = customersWithCoords.length <= 1 ? 14 : 9;

  const handleMarkerClick = (id: number) => {
    navigate(`/customers/${id}`);
  };

  if (isNativeApp) {
    return null;
  }

  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6b7280",
          background: "#fff",
          borderRadius: 12,
        }}
      >
        Loading customers…
      </div>
    );
  }

  if (customersWithCoords.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 16,
          fontSize: 14,
          color: "#6b7280",
          background: "#fff",
          borderRadius: 12,
        }}
      >
        No customers with coordinates available yet.
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 16,
          fontSize: 14,
          color: "#b91c1c",
          background: "#fff",
          borderRadius: 12,
        }}
      >
        Map unavailable: missing Google Maps API key.
      </div>
    );
  }

  if (loadError) {
    console.error("Google Maps loadError:", loadError);

    return (
      <div
        style={{
          minHeight: 300,
          padding: 16,
          borderRadius: 12,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          color: "#111827",
        }}
      >
        <p style={{ marginTop: 0, marginBottom: 8, fontWeight: 700 }}>
          Map failed to load.
        </p>

        <div style={{ marginTop: 12 }}>
          {customersWithCoords.slice(0, 8).map(({ customer, coord }) => (
            <div
              key={customer.id}
              onClick={() => handleMarkerClick(customer.id)}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid #e5e7eb",
                cursor: "pointer",
              }}
            >
              <strong>{customer.fullName || "Customer"}</strong>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {buildAddress(customer) ||
                  `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6b7280",
          background: "#fff",
          borderRadius: 12,
        }}
      >
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={mapZoom}
      options={{
        fullscreenControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        clickableIcons: false,
        gestureHandling: "greedy",
      }}
    >
      {customersWithCoords.map(({ customer, coord }) => (
        <MarkerF
          key={customer.id}
          position={coord}
          title={customer.fullName || "Customer"}
          onClick={() => handleMarkerClick(customer.id)}
        />
      ))}
    </GoogleMap>
  );
};

export default CustomerMap;