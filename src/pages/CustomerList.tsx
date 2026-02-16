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
    navigate(`/customers/${id}`);
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

    if (!q || q.length < 2) {
      setGlobalResults([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handleSearch(q);
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <div className="page">
      {/* ✅ Este wrapper es el que centra todo */}
      <div className="customers-container">
        <h1 style={{ marginTop: 0 }}>Customers</h1>

        {error && (
          <div
            style={{
              marginTop: 12,
              marginBottom: 12,
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
            ✅ Search Global Customers (ARRIBA)
        ============================= */}
        <section className="customers-search-block" style={{ marginTop: 16 }}>
          <h2 style={{ margin: 0 }}>Search Global Customers</h2>
          <p className="customers-search-text" style={{ marginTop: 8 }}>
            Find customers already reviewed in Rycus by name, last name, email,
            phone number, address, city, state, ZIP code, industry type or tags.
            When you leave a review for one of them, that customer will be
            automatically added to your &quot;My Customers&quot; list.
          </p>

          <div className="customers-search-bar" style={{ maxWidth: 520 }}>
            <input
              type="text"
              placeholder="Search global customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <button type="button" onClick={() => handleSearch()}>
              Search
            </button>
          </div>

          {/* Resultados globales */}
          <div style={{ marginTop: 12 }}>
            {loadingGlobal && <p>Searching global customers...</p>}

            {!loadingGlobal &&
              globalResults.length === 0 &&
              searchTerm.trim().length >= 2 && (
                <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                  No customers found for &quot;{searchTerm}&quot;.
                </p>
              )}

            {!loadingGlobal && globalResults.length > 0 && (
              <div style={{ marginTop: 8, borderTop: "1px solid #e5e7eb" }}>
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
            My Customers
        ============================= */}
        <section style={{ marginTop: 28, marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <h2 style={{ margin: 0 }}>My Customers</h2>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/customers/new")}
            >
              + Add new customer
            </button>
          </div>

          {loadingMy ? (
            <p>Loading your customers...</p>
          ) : myCustomers.length === 0 ? (
            <p>You don&apos;t have any customers yet.</p>
          ) : (
            <div style={{ marginTop: 12 }}>
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
            Customers Map (beta)
        ============================= */}
        <section style={{ marginTop: 32 }}>
          <h2 style={{ marginBottom: 6 }}>Customers Map</h2>
          <p style={{ fontSize: "0.9rem", color: "#6b7280", marginBottom: 8 }}>
            See all customers with a valid address on the map. Each pin
            represents one customer based on their address, city, state and ZIP
            code.
          </p>

          {/* ✅ mismo look/width que dashboard */}
          <div className="dashboard-map-wrap">
            <div className="dashboard-map-card">
              <CustomerMap />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CustomerList;
