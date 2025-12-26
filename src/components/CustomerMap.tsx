// src/components/CustomersMap.tsx
import React, { useEffect, useState, useCallback } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import axios from "../api/axiosClient";

type Customer = {
  id: number;
  fullName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

type Coordinates = {
  lat: number;
  lng: number;
};

const containerStyle = {
  width: "100%",
  height: "450px",
  borderRadius: "12px",
  border: "1px solid #ddd",
};

const centerDefault = {
  lat: 39.8283, // Centro USA
  lng: -98.5795,
};

const CustomersMap: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<{ [key: number]: Coordinates }>({});
  const [loading, setLoading] = useState(true);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  // ============================
  // Cargar clientes globales
  // ============================
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await axios.get("/customers");
        setCustomers(res.data || []);
      } catch (err) {
        console.error("Error loading customers for map", err);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, []);

  // ============================
  // Geocoding
  // ============================
  const geocodeAddress = useCallback(
    async (customer: Customer) => {
      return new Promise<Coordinates | null>((resolve) => {
        if (!window.google) return resolve(null);

        const geocoder = new window.google.maps.Geocoder();

        const fullAddress =
          `${customer.address ?? ""} ${customer.city ?? ""} ${
            customer.state ?? ""
          } ${customer.zipCode ?? ""}`.trim();

        if (!fullAddress) return resolve(null);

        geocoder.geocode({ address: fullAddress }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            resolve({
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            });
          } else {
            console.warn("Geocode failed:", fullAddress, status);
            resolve(null);
          }
        });
      });
    },
    []
  );

  useEffect(() => {
    const loadLocations = async () => {
      if (!isLoaded || customers.length === 0) return;

      const newLocations: { [key: number]: Coordinates } = {};

      for (const c of customers) {
        const coord = await geocodeAddress(c);
        if (coord) newLocations[c.id] = coord;
      }

      setLocations(newLocations);
    };

    loadLocations();
  }, [isLoaded, customers, geocodeAddress]);

  if (!isLoaded) return <p>Loading map…</p>;
  if (loading) return <p>Loading customers…</p>;

  return (
    <div style={{ marginTop: "10px" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={centerDefault}
        zoom={5}
      >
        {Object.entries(locations).map(([id, loc]) => (
          <MarkerF key={id} position={loc} />
        ))}
      </GoogleMap>
    </div>
  );
};

export default CustomersMap;
