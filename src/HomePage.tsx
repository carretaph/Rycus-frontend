import React from "react";
import { Link } from "react-router-dom";

const HomePage: React.FC = () => {
  return (
    <div className="home-container">
      <p className="home-badge">
        First private customer review database for contractors & sales pros
      </p>

      <h1 className="home-title">Know your customers before you say yes.</h1>

      <p className="home-subtitle">
        Rycus helps sales reps, contractors, suppliers and businesses share real
        payment and behavior reviews about their customers, so you can decide
        who truly deserves your time and credit.
      </p>

      <p className="home-price">
        For only <strong>$0.99 per month</strong>, get access to the first
        customer review database built exclusively for contractors, sales
        professionals, suppliers, and businesses.
      </p>

      <div className="home-buttons">
        <Link to="/login" className="home-button home-button-primary">
          Sign in
        </Link>
        <Link to="/register" className="home-button home-button-secondary">
          Create account
        </Link>
      </div>

      <p className="home-note">
        Once you are signed in, you will be able to search customers, see their
        reviews, and leave new reviews based on your own experience.
      </p>

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
