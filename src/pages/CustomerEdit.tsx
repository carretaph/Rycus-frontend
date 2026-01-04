// src/pages/CustomerEditPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { usStates } from "../assets/usStates";

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
}

const CustomerEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // mismos campos que en Create
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [customerType, setCustomerType] = useState("Homeowner");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================
  // Cargar datos del cliente
  // ============================
  useEffect(() => {
    const loadCustomer = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const res = await axios.get<Customer>(`/customers/${id}`);
        const c = res.data;

        // dividir fullName en first / last (simple)
        const fullName = c.fullName?.trim() || "";
        const parts = fullName.split(" ");
        const f = parts.shift() || "";
        const l = parts.join(" ");

        setFirstName(f);
        setLastName(l);
        setEmail(c.email ?? "");
        setPhone(c.phone ?? "");
        setAddress(c.address ?? "");
        setCity(c.city ?? "");
        setStateValue(c.state ?? "");
        setZipCode(c.zipCode ?? "");
        setCustomerType(c.customerType ?? "Homeowner");
      } catch (err) {
        console.error("Error loading customer for edit", err);
        setError("Could not load customer data.");
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [id]);

  // ============================
  // Guardar cambios
  // ============================
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;

    setError(null);
    setSaving(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      await axios.put(`/customers/${id}`, {
        fullName,
        email,
        phone,
        address,
        city,
        state: stateValue,
        zipCode,
        customerType,
      });

      // volver a la página de reviews de ese cliente
      navigate(`/customers/${id}`);
    } catch (err) {
      console.error("Error updating customer", err);
      setError("Could not update customer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <main className="main">
          <p>Loading customer...</p>
        </main>
      </div>
    );
  }

  if (error && !firstName && !lastName) {
    // error al cargar, no hay datos
    return (
      <div className="page">
        <main className="main">
          <p style={{ color: "red" }}>{error}</p>
          <p>
            <Link to="/customers">← Back to customers</Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1 className="card-title">Edit Customer</h1>
        <p className="card-subtitle">
          Update this customer&apos;s contact information.
        </p>

        {error && (
          <p style={{ color: "red", marginBottom: 12 }}>{error}</p>
        )}

        <form onSubmit={handleSubmit} className="form-grid">
          {/* First Name */}
          <div>
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Address */}
          <div className="form-grid-full">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              name="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city">City</label>
            <input
              id="city"
              name="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          {/* State – LISTA COMO EN CREATE */}
          <div>
            <label htmlFor="state">State</label>
            <select
              id="state"
              name="state"
              value={stateValue}
              onChange={(e) => setStateValue(e.target.value)}
            >
              <option value="">Select state</option>
              {usStates.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* ZIP Code */}
          <div>
            <label htmlFor="zipCode">ZIP Code</label>
            <input
              id="zipCode"
              name="zipCode"
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
            />
          </div>

          {/* Customer Type – LISTA COMO EN CREATE */}
          <div>
            <label htmlFor="customerType">Customer Type</label>
            <select
              id="customerType"
              name="customerType"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
            >
              <option value="Homeowner">Homeowner</option>
              <option value="Contractor">Contractor</option>
              <option value="Retail">Retail</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Save Button */}
          <div className="form-grid-full">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>

        <p className="auth-footer-text">
          <Link to={`/customers/${id}`}>← Back to customer</Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerEditPage;
