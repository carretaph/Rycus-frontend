// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

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
  login: (userData: User, token: string) => void;
  logout: () => void;

  // local updates (for now)
  updateAvatar: (avatarUrl: string) => void;
  updateUser: (patch: Partial<User>) => void; // ✅ NEW
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("rycus_user");
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      }
    } catch (err) {
      console.error("Error parsing stored user from localStorage:", err);
      localStorage.removeItem("rycus_user");
      localStorage.removeItem("rycus_token");
      setUser(null);
    }
  }, []);

  const persistUser = (u: User | null) => {
    if (!u) {
      localStorage.removeItem("rycus_user");
      return;
    }
    localStorage.setItem("rycus_user", JSON.stringify(u));
  };

  const login = (userData: User, token: string) => {
    setUser(userData);
    persistUser(userData);
    localStorage.setItem("rycus_token", token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("rycus_user");
    localStorage.removeItem("rycus_token");
  };

  const updateAvatar = (avatarUrl: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated: User = { ...prev, avatarUrl };
      persistUser(updated);
      return updated;
    });
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated: User = { ...prev, ...patch };
      persistUser(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateAvatar, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
