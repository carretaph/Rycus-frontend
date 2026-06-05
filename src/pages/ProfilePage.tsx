import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import AvatarWithBadge from "../components/AvatarWithBadge";

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
  avatarUrl?: string;
}

type ReferralFeeType = "FLAT" | "PERCENT";

type UserMiniDto = {
  id?: number | null;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  businessName?: string | null;
  city?: string | null;
  state?: string | null;
  offersReferralFee?: boolean | null;
  referralFeeType?: ReferralFeeType | null;
  referralFeeValue?: number | null;
  referralFeeNotes?: string | null;
  planType?: string | null;
  subscriptionStatus?: string | null;
};

const EXTRA_KEY_PREFIX = "rycus_profile_extra_";
const VIS_KEY_PREFIX = "rycus_profile_visibility_";
const SOUND_KEY = "rycus_sound_enabled";

const getExtraKey = (email?: string | null) =>
  email ? `${EXTRA_KEY_PREFIX}${email.toLowerCase()}` : `${EXTRA_KEY_PREFIX}guest`;

const getVisKey = (email?: string | null) =>
  email ? `${VIS_KEY_PREFIX}${email.toLowerCase()}` : `${VIS_KEY_PREFIX}guest`;

function toBool(v: any, fallback = false) {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

function numOrNull(v: string) {
  const t = (v || "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const ProfilePage: React.FC = () => {
  const { user, updateUser, logout, moveExtrasToNewEmail } = useAuth();
  const navigate = useNavigate();

  const preview = (user as any)?.avatarUrl || null;
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const raw = localStorage.getItem(SOUND_KEY);
    if (raw === null) return true;
    return raw === "true";
  });

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, String(soundEnabled));
  }, [soundEnabled]);

  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [isSearchable, setIsSearchable] = useState(true);

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
    avatarUrl: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileExtra>(extra);
  const [savedMsg, setSavedMsg] = useState<string>("");

  const [offersReferralFee, setOffersReferralFee] = useState<boolean>(false);
  const [referralFeeType, setReferralFeeType] = useState<ReferralFeeType>("FLAT");
  const [referralFeeValue, setReferralFeeValue] = useState<string>("");
  const [referralFeeNotes, setReferralFeeNotes] = useState<string>("");

  const [newEmail, setNewEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [changeEmailMsg, setChangeEmailMsg] = useState<string>("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountMsg, setDeleteAccountMsg] = useState<string>("");

  useEffect(() => {
    const email = user?.email ?? undefined;
    const extraKey = getExtraKey(email);
    const visKey = getVisKey(email);

    setOffersReferralFee(toBool((user as any)?.offersReferralFee, false));

    const t = (user as any)?.referralFeeType as ReferralFeeType | null | undefined;
    if (t === "FLAT" || t === "PERCENT") setReferralFeeType(t);

    const v = (user as any)?.referralFeeValue;
    if (typeof v === "number" && Number.isFinite(v)) setReferralFeeValue(String(v));
    else setReferralFeeValue("");

    setReferralFeeNotes(((user as any)?.referralFeeNotes ?? "") as string);

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
          avatarUrl: parsed.avatarUrl || "",
        });

      }
    } catch (err) {
      console.error("Error reading profile extra from localStorage:", err);
    }

    try {
      const v = localStorage.getItem(visKey);
      if (v && v !== "undefined" && v !== "null") {
        const parsed = JSON.parse(v) as {
          isPublicProfile?: boolean;
          isSearchable?: boolean;
        };

        if (typeof parsed.isPublicProfile === "boolean") {
          setIsPublicProfile(parsed.isPublicProfile);
        }

        if (typeof parsed.isSearchable === "boolean") {
          setIsSearchable(parsed.isSearchable);
        }
      }
    } catch (err) {
      console.error("Error reading visibility to localStorage:", err);
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

  const profileUrl = (user as any)?.id
    ? `https://rycus.app/users/${(user as any).id}`
    : "https://rycus.app/users/your-profile";

  const startEditing = () => {
    setSavedMsg("");
    setDraft(extra);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setSavedMsg("");
    setDraft(extra);
    setOffersReferralFee(toBool((user as any)?.offersReferralFee, false));

    const t = (user as any)?.referralFeeType as ReferralFeeType | null | undefined;
    if (t === "FLAT" || t === "PERCENT") setReferralFeeType(t);

    const v = (user as any)?.referralFeeValue;
    setReferralFeeValue(typeof v === "number" ? String(v) : "");
    setReferralFeeNotes(((user as any)?.referralFeeNotes ?? "") as string);
    setIsEditing(false);
  };

  const setField = (key: keyof ProfileExtra, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

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
      avatarUrl: (preview || (user as any)?.avatarUrl || "").trim(),
    };

    try {
      const email = user?.email ?? undefined;
      const extraKey = getExtraKey(email);
      localStorage.setItem(extraKey, JSON.stringify(cleaned));
    } catch {}

    const fullNameToSave =
      [cleaned.firstName, cleaned.lastName].filter(Boolean).join(" ").trim() ||
      (user as any)?.name ||
      "";

    const referralValueNum = offersReferralFee ? numOrNull(referralFeeValue) : null;

    try {
      if (!user?.email) {
        setSavedMsg("Could not save (missing email).");
        return;
      }

      const body = {
        fullName: fullNameToSave || null,
        phone: cleaned.phone || null,
        avatarUrl: cleaned.avatarUrl || null,
        businessName: cleaned.businessName || null,
        industry: cleaned.industry || null,
        city: cleaned.city || null,
        state: cleaned.state || null,
        offersReferralFee: !!offersReferralFee,
        referralFeeType: offersReferralFee ? referralFeeType : null,
        referralFeeValue: offersReferralFee ? referralValueNum : null,
        referralFeeNotes: offersReferralFee ? (referralFeeNotes || "").trim() || null : null,
      };

      const res = await axios.put<UserMiniDto>("/users/me", body);

      const updated = res.data as any;

      setExtra(cleaned);
      setIsEditing(false);

      updateUser({
        id: updated?.id ?? (user as any)?.id,
        phone: updated?.phone ?? cleaned.phone,
        businessName: updated?.businessName ?? cleaned.businessName,
        city: updated?.city ?? cleaned.city,
        state: updated?.state ?? cleaned.state,
        zipcode: cleaned.zipcode,
        address: cleaned.address,
        avatarUrl: (updated?.avatarUrl ?? cleaned.avatarUrl ?? undefined) || undefined,
        name: updated?.fullName || fullNameToSave || (user as any)?.name,
        offersReferralFee:
          typeof updated?.offersReferralFee === "boolean"
            ? updated.offersReferralFee
            : offersReferralFee,
        referralFeeType:
          updated?.referralFeeType ?? (offersReferralFee ? referralFeeType : null),
        referralFeeValue:
          updated?.referralFeeValue ?? (offersReferralFee ? referralValueNum : null),
        referralFeeNotes:
          updated?.referralFeeNotes ?? (offersReferralFee ? referralFeeNotes : null),
      });

      setSavedMsg("Saved ✅");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (err) {
      console.error("Error saving profile to backend:", err);

      setExtra(cleaned);
      setIsEditing(false);

      updateUser({
        phone: cleaned.phone,
        businessName: cleaned.businessName,
        city: cleaned.city,
        state: cleaned.state,
        zipcode: cleaned.zipcode,
        address: cleaned.address,
        avatarUrl: cleaned.avatarUrl || (user as any)?.avatarUrl,
        name: fullNameToSave || (user as any)?.name,
        offersReferralFee,
        referralFeeType: offersReferralFee ? referralFeeType : null,
        referralFeeValue: offersReferralFee ? referralValueNum : null,
        referralFeeNotes: offersReferralFee ? referralFeeNotes : null,
      });

      setSavedMsg("Saved locally ✅ (backend update failed)");
      setTimeout(() => setSavedMsg(""), 3500);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    e.currentTarget.value = "";

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Max 5MB.");
      return;
    }

    try {
      setUploadingAvatar(true);
      setSavedMsg("");

      const fd = new FormData();
      fd.append("file", file);

      const res = await axios.post<UserMiniDto>("/users/me/avatar", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updated = res.data as any;
      const nextAvatarUrl = updated?.avatarUrl || "";

      if (!nextAvatarUrl) {
        throw new Error("Avatar upload did not return avatarUrl.");
      }

      const cleaned: ProfileExtra = {
        ...extra,
        avatarUrl: nextAvatarUrl,
      };

      try {
        const email = user?.email ?? undefined;
        const extraKey = getExtraKey(email);
        localStorage.setItem(extraKey, JSON.stringify(cleaned));
      } catch {}

      setExtra(cleaned);
      setDraft((prev) => ({ ...prev, avatarUrl: nextAvatarUrl }));

      updateUser({
        avatarUrl: nextAvatarUrl,
        name: updated?.fullName || (user as any)?.name,
      });

      setSavedMsg("Profile photo updated ✅");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      alert("Could not upload profile photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const submitChangeEmail = async () => {
    setChangeEmailMsg("");

    const currentEmail = user?.email?.trim() || "";
    const nextEmail = newEmail.trim().toLowerCase();
    const pwd = confirmPassword;

    if (!currentEmail) return setChangeEmailMsg("Missing current email. Please log in again.");
    if (!nextEmail || !nextEmail.includes("@")) return setChangeEmailMsg("Please enter a valid new email.");
    if (nextEmail === currentEmail.toLowerCase()) return setChangeEmailMsg("New email must be different.");
    if (!pwd || pwd.trim().length < 1) return setChangeEmailMsg("Please enter your password to confirm.");

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

  const handleDeleteAccount = async () => {
    setDeleteAccountMsg("");

    const firstConfirm = window.confirm(
      "Are you sure you want to permanently delete your Rycus account? This action cannot be undone."
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "Final confirmation: your account will be permanently deleted. Do you want to continue?"
    );

    if (!secondConfirm) return;

    try {
      setDeletingAccount(true);

      await axios.delete("/users/me");

      try {
        const email = user?.email ?? undefined;
        localStorage.removeItem(getExtraKey(email));
        localStorage.removeItem(getVisKey(email));
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch {}

      logout();
      navigate("/login");
    } catch (err: any) {
      console.error("Delete account failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data ||
        "Could not delete account. Please try again.";
      setDeleteAccountMsg(String(msg));
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleLogout = () => {
    try {
      logout();
      navigate("/login");
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
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
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {(user as any)?.id && (
                <Link to={`/users/${(user as any).id}`} className="btn-secondary">
                  View Public Profile
                </Link>
              )}

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
        </div>

        {savedMsg && <div className="profile-save-msg">{savedMsg}</div>}

        <div className="profile-photo-row">
          <div>
            <AvatarWithBadge
              size={96}
              avatarUrl={preview || (user as any)?.avatarUrl || null}
              name={fullName !== "Not set" ? fullName : displayName}
              email={user?.email || null}
              showReferralBadge={!!offersReferralFee}
            />
          </div>

          <div className="profile-photo-text">
            <p className="profile-photo-title">Profile photo</p>
            <p className="profile-photo-description">
              This picture will be shown across the app, messages, inbox and public profile.
            </p>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              style={{ display: "none" }}
            />

            <button
              type="button"
              className="btn-secondary"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              style={{
                maxWidth: "240px",
                textAlign: "center",
                opacity: uploadingAvatar ? 0.7 : 1,
                cursor: uploadingAvatar ? "not-allowed" : "pointer",
              }}
            >
              {uploadingAvatar ? "Uploading..." : "Change Profile Photo"}
            </button>
          </div>
        </div>

        <div className="profile-info-grid">
          <div>
            <label>First name</label>
            {!isEditing ? (
              <div className="profile-info-box">{extra.firstName?.trim() || "Not set"}</div>
            ) : (
              <input className="input" value={draft.firstName || ""} onChange={(e) => setField("firstName", e.target.value)} />
            )}
          </div>

          <div>
            <label>Last name</label>
            {!isEditing ? (
              <div className="profile-info-box">{extra.lastName?.trim() || "Not set"}</div>
            ) : (
              <input className="input" value={draft.lastName || ""} onChange={(e) => setField("lastName", e.target.value)} />
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
              <input className="input" value={draft.phone || ""} onChange={(e) => setField("phone", e.target.value)} />
            )}
          </div>

          <div>
            <label>Industry</label>
            {!isEditing ? (
              <div className="profile-info-box">{industry}</div>
            ) : (
              <input className="input" value={draft.industry || ""} onChange={(e) => setField("industry", e.target.value)} />
            )}
          </div>

          <div>
            <label>Business name</label>
            {!isEditing ? (
              <div className="profile-info-box">{businessName}</div>
            ) : (
              <input className="input" value={draft.businessName || ""} onChange={(e) => setField("businessName", e.target.value)} />
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
              <input className="input" value={draft.zipcode || ""} onChange={(e) => setField("zipcode", e.target.value)} />
            )}
          </div>

          <div className="profile-info-full">
            <label>Business address</label>
            {!isEditing ? (
              <div className="profile-info-box">{address}</div>
            ) : (
              <input className="input" value={draft.address || ""} onChange={(e) => setField("address", e.target.value)} />
            )}
          </div>
        </div>

        <h2 className="card-section-title">Referral fee</h2>

        <div className="profile-toggle-group" style={{ marginTop: 10 }}>
          <label className="profile-toggle">
            <input
              type="checkbox"
              checked={offersReferralFee}
              onChange={(e) => setOffersReferralFee(e.target.checked)}
              disabled={!isEditing}
            />
            <div>
              <div className="profile-toggle-title">I offer a referral fee</div>
              <div className="profile-toggle-description">
                Enable to show you pay a referral fee when someone sends you a job.
              </div>
            </div>
          </label>
        </div>

        <div className="profile-info-grid" style={{ marginTop: 12, opacity: offersReferralFee ? 1 : 0.55 }}>
          <div>
            <label>Type</label>
            {!isEditing ? (
              <div className="profile-info-box">{offersReferralFee ? referralFeeType : "Not set"}</div>
            ) : (
              <select className="input" value={referralFeeType} onChange={(e) => setReferralFeeType(e.target.value as ReferralFeeType)} disabled={!offersReferralFee}>
                <option value="FLAT">FLAT</option>
                <option value="PERCENT">PERCENT</option>
              </select>
            )}
          </div>

          <div>
            <label>Value</label>
            {!isEditing ? (
              <div className="profile-info-box">{offersReferralFee ? referralFeeValue || "Not set" : "Not set"}</div>
            ) : (
              <input className="input" value={referralFeeValue} onChange={(e) => setReferralFeeValue(e.target.value)} disabled={!offersReferralFee} />
            )}
          </div>

          <div className="profile-info-full">
            <label>Notes</label>
            {!isEditing ? (
              <div className="profile-info-box">{offersReferralFee ? referralFeeNotes?.trim() || "Not set" : "Not set"}</div>
            ) : (
              <input className="input" value={referralFeeNotes} onChange={(e) => setReferralFeeNotes(e.target.value)} disabled={!offersReferralFee} />
            )}
          </div>
        </div>

        <h2 className="card-section-title">Notifications</h2>

        <div className="profile-toggle-group" style={{ marginTop: 10 }}>
          <label className="profile-toggle">
            <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
            <div>
              <div className="profile-toggle-title">Sound notifications</div>
              <div className="profile-toggle-description">
                Play a soft sound when you receive a new network invitation.
              </div>
            </div>
          </label>
        </div>

        <h2 className="card-section-title">Visibility & sharing</h2>

        <div className="profile-toggle-group">
          <label className="profile-toggle">
            <input type="checkbox" checked={isPublicProfile} onChange={(e) => setIsPublicProfile(e.target.checked)} />
            <div>
              <div className="profile-toggle-title">Public profile</div>
              <div className="profile-toggle-description">
                Allow other Rycus users to see your profile when you share your link.
              </div>
            </div>
          </label>

          <label className="profile-toggle">
            <input type="checkbox" checked={isSearchable} onChange={(e) => setIsSearchable(e.target.checked)} />
            <div>
              <div className="profile-toggle-title">Searchable by name</div>
              <div className="profile-toggle-description">
                Allow other verified members to find you by your name or business.
              </div>
            </div>
          </label>

          <div className="profile-link-row">
            <div className="profile-link-label">Your profile link:</div>
            <div className="profile-link-value">{profileUrl}</div>
          </div>
        </div>

        <h2 className="card-section-title">Legal & support</h2>

        <div className="profile-info-full" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <Link to="/privacy" className="btn-secondary" style={{ textAlign: "center", maxWidth: 320 }}>
            Privacy Policy
          </Link>

          <Link to="/terms" className="btn-secondary" style={{ textAlign: "center", maxWidth: 320 }}>
            Terms of Use
          </Link>

          <Link to="/support" className="btn-secondary" style={{ textAlign: "center", maxWidth: 320 }}>
            Support
          </Link>
        </div>

        <h2 className="card-section-title">Change Email</h2>

        <div className="profile-info-grid" style={{ marginTop: 12 }}>
          <div className="profile-info-full">
            <label>New email</label>
            <input className="input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} disabled={changingEmail} />
          </div>

          <div className="profile-info-full">
            <label>Confirm your password</label>
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={changingEmail} />
          </div>

          <div className="profile-info-full" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn-primary" onClick={submitChangeEmail} disabled={changingEmail} style={{ maxWidth: 320 }}>
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

        <h2 className="card-section-title">Account</h2>

        <div className="profile-info-full" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            style={{
              maxWidth: 320,
              borderColor: "#dc2626",
              color: "#dc2626",
              opacity: deletingAccount ? 0.6 : 1,
              cursor: deletingAccount ? "not-allowed" : "pointer",
            }}
          >
            {deletingAccount ? "Deleting account..." : "Delete Account"}
          </button>

          <p className="card-subtitle" style={{ maxWidth: 520, marginTop: 10 }}>
            Permanently delete your Rycus account and remove your profile access. This action cannot be undone.
          </p>

          {deleteAccountMsg && (
            <div className="profile-save-msg" style={{ marginTop: 10 }}>
              {deleteAccountMsg}
            </div>
          )}
        </div>

        <h2 className="card-section-title">Session</h2>

        <div className="profile-info-full" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleLogout}
            style={{ maxWidth: 320, borderColor: "#dc2626", color: "#dc2626" }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;