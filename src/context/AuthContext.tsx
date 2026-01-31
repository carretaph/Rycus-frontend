// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import axiosClient from "../api/axiosClient";

export interface User {
  id: number;
  email: string;

  // display (tu app usa esto para "Hola X")
  name?: string;

  // profile fields
  phone?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;

  // avatar
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;

  updateAvatar: (avatarUrl: string) => void;
  updateUser: (patch: Partial<User>) => void;

  moveExtrasToNewEmail: (oldEmail: string, newEmail: string) => void;

  initializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "rycus_user";
const TOKEN_KEY = "rycus_token";

const EXTRA_KEY_PREFIX = "rycus_profile_extra_";
const LEGACY_EXTRA_KEY = "rycus_profile_extra";

type ProfileExtra = Partial<
  Pick<
    User,
    | "firstName"
    | "lastName"
    | "phone"
    | "businessName"
    | "address"
    | "city"
    | "state"
    | "zipcode"
    | "avatarUrl"
    | "name"
  >
>;

const getExtraKey = (email?: string | null) =>
  email ? `${EXTRA_KEY_PREFIX}${email.toLowerCase()}` : `${EXTRA_KEY_PREFIX}guest`;

function setAxiosAuthHeader(token: string | null) {
  if (token) {
    axiosClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axiosClient.defaults.headers.common["Authorization"];
  }
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw || raw === "undefined" || raw === "null") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ✅ string helpers
function cleanString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

// ✅ Para campos sensibles: si llega null/undefined/"" NO debe pisar.
function sanitizePatch(patch: Partial<User>): Partial<User> {
  const next: Partial<User> = { ...patch };

  if ("avatarUrl" in next) {
    const v = (next as any).avatarUrl;
    const cleaned = cleanString(v);
    if (!cleaned) delete (next as any).avatarUrl;
    else (next as any).avatarUrl = cleaned;
  }

  if ("name" in next) {
    const v = (next as any).name;
    const cleaned = cleanString(v);
    if (!cleaned) delete (next as any).name;
    else (next as any).name = cleaned;
  }

  if ("firstName" in next) {
    const cleaned = cleanString((next as any).firstName);
    if (!cleaned) delete (next as any).firstName;
    else (next as any).firstName = cleaned;
  }

  if ("lastName" in next) {
    const cleaned = cleanString((next as any).lastName);
    if (!cleaned) delete (next as any).lastName;
    else (next as any).lastName = cleaned;
  }

  return next;
}

// ✅ Merge inteligente: patch NO debe borrar valores buenos con null/empty.
function mergeUser(prev: User, patch: Partial<User>): User {
  const safe = sanitizePatch(patch);
  return { ...prev, ...safe };
}

// ✅ Construye nombre display de forma robusta
function buildDisplayName(u: Partial<User>): string | undefined {
  const fromName = cleanString((u as any).name);
  if (fromName) return fromName;

  const fn = cleanString((u as any).firstName);
  const ln = cleanString((u as any).lastName);
  const combo = [fn, ln].filter(Boolean).join(" ").trim();
  if (combo) return combo;

  // fallback: email prefix
  const email = cleanString((u as any).email);
  if (email && email.includes("@")) return email.split("@")[0];

  return undefined;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  const persistUser = (u: User | null) => {
    if (!u) {
      localStorage.removeItem(USER_KEY);
      return;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  };

  const readExtraForEmail = (email?: string | null): ProfileExtra => {
    const key = getExtraKey(email);
    return safeParse<ProfileExtra>(localStorage.getItem(key)) || {};
  };

  const persistExtraForEmail = (email: string, patch: ProfileExtra) => {
    const key = getExtraKey(email);
    const prev = safeParse<ProfileExtra>(localStorage.getItem(key)) || {};

    const safePatch = sanitizePatch(patch as Partial<User>) as ProfileExtra;

    const next = { ...prev, ...safePatch };
    localStorage.setItem(key, JSON.stringify(next));
  };

  // ✅ Migración del legacy EXTRA_KEY (global) al extra por email
  const migrateLegacyExtraIfNeeded = (email: string) => {
    try {
      const legacy = safeParse<ProfileExtra>(localStorage.getItem(LEGACY_EXTRA_KEY));
      if (!legacy) return;

      const emailKey = getExtraKey(email);
      const already = safeParse<ProfileExtra>(localStorage.getItem(emailKey));

      if (!already) {
        const safeLegacy = sanitizePatch(legacy as Partial<User>) as ProfileExtra;
        localStorage.setItem(emailKey, JSON.stringify(safeLegacy));
      }

      localStorage.removeItem(LEGACY_EXTRA_KEY);
    } catch {
      // no-op
    }
  };

  // ✅ move extras old -> new (useful after change email)
  const moveExtrasToNewEmail = (oldEmail: string, newEmail: string) => {
    try {
      const oldKey = getExtraKey(oldEmail);
      const newKey = getExtraKey(newEmail);

      const oldExtra = safeParse<ProfileExtra>(localStorage.getItem(oldKey));
      if (!oldExtra) return;

      const newExtra = safeParse<ProfileExtra>(localStorage.getItem(newKey)) || {};
      const merged = { ...oldExtra, ...newExtra };

      localStorage.setItem(newKey, JSON.stringify(merged));
      localStorage.removeItem(oldKey);
    } catch {
      // no-op
    }
  };

  // ✅ Helper: rehydrate user from backend (/users/me)
  const rehydrateUserFromBackend = async (email: string, base: User) => {
    try {
      const res = await axiosClient.get("/users/me", { params: { email } });
      const fresh = res.data as any;

      // 👇 Soporta camelCase + snake_case + name
      const fullNameCandidate =
        cleanString(fresh?.fullName) ||
        cleanString(fresh?.full_name) ||
        cleanString(fresh?.name);

      const freshFirst =
        cleanString(fresh?.firstName) || cleanString(fresh?.first_name);
      const freshLast =
        cleanString(fresh?.lastName) || cleanString(fresh?.last_name);

      // Si no viene first/last pero sí fullName, derivamos
      let derivedFirst = freshFirst;
      let derivedLast = freshLast;

      if ((!derivedFirst || !derivedLast) && fullNameCandidate) {
        const parts = fullNameCandidate.split(" ").filter(Boolean);
        if (!derivedFirst && parts.length >= 1) derivedFirst = parts[0];
        if (!derivedLast && parts.length >= 2) derivedLast = parts.slice(1).join(" ");
      }

      const patch: Partial<User> = {
        id: typeof fresh?.id === "number" ? fresh.id : base.id,
        email: cleanString(fresh?.email) ?? base.email,

        // ✅ Source of truth: use fullName if present, else keep base
        name: fullNameCandidate ?? base.name,

        // also keep first/last for UI that uses firstName
        firstName: derivedFirst ?? base.firstName,
        lastName: derivedLast ?? base.lastName,

        avatarUrl: cleanString(fresh?.avatarUrl) ?? base.avatarUrl,
        phone: cleanString(fresh?.phone) ?? base.phone,
        businessName: cleanString(fresh?.businessName) ?? base.businessName,
        city: cleanString(fresh?.city) ?? base.city,
        state: cleanString(fresh?.state) ?? base.state,
        zipcode: cleanString(fresh?.zipcode) ?? base.zipcode,
        address: cleanString(fresh?.address) ?? base.address,
      };

      // ✅ si todavía no hay name, construirlo
      if (!patch.name) {
        patch.name = buildDisplayName({ ...base, ...patch });
      }

      const updated = mergeUser(base, patch);

      setUser(updated);
      persistUser(updated);

      // persist extra for header fallback and profile fields
      if (updated.email) {
        persistExtraForEmail(updated.email, {
          avatarUrl: updated.avatarUrl,
          name: updated.name,
          firstName: updated.firstName,
          lastName: updated.lastName,
          phone: updated.phone,
          businessName: updated.businessName,
          address: updated.address,
          city: updated.city,
          state: updated.state,
          zipcode: updated.zipcode,
        });
      }
    } catch {
      // keep local storage data if backend fails
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const legacyToken = localStorage.getItem("token");
        const existing = localStorage.getItem(TOKEN_KEY);

        if (legacyToken && !existing) {
          localStorage.setItem(TOKEN_KEY, legacyToken);
          localStorage.removeItem("token");
        }

        const storedUserRaw = localStorage.getItem(USER_KEY);
        const storedToken = localStorage.getItem(TOKEN_KEY);

        const parsedUser = safeParse<User>(storedUserRaw);

        const parsedExtra = parsedUser?.email ? readExtraForEmail(parsedUser.email) : {};

        const mergedUser: User | null = parsedUser
          ? (mergeUser(parsedUser, parsedExtra ?? {}) as User)
          : null;

        // ✅ ensure name exists
        if (mergedUser && !mergedUser.name) {
          mergedUser.name = buildDisplayName(mergedUser);
        }

        if (mergedUser) setUser(mergedUser);

        if (storedToken && storedToken !== "undefined" && storedToken !== "null") {
          setToken(storedToken);
          setAxiosAuthHeader(storedToken);
        } else {
          setAxiosAuthHeader(null);
        }

        if (mergedUser) persistUser(mergedUser);

        // ✅ Rehydrate from backend if we have token + email
        if (storedToken && mergedUser?.email) {
          await rehydrateUserFromBackend(mergedUser.email, mergedUser);
        }
      } catch (err) {
        console.error("Error parsing auth from localStorage:", err);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
        setAxiosAuthHeader(null);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = (userData: User, newToken: string) => {
    const base: User = {
      ...userData,
      // ✅ garantizamos que name no quede vacío
      name: buildDisplayName(userData),
    };

    if (base?.email) {
      migrateLegacyExtraIfNeeded(base.email);
    }

    const extra = base?.email ? readExtraForEmail(base.email) : {};
    const merged: User = mergeUser(base, extra);

    // ✅ si aún queda sin name, construye fallback final
    if (!merged.name) merged.name = buildDisplayName(merged);

    setUser(merged);
    setToken(newToken);
    persistUser(merged);

    localStorage.setItem(TOKEN_KEY, newToken);
    setAxiosAuthHeader(newToken);

    // ✅ Best-effort rehydrate from backend so header/avatar/name are fresh
    if (merged?.email) {
      void rehydrateUserFromBackend(merged.email, merged);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("token");
    setAxiosAuthHeader(null);
  };

  const updateAvatar = (avatarUrl: string) => {
    const cleaned = cleanString(avatarUrl);
    if (!cleaned) return;

    setUser((prev) => {
      if (!prev) return prev;

      const updated: User = { ...prev, avatarUrl: cleaned };
      persistUser(updated);

      if (prev.email) {
        persistExtraForEmail(prev.email, { avatarUrl: cleaned });
      }

      return updated;
    });
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;

      const updated: User = mergeUser(prev, patch);

      // ✅ si name quedó vacío, intenta reconstruirlo
      if (!updated.name) updated.name = buildDisplayName(updated);

      persistUser(updated);

      if (prev.email) {
        persistExtraForEmail(prev.email, patch as ProfileExtra);
      }

      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateAvatar,
        updateUser,
        moveExtrasToNewEmail,
        initializing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
