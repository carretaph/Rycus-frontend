// src/pages/CustomerCreate.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { usStates } from "../assets/usStates";
import { useAuth } from "../context/AuthContext";  // 👈 NUEVO

const CustomerCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // 👈 NUEVO

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [customerType, setCustomerType] = useState("Homeowner");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      const response = await axios.post(
        "/customers",
        {
          fullName,
          email,
          phone,
          address,
          city,
          state: stateValue,
          zipCode,
          customerType,
        },
        {
          // 👇 AQUÍ VINCULAMOS EL CUSTOMER AL USUARIO QUE LO CREA
          params: { userEmail: user?.email },
        }
      );

      const createdCustomer = response?.data;
      console.log("Created customer response:", createdCustomer);

      const customerId =
        createdCustomer?.id ??
        createdCustomer?.customerId ??
        createdCustomer?.customerID;

      if (customerId) {
        navigate(`/customers/${customerId}/reviews`);
      } else {
        console.warn(
          "Customer created but no id/customerId returned. Redirecting to /customers."
        );
        navigate("/customers");
      }
    } catch (err: any) {
      console.error("Error creating customer", err);
      let msg = "Could not create customer. Please try again.";
      if (err?.response?.data?.message) {
        msg = err.response.data.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1 className="card-title">Add New Customer</h1>
        <p className="card-subtitle">
          Enter your customer information to begin reviewing them.
        </p>

        {error && (
          <p style={{ color: "red", marginBottom: 12 }}>
            {error}
          </p>
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

          {/* State */}
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

          {/* Customer Type */}
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

          {/* Notes - Informational message */}
          <div className="form-grid-full">
            <div
              style={{
                fontSize: "0.9rem",
                backgroundColor: "#F3F4F6",
                borderRadius: 8,
                padding: "8px 12px",
                marginTop: 8,
              }}
            >
              <strong>Notes:</strong>{" "}
              <span style={{ color: "#4B5563" }}>
                this is not a review. After saving this customer, you will be
                directed to the page where you can leave their official review.
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="form-grid-full">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>

        <p className="auth-footer-text">
          <Link to="/customers">← Back to customers</Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerCreate;
