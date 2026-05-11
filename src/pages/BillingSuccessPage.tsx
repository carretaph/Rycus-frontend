import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const BillingSuccessPage: React.FC = () => {
  const nav = useNavigate();
  const { updateUser } = useAuth();

  const [message, setMessage] = useState("Activating your account...");

  const alreadyRanRef = useRef(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (alreadyRanRef.current) return;
    alreadyRanRef.current = true;

    let cancelled = false;
    const isNativeApp = Capacitor.getPlatform() !== "web";

    console.log("✅ BillingSuccessPage loaded. Platform:", Capacitor.getPlatform());

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const userHasAccess = (data: any) => {
      return (
        data?.hasAccess === true ||
        data?.active === true ||
        data?.subscriptionStatus === "active" ||
        data?.subscriptionStatus === "trialing" ||
        data?.planType === "FREE_LIFETIME" ||
        String(data?.planType || "").toLowerCase() === "owner"
      );
    };

    const finishAndEnterApp = (fresh: any) => {
      if (finishedRef.current) return;
      finishedRef.current = true;

      updateUser({
        ...fresh,
        hasAccess: true,
      });

      setMessage("Account activated. Opening Rycus...");

      setTimeout(() => {
        if (!cancelled) {
          nav("/home", { replace: true });
        }
      }, 800);
    };

    const activate = async () => {
      if (!isNativeApp) {
        window.location.href = "rycus://billing/success";
        return;
      }

      for (let i = 0; i < 30; i++) {
        try {
          const me = await axiosClient.get("/users/me");
          const fresh = me.data;

          const hasAccess = userHasAccess(fresh);

          console.log("Billing success /users/me check:", {
            attempt: i + 1,
            hasAccess,
            subscriptionStatus: fresh?.subscriptionStatus,
            planType: fresh?.planType,
          });

          if (hasAccess) {
            if (cancelled) return;
            finishAndEnterApp(fresh);
            return;
          }
        } catch (e) {
          console.warn("Billing success /users/me check failed:", e);
        }

        try {
          const status = await axiosClient.get("/billing/status");
          const data = status.data;

          const hasAccess = userHasAccess(data);

          console.log("Billing success /billing/status check:", {
            attempt: i + 1,
            hasAccess,
            subscriptionStatus: data?.subscriptionStatus,
            planType: data?.planType,
          });

          if (hasAccess) {
            if (cancelled) return;
            finishAndEnterApp(data);
            return;
          }
        } catch (e) {
          console.warn("Billing success /billing/status check failed:", e);
        }

        if (!cancelled) {
          setMessage(`Activating your account... ${i + 1}/30`);
        }

        await sleep(1500);
      }

      if (!cancelled && !finishedRef.current) {
        setMessage(
          "Payment received. Please close and reopen the app if access does not refresh."
        );
      }
    };

    activate();

    return () => {
      cancelled = true;
    };

    // IMPORTANT: run only once. Do not add nav/updateUser dependencies here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <h1>Payment successful</h1>
      <p>{message}</p>

      {!Capacitor.isNativePlatform() && (
        <button
          className="btn-primary"
          type="button"
          onClick={() => {
            window.location.href = "rycus://billing/success";
          }}
        >
          Open Rycus App
        </button>
      )}
    </div>
  );
};

export default BillingSuccessPage;