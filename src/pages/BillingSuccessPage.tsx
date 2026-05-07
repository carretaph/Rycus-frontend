import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const BillingSuccessPage: React.FC = () => {
  const nav = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    const openApp = () => {
      // 🔥 intenta abrir la app
      window.location.href = "rycus://billing/success";
    };

    const run = async () => {
      try {
        const res = await axiosClient.get("/billing/status");

        const hasAccess =
          typeof res.data?.hasAccess === "boolean"
            ? res.data.hasAccess
            : typeof res.data?.active === "boolean"
            ? res.data.active
            : true;

        updateUser({ hasAccess, planType: res.data?.planType });
      } catch {
        // ignore
      }

      // 🔥 intenta abrir la app inmediatamente
      openApp();

      // 🔥 fallback: si no abre app, sigue web
      setTimeout(() => {
        nav("/dashboard", { replace: true });
      }, 1500);
    };

    run();
  }, [nav, updateUser]);

  return (
    <div className="page">
      Payment success — opening app...
      <br />
      <br />
      <button
        onClick={() => (window.location.href = "rycus://billing/success")}
        className="btn-primary"
      >
        Open Rycus App
      </button>
    </div>
  );
};

export default BillingSuccessPage;