// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface ProfileExtra {
  firstName?: string;
  lastName?: string;
  phone?: string;
  businessName?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  state?: string;
}

const EXTRA_KEY = "rycus_profile_extra";
const VIS_KEY = "rycus_profile_visibility";

const ProfilePage: React.FC = () => {
  const { user, updateAvatar, updateUser } = useAuth();

  const [preview, setPreview] = useState<string | null>(null);

  // visibility (local only for now)
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [isSearchable, setIsSearchable] = useState(true);

  // profile fields (local only for now)
  const [extra, setExtra] = useState<ProfileExtra>({
    firstName: "",
    lastName: "",
    phone: "",
    businessName: "",
    address: "",
    city: "",
    zipcode: "",
    state: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileExtra>(extra);
  const [savedMsg, setSavedMsg] = useState<string>("");

  useEffect(() => {
    // avatar preview
    if (user?.avatarUrl) setPreview(user.avatarUrl);

    // load extra
    try {
      const stored = localStorage.getItem(EXTRA_KEY);
      if (stored && stored !== "undefined" && stored !== "null") {
        const parsed = JSON.parse(stored) as ProfileExtra;
        setExtra({
          firstName: parsed.firstName || "",
          lastName: parsed.lastName || "",
          phone: parsed.phone || "",
          businessName: parsed.businessName || "",
          address: parsed.address || "",
          city: parsed.city || "",
          zipcode: parsed.zipcode || "",
          state: parsed.state || "",
        });
      }
    } catch (err) {
      console.error("Error reading profile extra from localStorage:", err);
    }

    // load visibility
    try {
      const v = localStorage.getItem(VIS_KEY);
      if (v && v !== "undefined" && v !== "null") {
        const parsed = JSON.parse(v) as {
          isPublicProfile?: boolean;
          isSearchable?: boolean;
        };
        if (typeof parsed.isPublicProfile === "boolean") setIsPublicProfile(parsed.isPublicProfile);
        if (typeof parsed.isSearchable === "boolean") setIsSearchable(parsed.isSearchable);
      }
    } catch (err) {
      console.error("Error reading visibility from localStorage:", err);
    }
  }, [user?.avatarUrl]);

  // keep draft synced when extra changes (while not editing)
  useEffect(() => {
    if (!isEditing) setDraft(extra);
  }, [extra, isEditing]);

  // persist visibility whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(VIS_KEY, JSON.stringify({ isPublicProfile, isSearchable }));
    } catch (err) {
      console.error("Error saving visibility to localStorage:", err);
    }
  }, [isPublicProfile, isSearchable]);

  const fullName = useMemo(() => {
    const fromUser = user?.name?.trim();
    if (fromUser) return fromUser;

    const fromExtra = [extra.firstName, extra.lastName].filter(Boolean).join(" ").trim();
    return fromExtra || "Not set";
  }, [user?.name, extra.firstName, extra.lastName]);

  const displayName = useMemo(() => {
    if (fullName !== "Not set") return fullName.split(" ")[0];
    if (user?.email) return user.email.split("@")[0];
    return "User";
  }, [fullName, user?.email]);

  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      updateAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  const profileUrl = user?.id ? `https://rycus.app/u/${user.id}` : "https://rycus.app/u/your-profile";

  const startEditing = () => {
    setSavedMsg("");
    setDraft(extra);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setSavedMsg("");
    setDraft(extra);
    setIsEditing(false);
  };

  const setField = (key: keyof ProfileExtra, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = () => {
    setSavedMsg("");

    const cleaned: ProfileExtra = {
      firstName: (draft.firstName || "").trim(),
      lastName: (draft.lastName || "").trim(),
      phone: (draft.phone || "").trim(),
      businessName: (draft.businessName || "").trim(),
      address: (draft.address || "").trim(),
      city: (draft.city || "").trim(),
      zipcode: (draft.zipcode || "").trim(),
      state: (draft.state || "").trim(),
    };

    try {
      localStorage.setItem(EXTRA_KEY, JSON.stringify(cleaned));

      // update local extra state
      setExtra(cleaned);
      setIsEditing(false);

      // ✅ update AuthContext user so whole app reflects changes
      updateUser({
        phone: cleaned.phone,
        firstName: cleaned.firstName,
        lastName: cleaned.lastName,
        businessName: cleaned.businessName,
        address: cleaned.address,
        city: cleaned.city,
        state: cleaned.state,
        zipcode: cleaned.zipcode,
        // optional: keep a nice name in user
        name: [cleaned.firstName, cleaned.lastName].filter(Boolean).join(" ").trim() || user?.name,
      });

      setSavedMsg("Saved ✅");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (err) {
      console.error("Error saving profile to localStorage:", err);
      setSavedMsg("Could not save. Please try again.");
    }
  };

  const businessName = extra.businessName?.trim() || "Not set";
  const phone = extra.phone?.trim() || "Not set";
  const address = extra.address?.trim() || "Not set";
  const city = extra.city?.trim() || "Not set";
  const state = extra.state?.trim() || "Not set";
  const zipcode = extra.zipcode?.trim() || "Not set";

  return (
    <div className="profile-page-container">
      <div className="card profile-card">
        <div className="profile-header-row">
          <div>
            <h1 className="card-title">My Profile</h1>
            <p className="card-subtitle">Update your personal information, profile photo and visibility.</p>
          </div>

          <div className="profile-actions">
            {!isEditing ? (
              <button className="btn-primary" type="button" onClick={startEditing}>
                Edit
              </button>
            ) : (
              <div className="profile-actions-inline">
                <button className="btn-primary" type="button" onClick={saveProfile}>
                  Save
                </button>
                <button className="btn-secondary" type="button" onClick={cancelEditing}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {savedMsg && <div className="profile-save-msg">{savedMsg}</div>}

        {/* FOTO DE PERFIL */}
        <div className="profile-photo-row">
          <div className="profile-photo-wrapper">
            {preview ? (
              <img src={preview} alt={displayName} className="profile-photo-img" />
            ) : (
              <div className="profile-photo-placeholder">{initial}</div>
            )}
          </div>

          <div className="profile-photo-text">
            <p className="profile-photo-title">Profile photo</p>
            <p className="profile-photo-description">
              This picture will be shown on your dashboard and (optionally) in your public profile.
            </p>
            <label className="btn-secondary" style={{ cursor: "pointer" }}>
              Upload new photo
              <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        {/* DATOS PRINCIPALES */}
        <div className="profile-info-grid">
          <div>
            <label>First name</label>
            {!isEditing ? (
              <div className="profile-info-box">{extra.firstName?.trim() || "Not set"}</div>
            ) : (
              <input
                className="input"
                value={draft.firstName || ""}
                onChange={(e) => setField("firstName", e.target.value)}
                placeholder="First name"
              />
            )}
          </div>

          <div>
            <label>Last name</label>
            {!isEditing ? (
              <div className="profile-info-box">{extra.lastName?.trim() || "Not set"}</div>
            ) : (
              <input
                className="input"
                value={draft.lastName || ""}
                onChange={(e) => setField("lastName", e.target.value)}
                placeholder="Last name"
              />
            )}
          </div>

          <div>
            <label>Full name</label>
            <div className="profile-info-box">{fullName}</div>
          </div>

          <div>
            <label>Email</label>
            <div className="profile-info-box">{user?.email || "Not set"}</div>
          </div>

          <div>
            <label>Phone</label>
            {!isEditing ? (
              <div className="profile-info-box">{phone}</div>
            ) : (
              <input
                className="input"
                value={draft.phone || ""}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="(407) 555-1234"
              />
            )}
          </div>

          <div>
            <label>Business name</label>
            {!isEditing ? (
              <div className="profile-info-box">{businessName}</div>
            ) : (
              <input
                className="input"
                value={draft.businessName || ""}
                onChange={(e) => setField("businessName", e.target.value)}
                placeholder="Business name (optional)"
              />
            )}
          </div>

          <div>
            <label>City</label>
            {!isEditing ? (
              <div className="profile-info-box">{city}</div>
            ) : (
              <input className="input" value={draft.city || ""} onChange={(e) => setField("city", e.target.value)} />
            )}
          </div>

          <div>
            <label>State</label>
            {!isEditing ? (
              <div className="profile-info-box">{state}</div>
            ) : (
              <input className="input" value={draft.state || ""} onChange={(e) => setField("state", e.target.value)} />
            )}
          </div>

          <div>
            <label>ZIP code</label>
            {!isEditing ? (
              <div className="profile-info-box">{zipcode}</div>
            ) : (
              <input
                className="input"
                value={draft.zipcode || ""}
                onChange={(e) => setField("zipcode", e.target.value)}
              />
            )}
          </div>

          <div className="profile-info-full">
            <label>Business address</label>
            {!isEditing ? (
              <div className="profile-info-box">{address}</div>
            ) : (
              <input
                className="input"
                value={draft.address || ""}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Address (optional)"
              />
            )}
          </div>
        </div>

        {/* VISIBILIDAD */}
        <h2 className="card-section-title">Visibility & sharing</h2>

        <div className="profile-toggle-group">
          <label className="profile-toggle">
            <input type="checkbox" checked={isPublicProfile} onChange={(e) => setIsPublicProfile(e.target.checked)} />
            <div>
              <div className="profile-toggle-title">Public profile</div>
              <div className="profile-toggle-description">
                Allow other Rycus users to see your profile when you share your link. Your email will never be public.
              </div>
            </div>
          </label>

          <label className="profile-toggle">
            <input type="checkbox" checked={isSearchable} onChange={(e) => setIsSearchable(e.target.checked)} />
            <div>
              <div className="profile-toggle-title">Searchable by name</div>
              <div className="profile-toggle-description">
                Allow other verified members to find you by your name or business when sending invites or sharing reviews.
              </div>
            </div>
          </label>

          <div className="profile-link-row">
            <div className="profile-link-label">Your profile link (share with trusted contacts):</div>
            <div className="profile-link-value">{profileUrl}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
