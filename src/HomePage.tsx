import React from "react";
import { Link } from "react-router-dom";

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      {/* HERO CARD */}
      <div className="home-hero">
        <div className="home-hero-badge">RATE YOUR CUSTOMER US</div>

        <h1 className="home-title">Know your customers before you say yes.</h1>

        <p className="home-subtitle">
          Rycus helps sales reps, contractors, suppliers and businesses share real
          payment and behavior reviews about their customers, so you can decide
          who truly deserves your time and credit.
        </p>

        <div className="home-buttons">
          <Link to="/login" className="home-button home-button-primary">
            Sign in
          </Link>
          <Link to="/register" className="home-button home-button-secondary">
            Create free account
          </Link>
        </div>

        <p className="home-note">
          Or go to your <Link to="/customers">customer list</Link> or{" "}
          <Link to="/customers/new">add a new customer</Link>.
        </p>
      </div>

      {/* DISCLAIMER BELOW */}
      <div className="home-legal">
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
      </div>
    </div>
  );
};

export default HomePage;
