// src/pages/RegisterPage.tsx
import React, { useMemo, useState } from "react";
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
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [accountType, setAccountType] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ================================
  // ✅ Referral Fee fields
  // ================================
  const [offersReferralFee, setOffersReferralFee] = useState(false);
  const [referralFeeType, setReferralFeeType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [referralFeeValue, setReferralFeeValue] = useState<string>(""); // keep as string for input
  const [referralFeeNotes, setReferralFeeNotes] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const feeLabel = useMemo(() => {
    return referralFeeType === "PERCENT" ? "Percent (%)" : "Amount ($)";
  }, [referralFeeType]);

  const sanitizeMoneyLike = (raw: string) => {
    // allow digits + dot only
    return raw.replace(/[^0-9.]/g, "");
  };

  const parseFeeNumber = (raw: string): number | null => {
    const cleaned = sanitizeMoneyLike(raw);
    if (!cleaned) return null;
    const n = Number.parseFloat(cleaned);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const validateReferralFee = (): string | null => {
    if (!offersReferralFee) return null;

    const n = parseFeeNumber(referralFeeValue);
    if (n === null) return "Referral fee value is required.";
    if (n <= 0) return "Referral fee value must be > 0.";
    if (referralFeeType === "PERCENT" && n > 100) return "Percent must be <= 100.";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emailTrimmed = email.trim().toLowerCase();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || emailTrimmed;

    // ✅ Validate referral fee (client-side)
    const feeErr = validateReferralFee();
    if (feeErr) {
      setError(feeErr);
      setLoading(false);
      return;
    }

    const feeNumber = offersReferralFee ? parseFeeNumber(referralFeeValue) : null;

    try {
      // 1) Register
      const response = await axiosClient.post("/auth/register", {
        fullName,
        email: emailTrimmed,
        password,
        phone: phone.trim() || null,

        // ✅ Referral Fee payload (matches AuthRequest)
        offersReferralFee: offersReferralFee,
        referralFeeType: offersReferralFee ? referralFeeType : null,
        referralFeeValue: offersReferralFee ? feeNumber : null,
        referralFeeNotes: offersReferralFee ? (referralFeeNotes || "").trim() || null : null,
      });

      const data = response.data;
      const apiUser = data?.user ?? null;

      const safeUser: any = {
        id: apiUser?.id ?? data?.id ?? 0,
        email: apiUser?.email ?? data?.email ?? emailTrimmed,
        name: apiUser?.fullName ?? apiUser?.name ?? data?.fullName ?? fullName,
        phone: apiUser?.phone ?? data?.phone ?? (phone.trim() || undefined),
        // ✅ card required: empieza bloqueado
        hasAccess: false,
      };

      const token = data?.token ?? data?.accessToken ?? data?.jwt ?? data?.authToken ?? "";

      // 2) Login (aunque token venga vacío, guardamos usuario y seguimos)
      login(safeUser, token);

      // 3) Save extra profile (local)
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

        // ✅ also store referral fee in local extra (optional, helpful for UI)
        offersReferralFee,
        referralFeeType,
        referralFeeValue: offersReferralFee ? feeNumber : null,
        referralFeeNotes: offersReferralFee ? (referralFeeNotes || "").trim() : "",
      };

      const extraKey = `${EXTRA_KEY_PREFIX}${emailTrimmed}`;
      localStorage.setItem(extraKey, JSON.stringify(extraProfile));

      // 4) Fetch mini profile (best effort)
      try {
        const miniRes = await axiosClient.get<UserMini>("/users/by-email", {
          params: { email: emailTrimmed },
        });

        const fetchedFullName = (miniRes.data?.fullName || "").trim();
        const fetchedAvatarUrl = (miniRes.data?.avatarUrl || "").trim();

        updateUser({
          name: fetchedFullName || safeUser.name || fullName,
          avatarUrl: fetchedAvatarUrl || undefined,
          hasAccess: false, // ✅ siempre bloqueado hasta pagar
        });
      } catch (e2) {
        console.warn("Could not load mini profile after register:", e2);
        updateUser({ hasAccess: false });
      }

      // ✅ 5) Payment immediately
      updateUser({ hasAccess: false });
      navigate("/activate", { replace: true });
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

            <div className="form-grid-full">
              <label htmlFor="businessName">
                Business name <span style={{ color: "#9ca3af" }}>(optional)</span>
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

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

            {/* =========================================
                ✅ Referral Fee section
               ========================================= */}
            <div className="form-grid-full" style={{ marginTop: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={offersReferralFee}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setOffersReferralFee(on);
                    if (!on) {
                      setReferralFeeValue("");
                      setReferralFeeNotes("");
                      setReferralFeeType("FLAT");
                    }
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600 }}>I offer a referral fee</span>
                  <span style={{ color: "#6b7280", fontSize: 13 }}>
                    Check this if you pay referral fees for completed jobs, leads, or introductions.
                  </span>
                </div>
              </label>
            </div>

            {offersReferralFee && (
              <>
                <div>
                  <label htmlFor="refType">Type</label>
                  <select
                    id="refType"
                    value={referralFeeType}
                    onChange={(e) => setReferralFeeType((e.target.value as any) || "FLAT")}
                    required
                  >
                    <option value="FLAT">Flat ($)</option>
                    <option value="PERCENT">Percent (%)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="refValue">{feeLabel}</label>
                  <input
                    id="refValue"
                    type="text"
                    inputMode="decimal"
                    value={referralFeeValue}
                    onChange={(e) => setReferralFeeValue(sanitizeMoneyLike(e.target.value))}
                    placeholder={referralFeeType === "PERCENT" ? "e.g. 10" : "e.g. 50"}
                    required
                  />
                </div>

                <div className="form-grid-full">
                  <label htmlFor="refNotes">
                    Notes <span style={{ color: "#9ca3af" }}>(optional)</span>
                  </label>
                  <input
                    id="refNotes"
                    type="text"
                    value={referralFeeNotes}
                    onChange={(e) => setReferralFeeNotes(e.target.value)}
                    placeholder='e.g. "Per job completed"'
                  />
                </div>
              </>
            )}
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