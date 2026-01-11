// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface ProfileExtra {
  firstName?: string;
  lastName?: string;
  phone?: string;
  businessName?: string;
  industry?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  state?: string;
}

type UserMiniDto = {
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

const EXTRA_KEY_PREFIX = "rycus_profile_extra_";
const VIS_KEY_PREFIX = "rycus_profile_visibility_";

const getExtraKey = (email?: string | null) =>
  email ? `${EXTRA_KEY_PREFIX}${email.toLowerCase()}` : `${EXTRA_KEY_PREFIX}guest`;

const getVisKey = (email?: string | null) =>
  email ? `${VIS_KEY_PREFIX}${email.toLowerCase()}` : `${VIS_KEY_PREFIX}guest`;

const SOUND_KEY = "rycus_sound_enabled";

const ProfilePage: React.FC = () => {
  const {
    user,
    updateAvatar,
    updateUser,
    logout,
    moveExtrasToNewEmail,
  } = useAuth();

  const navigate = useNavigate();

  const [preview, setPreview] = useState<string | null>(null);

  // ✅ Notifications (local setting for now)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const raw = localStorage.getItem(SOUND_KEY);
    if (raw === null) return true; // default ON
    return raw === "true";
  });

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, String(soundEnabled));
  }, [soundEnabled]);

  // visibility (local only for now)
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [isSearchable, setIsSearchable] = useState(true);

  // profile fields (local + backend)
  const [extra, setExtra] = useState<ProfileExtra>({
    firstName: "",
    lastName: "",
    phone: "",
    businessName: "",
    industry: "Windows and Doors",
    address: "",
    city: "",
    zipcode: "",
    state: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileExtra>(extra);
  const [savedMsg, setSavedMsg] = useState<string>("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ✅ Change Email UI
  const [newEmail, setNewEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [changeEmailMsg, setChangeEmailMsg] = useState<string>("");

  // =========================================
  // Load extra + visibility from localStorage (per email)
  // =========================================
  useEffect(() => {
    const email = user?.email ?? undefined;
    const extraKey = getExtraKey(email);
    const visKey = getVisKey(email);

    if (user?.avatarUrl) setPreview(user.avatarUrl);

    // load extra
    try {
      const stored = localStorage.getItem(extraKey);
      if (stored && stored !== "undefined" && stored !== "null") {
        const parsed = JSON.parse(stored) as ProfileExtra;
        setExtra({
          firstName: parsed.firstName || "",
          lastName: parsed.lastName || "",
          phone: parsed.phone || "",
          businessName: parsed.businessName || "",
          industry: parsed.industry || "Windows and Doors",
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
      const v = localStorage.getItem(visKey);
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
  }, [user?.email, user?.avatarUrl]);

  useEffect(() => {
    if (!isEditing) setDraft(extra);
  }, [extra, isEditing]);

  useEffect(() => {
    const email = user?.email ?? undefined;
    const visKey = getVisKey(email);
    try {
      localStorage.setItem(visKey, JSON.stringify({ isPublicProfile, isSearchable }));
    } catch (err) {
      console.error("Error saving visibility to localStorage:", err);
    }
  }, [isPublicProfile, isSearchable, user?.email]);

  // =========================================
  // Derived display strings
  // =========================================
  const fullName = useMemo(() => {
    const fromUser = (user as any)?.name?.trim?.();
    if (fromUser) return fromUser;

    const fromExtra = [extra.firstName, extra.lastName].filter(Boolean).join(" ").trim();
    return fromExtra || "Not set";
  }, [user, extra.firstName, extra.lastName]);

  const displayName = useMemo(() => {
    if (fullName !== "Not set") return fullName.split(" ")[0];
    if (user?.email) return user.email.split("@")[0];
    return "User";
  }, [fullName, user?.email]);

  const initial = (extra.firstName || (user as any)?.name || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  const profileUrl = user?.id
    ? `https://rycus.app/u/${user.id}`
    : "https://rycus.app/u/your-profile";

  // =========================================
  // ✅ Upload avatar to backend -> Cloudinary
  // =========================================
  const uploadAvatarToBackend = async (file: File) => {
    const email = user?.email?.trim();
    if (!email) {
      setSavedMsg("Missing email. Please log in again.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    setUploadingAvatar(true);
    setSavedMsg("");

    try {
      const res = await axios.post<UserMiniDto>("/users/avatar", form, {
        params: { email },
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = (res.data?.avatarUrl || "").trim();
      if (!url) {
        setSavedMsg("Upload failed (missing avatarUrl).");
        return;
      }

      setPreview(url);

      updateAvatar(url);
      updateUser({ avatarUrl: url });

      setSavedMsg("Photo updated ✅");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Avatar upload failed. Please try again.";
      setSavedMsg(String(msg));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void uploadAvatarToBackend(file);
  };

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

  // =========================================
  // Save (localStorage + backend + AuthContext)
  // =========================================
  const saveProfile = async () => {
    setSavedMsg("");

    const cleaned: ProfileExtra = {
      firstName: (draft.firstName || "").trim(),
      lastName: (draft.lastName || "").trim(),
      phone: (draft.phone || "").trim(),
      businessName: (draft.businessName || "").trim(),
      industry: (draft.industry || "").trim(),
      address: (draft.address || "").trim(),
      city: (draft.city || "").trim(),
      zipcode: (draft.zipcode || "").trim(),
      state: (draft.state || "").trim(),
    };

    const email = user?.email ?? undefined;
    const extraKey = getExtraKey(email);

    try {
      localStorage.setItem(extraKey, JSON.stringify(cleaned));
    } catch (err) {
      console.error("Error saving profile to localStorage:", err);
    }

    const fullNameToSave =
      [cleaned.firstName, cleaned.lastName].filter(Boolean).join(" ").trim() ||
      (user as any)?.name ||
      "";

    try {
      if (!user?.email) {
        setSavedMsg("Could not save (missing email).");
        return;
      }

      const body = {
        fullName: fullNameToSave || null,
        phone: cleaned.phone || null,
        avatarUrl: (preview || user?.avatarUrl || "").trim() || null,
        businessName: cleaned.businessName || null,
        industry: cleaned.industry || null,
        city: cleaned.city || null,
        state: cleaned.state || null,
      };

      const res = await axios.put(`/users/me`, body, { params: { email: user.email } });
      const updated = res.data as any;

      setExtra(cleaned);
      setIsEditing(false);

      updateUser({
        phone: updated?.phone ?? cleaned.phone,
        businessName: updated?.businessName ?? cleaned.businessName,
        city: updated?.city ?? cleaned.city,
        state: updated?.state ?? cleaned.state,
        zipcode: cleaned.zipcode,
        address: cleaned.address,
        avatarUrl: (updated?.avatarUrl ?? preview ?? user?.avatarUrl ?? undefined) || undefined,
        name: updated?.fullName || fullNameToSave || (user as any)?.name,
        firstName: cleaned.firstName,
        lastName: cleaned.lastName,
      });

      setSavedMsg("Saved ✅");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (err) {
      console.error("Error saving profile to backend:", err);

      setSavedMsg("Saved locally ✅ (backend update failed)");
      setExtra(cleaned);
      setIsEditing(false);

      updateUser({
        phone: cleaned.phone,
        businessName: cleaned.businessName,
        city: cleaned.city,
        state: cleaned.state,
        zipcode: cleaned.zipcode,
        address: cleaned.address,
        avatarUrl: preview ?? user?.avatarUrl,
        name: fullNameToSave || (user as any)?.name,
        firstName: cleaned.firstName,
        lastName: cleaned.lastName,
      });

      setTimeout(() => setSavedMsg(""), 3500);
    }
  };

  // =========================================
  // ✅ Change Email action
  // =========================================
  const submitChangeEmail = async () => {
    setChangeEmailMsg("");

    const currentEmail = user?.email?.trim() || "";
    const nextEmail = newEmail.trim().toLowerCase();
    const pwd = confirmPassword;

    if (!currentEmail) {
      setChangeEmailMsg("Missing current email. Please log in again.");
      return;
    }
    if (!nextEmail || !nextEmail.includes("@")) {
      setChangeEmailMsg("Please enter a valid new email.");
      return;
    }
    if (nextEmail === currentEmail.toLowerCase()) {
      setChangeEmailMsg("New email must be different.");
      return;
    }
    if (!pwd || pwd.trim().length < 1) {
      setChangeEmailMsg("Please enter your password to confirm.");
      return;
    }

    try {
      setChangingEmail(true);

      await axios.post("/auth/change-email", {
        currentEmail,
        newEmail: nextEmail,
        password: pwd,
      });

      try {
        moveExtrasToNewEmail(currentEmail, nextEmail);
      } catch {}

      setChangeEmailMsg("Email updated ✅ Please sign in again with your new email.");

      setTimeout(() => {
        logout();
        navigate("/login");
      }, 900);
    } catch (err: any) {
      console.error("Change email failed", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data ||
        "Could not change email.";
      setChangeEmailMsg(String(msg));
    } finally {
      setChangingEmail(false);
      setConfirmPassword("");
    }
  };

  const businessName = extra.businessName?.trim() || "Not set";
  const industry = extra.industry?.trim() || "Not set";
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
            <p className="card-subtitle">
              Update your personal information, profile photo and visibility.
            </p>
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

        {/* FOTO */}
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
              This picture will be shown across the app (messages, inbox, profile).
            </p>

            <label
              className="btn-secondary"
              style={{
                cursor: uploadingAvatar ? "not-allowed" : "pointer",
                opacity: uploadingAvatar ? 0.6 : 1,
              }}
            >
              {uploadingAvatar ? "Uploading..." : "Upload new photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
                disabled={uploadingAvatar}
              />
            </label>
          </div>
        </div>

        {/* INFO */}
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
            <label>Industry</label>
            {!isEditing ? (
              <div className="profile-info-box">{industry}</div>
            ) : (
              <input
                className="input"
                value={draft.industry || ""}
                onChange={(e) => setField("industry", e.target.value)}
                placeholder='e.g. "Windows and Doors"'
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
              <input
                className="input"
                value={draft.city || ""}
                onChange={(e) => setField("city", e.target.value)}
              />
            )}
          </div>

          <div>
            <label>State</label>
            {!isEditing ? (
              <div className="profile-info-box">{state}</div>
            ) : (
              <input
                className="input"
                value={draft.state || ""}
                onChange={(e) => setField("state", e.target.value)}
              />
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

        {/* NOTIFICATIONS */}
        <h2 className="card-section-title">Notifications</h2>
        <div className="profile-toggle-group" style={{ marginTop: 10 }}>
          <label className="profile-toggle">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
            <div>
              <div className="profile-toggle-title">Sound notifications</div>
              <div className="profile-toggle-description">
                Play a soft sound when you receive a new network invitation.
              </div>
            </div>
          </label>
        </div>

        {/* VISIBILITY */}
        <h2 className="card-section-title">Visibility & sharing</h2>

        <div className="profile-toggle-group">
          <label className="profile-toggle">
            <input
              type="checkbox"
              checked={isPublicProfile}
              onChange={(e) => setIsPublicProfile(e.target.checked)}
            />
            <div>
              <div className="profile-toggle-title">Public profile</div>
              <div className="profile-toggle-description">
                Allow other Rycus users to see your profile when you share your link. Your email will never be public.
              </div>
            </div>
          </label>

          <label className="profile-toggle">
            <input
              type="checkbox"
              checked={isSearchable}
              onChange={(e) => setIsSearchable(e.target.checked)}
            />
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

        {/* CHANGE EMAIL */}
        <h2 className="card-section-title">Change Email</h2>
        <p className="dashboard-text" style={{ marginTop: 6 }}>
          If you update your email, you will need to sign in again.
        </p>

        <div className="profile-info-grid" style={{ marginTop: 12 }}>
          <div className="profile-info-full">
            <label>New email</label>
            <input
              className="input"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new-email@example.com"
              disabled={changingEmail}
            />
          </div>

          <div className="profile-info-full">
            <label>Confirm your password</label>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Your password"
              disabled={changingEmail}
            />
          </div>

          <div className="profile-info-full" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={submitChangeEmail}
              disabled={changingEmail}
              style={{ maxWidth: 320 }}
            >
              {changingEmail ? "Updating..." : "Change Email"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setNewEmail("");
                setConfirmPassword("");
                setChangeEmailMsg("");
              }}
              disabled={changingEmail}
            >
              Clear
            </button>
          </div>
        </div>

        {changeEmailMsg && (
          <div className="profile-save-msg" style={{ marginTop: 10 }}>
            {changeEmailMsg}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
