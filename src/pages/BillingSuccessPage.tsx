import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const BillingSuccessPage: React.FC = () => {
  const nav = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    (async () => {
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
      } finally {
        nav("/dashboard", { replace: true });
      }
    })();
  }, [nav, updateUser]);

  return <div className="page">Payment success — redirecting…</div>;
};

export default BillingSuccessPage;
