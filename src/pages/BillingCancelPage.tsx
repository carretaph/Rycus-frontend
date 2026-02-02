import React from "react";
import { Link } from "react-router-dom";

const BillingCancelPage: React.FC = () => {
  return (
    <div className="page" style={{ maxWidth: 700, margin: "60px auto", padding: 20 }}>
      <h2>Checkout canceled</h2>
      <p>You can activate anytime to unlock full access.</p>
      <Link to="/activate">Go back to Activate</Link>
    </div>
  );
};

export default BillingCancelPage;
