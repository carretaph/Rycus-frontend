import React from "react";
import { Link } from "react-router-dom";
import rycusLogo from "./assets/rycus-logo-full.png";

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <section className="home-hero">
        {/* LOGO */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <img
            src={rycusLogo}
            alt="Rycus"
            style={{
              width: 240,
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* BADGE */}
        <div className="home-hero-badge">RATE YOUR CUSTOMER US</div>

        {/* TITLE */}
        <h1 className="home-title">Know your customers before you say yes.</h1>

        {/* DESCRIPTION */}
        <p className="home-subtitle">
          Rycus helps sales reps, contractors, suppliers and businesses share
          real payment and behavior reviews about their customers, so you can
          decide who truly deserves your time and credit.
        </p>

        {/* BUTTONS */}
        <div className="home-buttons">
          <Link to="/login" className="home-button home-button-primary">
            Sign in
          </Link>

          <Link to="/register" className="home-button home-button-secondary">
            Create free account
          </Link>
        </div>

        {/* LINKS */}
        <p className="home-note">
          Or go to your <Link to="/customers">customer list</Link> or{" "}
          <Link to="/customers/new">add a new customer</Link>.
        </p>
      </section>

      {/* LEGAL DISCLAIMER */}
      <section className="home-legal">
        <h3>Legal Disclaimer</h3>

        <p>
          The information available on Rycus is accessible only to registered
          members and is not public. All reviews and comments are submitted
          voluntarily by users for the sole purpose of helping businesses, sales
          representatives, contractors, suppliers, and other professionals
          evaluate customers based on real payment and behavior experiences.
        </p>

        <p>
          Rycus exists to protect businesses, improve decision-making, and
          promote transparency — not to defame or harm any individual. Rycus and
          its owners are not responsible for the accuracy, content, opinions, or
          statements provided by users, as all reviews reflect the personal
          experience and viewpoint of the member who submitted them.
        </p>

        <p>
          By using this platform, you agree to use all information responsibly
          and in compliance with applicable laws.
        </p>

        {/* LEGAL LINKS */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "center",
            gap: 18,
            flexWrap: "wrap",
            fontSize: 14,
          }}
        >
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Use</Link>
          <Link to="/support">Support</Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;