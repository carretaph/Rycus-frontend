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

  // display
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

  // local updates
  updateAvatar: (avatarUrl: string) => void;
  updateUser: (patch: Partial<User>) => void;

  initializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "rycus_user";
const TOKEN_KEY = "rycus_token";

// ✅ extra POR EMAIL (evita mezclar usuarios)
const EXTRA_KEY_PREFIX = "rycus_profile_extra_";

// 🔻 legacy global (migración)
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
  email
    ? `${EXTRA_KEY_PREFIX}${email.toLowerCase()}`
    : `${EXTRA_KEY_PREFIX}guest`;

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
// (muy común que el backend mande avatarUrl:null)
function sanitizePatch(patch: Partial<User>): Partial<User> {
  const next: Partial<User> = { ...patch };

  // Si viene null/undefined/"" => lo quitamos para que NO sobrescriba
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

  // (opcional) también puedes blindar businessName si quieres
  // if ("businessName" in next) { ... }

  return next;
}

// ✅ Merge inteligente: patch NO debe borrar valores buenos con null/empty.
function mergeUser(prev: User, patch: Partial<User>): User {
  const safe = sanitizePatch(patch);
  return { ...prev, ...safe };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
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

    // ✅ NO guardamos null/undefined/"" para avatarUrl/name
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
        // también sanitizamos por si legacy tenía basura
        const safeLegacy = sanitizePatch(legacy as Partial<User>) as ProfileExtra;
        localStorage.setItem(emailKey, JSON.stringify(safeLegacy));
      }

      localStorage.removeItem(LEGACY_EXTRA_KEY);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    try {
      const storedUserRaw = localStorage.getItem(USER_KEY);
      const storedToken = localStorage.getItem(TOKEN_KEY);

      const parsedUser = safeParse<User>(storedUserRaw);

      // ✅ Leer extra SOLO del email del usuario
      const parsedExtra = parsedUser?.email
        ? readExtraForEmail(parsedUser.email)
        : {};

      // ✅ merge: si extra tiene avatarUrl bueno, NO lo pises con null del user
      // (y viceversa, si user tiene algo bueno, también sirve)
      const mergedUser: User | null = parsedUser
        ? (mergeUser(parsedUser, parsedExtra ?? {}) as User)
        : null;

      if (mergedUser) setUser(mergedUser);

      if (storedToken && storedToken !== "undefined" && storedToken !== "null") {
        setToken(storedToken);
        setAxiosAuthHeader(storedToken);
      } else {
        setAxiosAuthHeader(null);
      }

      if (mergedUser) persistUser(mergedUser);
    } catch (err) {
      console.error("Error parsing auth from localStorage:", err);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
      setAxiosAuthHeader(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  const login = (userData: User, newToken: string) => {
    if (userData?.email) {
      migrateLegacyExtraIfNeeded(userData.email);
    }

    const extra = userData?.email ? readExtraForEmail(userData.email) : {};

    // ✅ merge seguro (extra no borra con null/empty)
    const merged: User = mergeUser(userData, extra);

    setUser(merged);
    setToken(newToken);
    persistUser(merged);
    localStorage.setItem(TOKEN_KEY, newToken);

    setAxiosAuthHeader(newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
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
      persistUser(updated);

      if (prev.email) {
        // guardamos patch sanitizado en extra
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
