// src/pages/CustomerList.tsx
import React, { useEffect, useState } from "react";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

interface Customer {
  id: number;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  customerType?: string;
  tags?: string;
}

const CustomerList: React.FC = () => {
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // (Más adelante podremos usar esto para errores específicos si quieres)
  // const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMyCustomers = async () => {
      try {
        setLoading(true);
        // setError(null);

        const userEmail = user?.email?.trim();
        if (!userEmail) {
          // Si por alguna razón no hay email, simplemente mostramos lista vacía.
          setCustomers([]);
          return;
        }

        const res = await axios.get<Customer[]>("/customers", {
          params: { userEmail },
        });

        setCustomers(res.data ?? []);
      } catch (err) {
        console.error("Error loading customers:", err);
        // No mostramos mensaje rojo; solo dejamos la lista vacía
        setCustomers([]);
        // setError("Could not load your customers.");
      } finally {
        setLoading(false);
      }
    };

    loadMyCustomers();
  }, [user?.email]);

  return (
    <div className="page">
      <main className="main">
        <h1>Customers</h1>

        {/* Sección: My Customers */}
        <section style={{ marginTop: "24px", marginBottom: "24px" }}>
          <h2>My Customers</h2>

          {loading ? (
            <p>Loading your customers...</p>
          ) : customers.length === 0 ? (
            <p>You don&apos;t have any customers yet.</p>
          ) : (
            <div style={{ marginTop: "12px" }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {customers.map((c) => (
                  <li
                    key={c.id}
                    style={{
                      padding: "8px 0",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <strong>{c.fullName || "Unnamed customer"}</strong>
                    {c.customerType && ` · ${c.customerType}`}
                    <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                      {c.email && <span>{c.email}</span>}
                      {c.email && c.phone && <span> · </span>}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Sección: Search Global Customers (solo UI por ahora) */}
        <section style={{ marginTop: "24px" }}>
          <h2>Search Global Customers</h2>
          <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
            Find customers already reviewed in Rycus by name, email, phone,
            city or ZIP. When you leave a review for one of them, that customer
            will be added to your &quot;My Customers&quot; list.
          </p>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "8px",
              maxWidth: "480px",
            }}
          >
            <input
              type="text"
              placeholder="Search global customers..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "999px",
                border: "1px solid #d1d5db",
              }}
              disabled
            />
            <button
              type="button"
              disabled
              style={{
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1px solid #d1d5db",
                backgroundColor: "#f3f4f6",
                cursor: "not-allowed",
              }}
            >
              Search
            </button>
          </div>

          <p
            style={{
              marginTop: "8px",
              fontSize: "0.85rem",
              color: "#9ca3af",
            }}
          >
            No global results yet. Try searching by last name, email, phone, or
            ZIP code. (Coming soon)
          </p>
        </section>
      </main>
    </div>
  );
};

export default CustomerList;
