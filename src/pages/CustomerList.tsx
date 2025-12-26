// src/pages/CustomerList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import CustomerMap from "../components/CustomerMap";

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
  const navigate = useNavigate();

  // Mis clientes
  const [myCustomers, setMyCustomers] = useState<Customer[]>([]);
  const [loadingMy, setLoadingMy] = useState(true);

  // Búsqueda global
  const [searchTerm, setSearchTerm] = useState("");
  const [globalResults, setGlobalResults] = useState<Customer[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ============================
  // Cargar "My Customers"
  // ============================
  useEffect(() => {
    const loadMyCustomers = async () => {
      try {
        setLoadingMy(true);
        setError(null);

        const userEmail = user?.email?.trim();

        // Si no hay email, no dejamos loading infinito
        if (!userEmail) {
          setMyCustomers([]);
          setLoadingMy(false);
          return;
        }

        const res = await axios.get<Customer[]>("/customers", {
          params: { userEmail },
        });

        setMyCustomers(res.data ?? []);
      } catch (err) {
        console.error("Error loading customers:", err);
        setMyCustomers([]);
        setError("Could not load your customers.");
      } finally {
        setLoadingMy(false);
      }
    };

    loadMyCustomers();
  }, [user?.email]);

  // ============================
  // Click en un cliente
  // ============================
  const handleCustomerClick = (id?: number) => {
    if (!id) return;
    // Ruta definida en App.tsx: /customers/:id/reviews
    navigate(`/customers/${id}/reviews`);
  };

  // ============================
  // Búsqueda GLOBAL (reutilizable)
  // ============================
  const handleSearch = async (query?: string) => {
    const q = (query ?? searchTerm).trim();
    if (!q || q.length < 2) {
      setGlobalResults([]);
      return;
    }

    try {
      setLoadingGlobal(true);
      setError(null);

      const res = await axios.get<Customer[]>("/customers/search", {
        params: { q },
      });

      setGlobalResults(res.data ?? []);
    } catch (err) {
      console.error("Error searching global customers:", err);
      setError("Error searching global customers.");
      setGlobalResults([]);
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Enter sigue funcionando (además del autosuggest)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // ============================
  // 🔍 BÚSQUEDA AUTOMÁTICA (DEBOUNCE)
  // ============================
  useEffect(() => {
    const q = searchTerm.trim();

    // Si está vacío o muy corto, limpiamos resultados y salimos
    if (!q || q.length < 2) {
      setGlobalResults([]);
      return;
    }

    // Esperamos 600ms después de que el usuario deja de escribir
    const timeoutId = window.setTimeout(() => {
      handleSearch(q);
    }, 600);

    // Limpiamos el timeout si el usuario sigue escribiendo
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  return (
    <div className="page">
      <main className="main">
        <h1>Customers</h1>

        {error && (
          <div
            style={{
              marginTop: "12px",
              marginBottom: "12px",
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        {/* ============================
            My Customers
        ============================= */}
        <section style={{ marginTop: "24px", marginBottom: "24px" }}>
          <h2>My Customers</h2>

          {loadingMy ? (
            <p>Loading your customers...</p>
          ) : myCustomers.length === 0 ? (
            <p>You don&apos;t have any customers yet.</p>
          ) : (
            <div style={{ marginTop: "12px" }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {myCustomers.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => handleCustomerClick(c.id)}
                    style={{
                      padding: "8px 0",
                      borderBottom: "1px solid #e5e7eb",
                      cursor: "pointer",
                    }}
                  >
                    <strong>{c.fullName || "Unnamed customer"}</strong>
                    {c.customerType && ` · ${c.customerType}`}
                    <div
                      style={{
                        fontSize: "0.9rem",
                        color: "#6b7280",
                        marginTop: 2,
                      }}
                    >
                      {c.email && <span>{c.email}</span>}
                      {c.email && c.phone && <span> · </span>}
                      {c.phone && <span>{c.phone}</span>}
                      {(c.city || c.state || c.zipCode) && (
                        <>
                          {(c.email || c.phone) && <span> · </span>}
                          <span>
                            {c.city || ""} {c.state || ""} {c.zipCode || ""}
                          </span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ============================
            Search Global Customers
        ============================= */}
        <section style={{ marginTop: "24px" }}>
          <h2>Search Global Customers</h2>
          <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
            Find customers already reviewed in Rycus by name, last name, email,
            phone number, address, city, state, ZIP code, industry type or tags.
            When you leave a review for one of them, that customer will be
            automatically added to your &quot;My Customers&quot; list.
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "999px",
                border: "1px solid #d1d5db",
              }}
            />
            <button
              type="button"
              onClick={() => handleSearch()}
              style={{
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1px solid #111827",
                backgroundColor: "#111827",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Search
            </button>
          </div>

          {/* Resultados globales */}
          <div style={{ marginTop: "12px" }}>
            {loadingGlobal && <p>Searching global customers...</p>}

            {!loadingGlobal &&
              globalResults.length === 0 &&
              searchTerm.trim().length >= 2 && (
                <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                  No customers found for &quot;{searchTerm}&quot;.
                </p>
              )}

            {!loadingGlobal && globalResults.length > 0 && (
              <div
                style={{
                  marginTop: "8px",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {globalResults.map((c) => (
                    <li
                      key={c.id}
                      onClick={() => handleCustomerClick(c.id)}
                      style={{
                        padding: "8px 0",
                        borderBottom: "1px solid #e5e7eb",
                        cursor: "pointer",
                      }}
                    >
                      <strong>{c.fullName || "Unnamed customer"}</strong>
                      {c.customerType && ` · ${c.customerType}`}
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#6b7280",
                          marginTop: 2,
                        }}
                      >
                        {c.email && <span>{c.email}</span>}
                        {c.email && c.phone && <span> · </span>}
                        {c.phone && <span>{c.phone}</span>}
                        {(c.city || c.state || c.zipCode) && (
                          <>
                            {(c.email || c.phone) && <span> · </span>}
                            <span>
                              {c.city || ""} {c.state || ""} {c.zipCode || ""}
                            </span>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ============================
            Customers Map (beta)
        ============================= */}
        <section style={{ marginTop: "32px" }}>
          <h2>Customers Map (beta)</h2>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            See all customers with a valid address on the map. Each pin
            represents one customer based on their address, city, state and ZIP
            code.
          </p>

          <CustomerMap />
        </section>
      </main>
    </div>
  );
};

export default CustomerList;
