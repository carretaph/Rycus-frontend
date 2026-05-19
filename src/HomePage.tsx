import React from "react";
import { Link } from "react-router-dom";
import rycusLogo from "./assets/rycus-logo-full.png";
import rycusHeroCover from "./assets/rycus-hero-cover.png";

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-logo-wrap">
          <img src={rycusLogo} alt="Rycus" className="home-logo" />
        </div>

        <div className="home-hero-badge">
          PROFESSIONAL REFERRAL NETWORK
        </div>

        <img
          src={rycusHeroCover}
          alt="Rycus professional network"
          className="home-hero-image"
        />

        <h1 className="home-title">
          Trusted Connections.
          <br />
          Real Opportunities.
        </h1>

        <p className="home-subtitle">
          Rycus is the professional network for contractors, sales
          professionals and local service providers to connect, generate
          referrals, share trusted experiences and grow their business.
        </p>

        <div className="home-buttons">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noreferrer"
            className="home-button home-button-primary"
          >
            Download on the App Store
          </a>

          <Link to="/register" className="home-button home-button-secondary">
            Join the Network
          </Link>
        </div>

        <p className="home-note">
          Already a member? <Link to="/login">Sign in here</Link>
        </p>
      </section>

      <section className="home-section">
        <h2>Built for professionals who work with real customers.</h2>

        <p>
          Whether you sell windows, install roofs, paint homes, close real
          estate deals or provide local services, your network can become one of
          your strongest sources of income.
        </p>

        <div className="home-grid">
          <div className="home-card">
            <h3>Find Trusted Professionals</h3>
            <p>
              Need a painter in Clermont, a plumber in Melbourne or a handyman
              near Winter Garden? Build real local connections.
            </p>
          </div>

          <div className="home-card">
            <h3>Generate Referrals</h3>
            <p>
              Exchange referrals with other professionals and create new
              business opportunities through trusted relationships.
            </p>
          </div>

          <div className="home-card">
            <h3>Protect Your Business</h3>
            <p>
              Read and share real experiences so you can make better decisions
              before taking on customers or projects.
            </p>
          </div>

          <div className="home-card">
            <h3>Grow Your Network</h3>
            <p>
              Connect with contractors, sales reps, suppliers and local service
              providers across Central Florida and beyond.
            </p>
          </div>
        </div>
      </section>

      <section className="home-section home-how">
        <h2>How Rycus Works</h2>

        <div className="home-steps">
          <div>
            <span>1</span>
            <h3>Create Your Profile</h3>
            <p>Show who you are, where you work and what services you offer.</p>
          </div>

          <div>
            <span>2</span>
            <h3>Connect</h3>
            <p>Build relationships with trusted professionals in your market.</p>
          </div>

          <div>
            <span>3</span>
            <h3>Refer</h3>
            <p>Send and receive business opportunities through your network.</p>
          </div>

          <div>
            <span>4</span>
            <h3>Grow</h3>
            <p>Turn trusted connections into long-term business relationships.</p>
          </div>
        </div>
      </section>

      <section className="home-cta">
        <h2>Your network is your income.</h2>

        <p>
          Join a growing professional community focused on trust, referrals and
          real business relationships.
        </p>

        <div className="home-buttons">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noreferrer"
            className="home-button home-button-primary"
          >
            Download on the App Store
          </a>

          <Link to="/register" className="home-button home-button-secondary">
            Create Free Account
          </Link>
        </div>
      </section>

      <section className="home-legal">
        <h3>Legal Disclaimer</h3>

        <p>
          The information available on Rycus is accessible only to registered
          members and is not public. Reviews and comments are submitted
          voluntarily by users to help professionals evaluate customers,
          businesses and working relationships based on real experiences.
        </p>

        <p>
          Rycus exists to protect businesses, improve decision-making and
          promote transparency — not to defame or harm any individual.
        </p>

        <div className="home-legal-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Use</Link>
          <Link to="/support">Support</Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;