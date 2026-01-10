// src/pages/RegisterPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { usStates } from "../assets/usStates";
import { industries } from "../assets/industriesList";

const EXTRA_KEY_PREFIX = "rycus_profile_extra_";

type UserMini = {
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, updateUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(""); // opcional
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [accountType, setAccountType] = useState(""); // industria seleccionada

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emailTrimmed = email.trim();
    const fullName =
      `${firstName.trim()} ${lastName.trim()}`.trim() || emailTrimmed;

    try {
      // 1) Registrar usuario en el backend
      const response = await axiosClient.post("/auth/register", {
        fullName,
        email: emailTrimmed,
        password,
        phone: phone.trim() || null,
      });

      console.log("REGISTER RESPONSE:", response.data);
      const data = response.data;

      // backend hoy devuelve: { message, user: null } => creamos safeUser
      const apiUser = data?.user ?? null;

      const safeUser = {
        id: apiUser?.id ?? data?.id ?? 0,
        email: apiUser?.email ?? data?.email ?? emailTrimmed,
        name: apiUser?.fullName ?? apiUser?.name ?? data?.fullName ?? fullName,
        phone: apiUser?.phone ?? data?.phone ?? (phone.trim() || undefined),
      };

      const token =
        data?.token ??
        data?.accessToken ??
        data?.jwt ??
        data?.authToken ??
        "";

      // 2) Login en AuthContext
      login(safeUser, token);

      // ✅ 3) Guardar datos extra EN LOCALSTORAGE (compat)
      const extraProfile = {
        firstName,
        lastName,
        phone,
        businessName,
        address,
        city,
        zipcode,
        state: stateValue,
        industry: accountType,
      };

      const extraKey = `${EXTRA_KEY_PREFIX}${emailTrimmed.toLowerCase()}`;
      localStorage.setItem(extraKey, JSON.stringify(extraProfile));

      // ✅ 4) Traer perfil real del backend (para nombre+avatar consistentes en cualquier PC)
      try {
        const miniRes = await axiosClient.get<UserMini>("/users/by-email", {
          params: { email: emailTrimmed },
        });

        const fetchedFullName = (miniRes.data?.fullName || "").trim();
        const fetchedAvatarUrl = (miniRes.data?.avatarUrl || "").trim();

        updateUser({
          name: fetchedFullName || safeUser.name || fullName,
          avatarUrl: fetchedAvatarUrl || undefined,
        });
      } catch (e2) {
        console.warn("Could not load user mini profile after register:", e2);
      }

      // 5) Ir al dashboard
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Register error:", err);

      let msg = "Registration failed. Please try again.";
      if (err?.response) {
        const status = err.response.status;
        const data = err.response.data;
        msg = `Error ${status}: `;
        if (typeof data === "string") msg += data;
        else if (data?.message) msg += data.message;
        else if (data?.error) msg += data.error;
        else msg += JSON.stringify(data);
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card">
        <h1 className="card-title">Create your Rycus account</h1>
        <p className="card-subtitle">Start reviewing your customers today.</p>

        {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* First name */}
            <div>
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            {/* Last name */}
            <div>
              <label htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            {/* Phone */}
            <div className="form-grid-full">
              <label htmlFor="phone">
                Phone <span style={{ color: "#9ca3af" }}>(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(407) 555-1234"
              />
            </div>

            {/* Business name */}
            <div className="form-grid-full">
              <label htmlFor="businessName">
                Business name{" "}
                <span style={{ color: "#9ca3af" }}>(optional)</span>
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            {/* Address */}
            <div className="form-grid-full">
              <label htmlFor="address">
                Address <span style={{ color: "#9ca3af" }}>(optional)</span>
              </label>
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
                required
              />
            </div>

            {/* ZIP */}
            <div>
              <label htmlFor="zipcode">ZIP code</label>
              <input
                id="zipcode"
                name="zipcode"
                type="text"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                required
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
                required
              >
                <option value="">Select state</option>
                {usStates.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Industry */}
            <div>
              <label htmlFor="accountType">Industry</label>
              <select
                id="accountType"
                name="accountType"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                required
              >
                <option value="">Select industry</option>
                {industries.map((ind) => (
                  <option key={ind.value} value={ind.value}>
                    {ind.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="form-grid-full">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="form-grid-full">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
