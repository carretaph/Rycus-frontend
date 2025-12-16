// src/pages/CustomerList.tsx
import React, { useEffect, useState } from "react";
import axios from "../api/axiosClient";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Customer {
  id: number;
  fullName: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  customerType?: string;
  tags?: string;
  lastReviewDate?: string | null;
}

const CustomerList: React.FC = () => {
  const { user } = useAuth();

  // ============================
  // MY CUSTOMERS
  // ============================
  const [myCustomers, setMyCustomers] = useState<Customer[]>([]);
  const [myLoading, setMyLoading] = useState(true);
  const [myError, setMyError] = useState<string | null>(null);
  const [mySearch, setMySearch] = useState("");

  // ============================
  // GLOBAL SEARCH
  // ============================
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<Customer[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ============================
  // LOAD MY CUSTOMERS
  // ============================
  useEffect(() => {
    const fetchMyCustomers = async () => {
      try {
        setMyLoading(true);
        setMyError(null);

        if (!user?.email) {
          setMyCustomers([]);
          return;
        }

        const res = await axios.get("/customers", {
          params: { userEmail: user.email },
        });

        setMyCustomers(res.data || []);
      } catch (err) {
        console.error("Error loading my customers", err);
        setMyError("Could not load your customers.");
        setMyCustomers([]);
      } finally {
        setMyLoading(false);
      }
    };

    fetchMyCustomers();
  }, [user]);

  // ============================
  // FILTER MY CUSTOMERS
  // ============================
  const normalizedMySearch = mySearch.trim().toLowerCase();

  const filteredMyCustomers = myCustomers.filter((c) => {
    if (!normalizedMySearch) return true;

    const text = [
      c.fullName,
      c.email,
      c.phone,
      c.city,
      c.state,
      c.customerType,
      c.tags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(normalizedMySearch);
  });

  // ============================
  // GLOBAL SEARCH HANDLERS
  // ============================
  const handleGlobalSearch = async () => {
    const q = globalQuery.trim();
    if (!q) {
      setGlobalResults([]);
      return;
    }

    try {
      setGlobalLoading(true);
      setGlobalError(null);

      const res = await axios.get("/customers/search", {
        params: { q },
      });

      setGlobalResults(res.data || []);
    } catch (err) {
      console.error("Error searching global customers", err);
      setGlobalError("Could not search global customers.");
      setGlobalResults([]);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleGlobalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleGlobalSearch();
    }
  };

  // ============================
  // RENDER
  // ============================
  return (
    <div className="customer-page">
      <div className="card">
        <h2 className="card-title">Customers</h2>

        {/* =======================
            MY CUSTOMERS
        ======================= */}
        <h3 className="card-section-title">My Customers</h3>

        {myLoading ? (
          <p>Loading your customers...</p>
        ) : myError ? (
          <p style={{ color: "red" }}>{myError}</p>
        ) : myCustomers.length === 0 ? (
          <p>
            You don&apos;t have customers yet. Add one or search a global
            customer and leave a review to make it yours.
          </p>
        ) : (
          <>
            {/* Search My Customers */}
            <div className="customers-search">
              <input
                type="text"
                placeholder="Search in my customers (name, city, type, tags...)"
                value={mySearch}
                onChange={(e) => setMySearch(e.target.value)}
              />
            </div>

            <table className="customers-table">
              <thead>
                <tr>
                  <th>Full name</th>
                  <th>E-mail</th>
                  <th>Phone</th>
                  <th>City / State</th>
                  <th>Type</th>
                  <th>Tags</th>
                  <th>Reviews</th>
                </tr>
              </thead>

              <tbody>
                {filteredMyCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.fullName}</td>
                    <td>{c.email || "-"}</td>
                    <td>{c.phone || "-"}</td>
                    <td>{c.city && c.state ? `${c.city}, ${c.state}` : "-"}</td>
                    <td>{c.customerType || "-"}</td>
                    <td>{c.tags || "-"}</td>

                    {/* ✅ TEMP FIX:
                       Backend no está mandando lastReviewDate correctamente.
                       Por ahora mostramos un link consistente y NO mentimos con "No reviews yet". */}
                    <td className="reviews-cell">
                      <Link to={`/customers/${c.id}/reviews`}>View reviews</Link>
                      <span className="review-date" style={{ opacity: 0.85 }}>
                        Open reviews →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* =======================
            GLOBAL SEARCH
        ======================= */}
        <h3 className="card-section-title" style={{ marginTop: 32 }}>
          Search Global Customers
        </h3>

        <p style={{ fontSize: "0.9rem", color: "#4B5563", marginBottom: 8 }}>
          Find customers already in Rycus by name, email, phone, city or ZIP.
          When you leave a review for one of them, that customer will be added
          to your &quot;My Customers&quot; list.
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <input
            type="text"
            placeholder="Search global customers..."
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={handleGlobalKeyDown}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={handleGlobalSearch}
          >
            Search
          </button>
        </div>

        {globalLoading && <p>Searching global customers...</p>}
        {globalError && <p style={{ color: "red", marginBottom: 8 }}>{globalError}</p>}

        {globalResults.length > 0 && (
          <table className="customers-table">
            <thead>
              <tr>
                <th>Full name</th>
                <th>E-mail</th>
                <th>Phone</th>
                <th>City / State</th>
                <th>Type</th>
                <th>Tags</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {globalResults.map((c) => (
                <tr key={c.id}>
                  <td>{c.fullName}</td>
                  <td>{c.email || "-"}</td>
                  <td>{c.phone || "-"}</td>
                  <td>{c.city && c.state ? `${c.city}, ${c.state}` : "-"}</td>
                  <td>{c.customerType || "-"}</td>
                  <td>{c.tags || "-"}</td>
                  <td className="reviews-cell">
                    <Link to={`/customers/${c.id}/reviews`}>View reviews</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!globalLoading && !globalError && globalResults.length === 0 && (
          <p style={{ fontSize: "0.85rem", color: "#6B7280" }}>
            No global results yet. Try searching by last name, email, phone, or ZIP code.
          </p>
        )}
      </div>
    </div>
  );
};

export default CustomerList;
