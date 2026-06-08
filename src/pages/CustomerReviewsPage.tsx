// src/pages/CustomerReviewsPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { industries } from "../assets/industriesList";

interface Customer {
  id: number;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  customerType?: string;
  tags?: string;
}

interface Review {
  id: number;
  ratingOverall: number;
  ratingPayment: number;
  ratingBehavior: number;
  ratingCommunication: number;
  comment: string;
  createdAt?: string;
  createdBy?: string;

  outcome?: string | null;
  serviceQuoted?: string | null;
  reasonNotSold?: string | null;
}

const STAR_VALUES = [1, 2, 3, 4, 5];

const EXTRA_KEY = "rycus_profile_extra";

interface ProfileExtra {
  firstName?: string;
  lastName?: string;
}

const formatOutcome = (value?: string | null) => {
  switch (value) {
    case "SOLD":
      return "Sold";
    case "NOT_SOLD":
      return "Not Sold";
    case "NO_SHOW":
      return "No Show";
    case "CANCELLED":
      return "Cancelled";
    case "RESCHEDULED":
      return "Rescheduled";
    case "BAD_LEAD":
      return "Bad Lead";
    case "STILL_THINKING":
      return "Still Thinking";
    default:
      return "";
  }
};

const formatReasonNotSold = (value?: string | null) => {
  switch (value) {
    case "PRICE":
      return "Price";
    case "NEEDED_SPOUSE":
      return "Needed Spouse";
    case "CREDIT_ISSUE":
      return "Credit Issue";
    case "JUST_SHOPPING":
      return "Just Shopping";
    case "NOT_READY":
      return "Not Ready";
    case "WENT_WITH_ANOTHER_COMPANY":
      return "Went With Another Company";
    case "OTHER":
      return "Other";
    default:
      return "";
  }
};

const getIndustryLabel = (value?: string | null) => {
  if (!value) return "";
  const found = industries.find((ind) => ind.value === value);
  return found?.label || value;
};

const CustomerReviewsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const customerId = id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ratingOverall, setRatingOverall] = useState<number>(0);
  const [ratingPayment, setRatingPayment] = useState<number>(0);
  const [ratingBehavior, setRatingBehavior] = useState<number>(0);
  const [ratingCommunication, setRatingCommunication] = useState<number>(0);
  const [comment, setComment] = useState<string>("");

  const [outcome, setOutcome] = useState<string>("");
  const [serviceQuoted, setServiceQuoted] = useState<string>("");
  const [reasonNotSold, setReasonNotSold] = useState<string>("");

  const [showForm, setShowForm] = useState<boolean>(false);
  const [makeNamePublic, setMakeNamePublic] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profileFullName, setProfileFullName] = useState<string | null>(null);
  const [publicName, setPublicName] = useState<string>("");

  const userEmail = (user?.email || "").trim();

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId) return;

      try {
        setLoading(true);
        setError(null);

        if (!userEmail) {
          setError("Missing user session. Please login again.");
          setCustomer(null);
          setReviews([]);
          return;
        }

        const [customerRes, reviewsRes] = await Promise.all([
          axios.get(`/customers/${customerId}`, {
            params: { userEmail },
          }),
          axios.get(`/customers/${customerId}/reviews`),
        ]);

        const loadedReviews = Array.isArray(reviewsRes.data)
          ? reviewsRes.data
          : [];

        setCustomer(customerRes.data);
        setReviews(loadedReviews);
        setShowForm(loadedReviews.length === 0);
      } catch (err: any) {
        console.error("Error loading customer or reviews", err);

        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Error loading customer or reviews.";

        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, userEmail]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EXTRA_KEY);
      if (stored && stored !== "undefined" && stored !== "null") {
        const parsed = JSON.parse(stored) as ProfileExtra;
        const full = [parsed.firstName, parsed.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        if (full) {
          setProfileFullName(full);
        }
      }
    } catch (err) {
      console.error("Error reading profile extra in reviews page:", err);
    }
  }, []);

  useEffect(() => {
    if (makeNamePublic) {
      const fromUserName = ((user as any)?.name || "").trim();
      const initial = profileFullName || fromUserName || "";
      setPublicName(initial);
    } else {
      setPublicName("");
    }
  }, [makeNamePublic, profileFullName, (user as any)?.name]);

  useEffect(() => {
    if (outcome !== "NOT_SOLD") {
      setReasonNotSold("");
    }
  }, [outcome]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;

    setSubmitError(null);

    if (
      ratingOverall === 0 ||
      ratingPayment === 0 ||
      ratingBehavior === 0 ||
      ratingCommunication === 0
    ) {
      setSubmitError(
        "Please select stars for Overall, Payment, Behavior and Communication."
      );
      return;
    }

    if (!outcome) {
      setSubmitError("Please select an outcome.");
      return;
    }

    if (!serviceQuoted) {
      setSubmitError("Please select an industry/service.");
      return;
    }

    if (outcome === "NOT_SOLD" && !reasonNotSold) {
      setSubmitError("Please select a reason not sold.");
      return;
    }

    const reviewData: any = {
      ratingOverall,
      ratingPayment,
      ratingBehavior,
      ratingCommunication,
      comment,
      outcome,
      serviceQuoted,
      reasonNotSold: outcome === "NOT_SOLD" ? reasonNotSold : null,
    };

    if (userEmail) {
      reviewData.userEmail = userEmail;
    } else {
      setSubmitError("Missing user session. Please login again.");
      return;
    }

    if (makeNamePublic) {
      const nameToUse = publicName.trim();

      if (!nameToUse) {
        setSubmitError(
          "Please enter the name you want to display on this review."
        );
        return;
      }

      reviewData.createdBy = nameToUse;
    } else {
      reviewData.createdBy = "Anonymous reviewer";
    }

    try {
      const response = await axios.post(
        `/customers/${customerId}/reviews`,
        reviewData
      );

      const newReview: Review = response.data;

      setReviews((prev) => [newReview, ...prev]);

      setRatingOverall(0);
      setRatingPayment(0);
      setRatingBehavior(0);
      setRatingCommunication(0);
      setComment("");
      setOutcome("");
      setServiceQuoted("");
      setReasonNotSold("");
      setMakeNamePublic(false);
      setShowForm(false);
    } catch (err: any) {
      console.error("Error creating review", err);

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Error creating review. Please try again.";

      setSubmitError(msg);
    }
  };

  const renderStarSelector = (value: number, setter: (v: number) => void) => (
    <div className="stars-input">
      {STAR_VALUES.map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? "star star-selected" : "star"}
          onClick={() => setter(star)}
        >
          ★
        </button>
      ))}

      <span className="star-value">
        {value === 0 ? "Select" : `${value}/5`}
      </span>
    </div>
  );

  const renderStars = (value: number) => {
    return (
      <span className="review-stars">
        {STAR_VALUES.map((star) => (
          <span key={star}>{star <= value ? "★" : "☆"}</span>
        ))}{" "}
        <span style={{ fontSize: 12 }}>({value}/5)</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="customer-page">
        <div className="card">
          <p>Loading customer and reviews...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="customer-page">
        <div className="card">
          <p>{error || "Customer not found."}</p>
        </div>
      </div>
    );
  }

  const displayName = customer.fullName || "Customer";

  const locationParts = [
    customer.address,
    customer.city,
    customer.state,
    customer.zipCode,
  ].filter(Boolean);

  const extraInfoParts = [customer.customerType, customer.tags].filter(Boolean);

  return (
    <div className="customer-page">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            marginBottom: 12,
          }}
        >
          <div>
            <h1 className="card-title" style={{ marginBottom: 4 }}>
              {displayName}
            </h1>

            <p className="card-subtitle">
              {locationParts.length > 0
                ? locationParts.join(", ")
                : "Location not specified"}
              {extraInfoParts.length > 0 && (
                <> • {extraInfoParts.join(" • ")}</>
              )}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: "150px",
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(`/customers/${customer.id}/edit`)}
            >
              Edit customer
            </button>

            {reviews.length > 0 && !showForm && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(true)}
              >
                + Create new review
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <>
            <h3 style={{ marginTop: 24, marginBottom: 8 }}>Leave a review</h3>

            <form onSubmit={handleReviewSubmit}>
              <div className="form-grid">
                <div>
                  <label>Overall Experience</label>
                  {renderStarSelector(ratingOverall, setRatingOverall)}
                </div>

                <div>
                  <label>Payment Reliability</label>
                  {renderStarSelector(ratingPayment, setRatingPayment)}
                </div>

                <div>
                  <label>Professional Behavior</label>
                  {renderStarSelector(ratingBehavior, setRatingBehavior)}
                </div>

                <div>
                  <label>Communication</label>
                  {renderStarSelector(
                    ratingCommunication,
                    setRatingCommunication
                  )}
                </div>

                <div>
                  <label>Outcome</label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    required
                  >
                    <option value="">Select outcome</option>
                    <option value="SOLD">Sold</option>
                    <option value="NOT_SOLD">Not Sold</option>
                    <option value="NO_SHOW">No Show</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="RESCHEDULED">Rescheduled</option>
                    <option value="BAD_LEAD">Bad Lead</option>
                    <option value="STILL_THINKING">Still Thinking</option>
                  </select>
                </div>

                <div>
                  <label>Industry / Service</label>
                  <select
                    value={serviceQuoted}
                    onChange={(e) => setServiceQuoted(e.target.value)}
                    required
                  >
                    <option value="">Select industry</option>
                    {industries.map((ind) => (
                      <option key={ind.value} value={ind.value}>
                        {ind.label}
                      </option>
                    ))}
                  </select>
                </div>

                {outcome === "NOT_SOLD" && (
                  <div className="form-grid-full">
                    <label>Reason Not Sold</label>
                    <select
                      value={reasonNotSold}
                      onChange={(e) => setReasonNotSold(e.target.value)}
                      required
                    >
                      <option value="">Select reason</option>
                      <option value="PRICE">Price</option>
                      <option value="NEEDED_SPOUSE">Needed Spouse</option>
                      <option value="CREDIT_ISSUE">Credit Issue</option>
                      <option value="JUST_SHOPPING">Just Shopping</option>
                      <option value="NOT_READY">Not Ready</option>
                      <option value="WENT_WITH_ANOTHER_COMPANY">
                        Went With Another Company
                      </option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                )}

                <div className="form-grid-full">
                  <label htmlFor="comment">Comment</label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid-full">
                  <label className="public-toggle">
                    <input
                      type="checkbox"
                      checked={makeNamePublic}
                      onChange={(e) => setMakeNamePublic(e.target.checked)}
                    />
                    <span>Make my name public on this review</span>
                  </label>
                </div>

                {makeNamePublic && (
                  <div className="form-grid-full">
                    <label htmlFor="publicName">
                      Name to display on this review
                    </label>
                    <input
                      id="publicName"
                      type="text"
                      value={publicName}
                      onChange={(e) => setPublicName(e.target.value)}
                      placeholder="Example: Diego Perez"
                    />
                  </div>
                )}
              </div>

              {submitError && (
                <p style={{ color: "red", marginTop: 8 }}>{submitError}</p>
              )}

              <button
                type="submit"
                className="btn-primary"
                style={{ marginTop: 12 }}
              >
                Submit review
              </button>
            </form>
          </>
        )}

        <h3 style={{ marginTop: 24, marginBottom: 8 }}>Reviews</h3>

        {reviews.length === 0 ? (
          <p>No reviews yet. Be the first to leave one.</p>
        ) : (
          <div className="reviews-list">
            {reviews.map((rev) => (
              <div key={rev.id} className="review-item">
                <div className="review-header">
                  <div>
                    {rev.createdAt && (
                      <span>
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    )}
                    {rev.createdBy && <span> • {rev.createdBy}</span>}
                  </div>
                </div>

                <div className="review-ratings">
                  <div>Overall: {renderStars(rev.ratingOverall)}</div>
                  <div>Payment: {renderStars(rev.ratingPayment)}</div>
                  <div>Behavior: {renderStars(rev.ratingBehavior)}</div>
                  <div>
                    Communication: {renderStars(rev.ratingCommunication)}
                  </div>
                </div>

                {(rev.outcome || rev.serviceQuoted || rev.reasonNotSold) && (
                  <div
                    style={{
                      marginTop: 10,
                      marginBottom: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      fontSize: 14,
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    {rev.outcome && (
                      <div>
                        <strong>Outcome:</strong> {formatOutcome(rev.outcome)}
                      </div>
                    )}

                    {rev.serviceQuoted && (
                      <div>
                        <strong>Industry / Service:</strong>{" "}
                        {getIndustryLabel(rev.serviceQuoted)}
                      </div>
                    )}

                    {rev.reasonNotSold && (
                      <div>
                        <strong>Reason Not Sold:</strong>{" "}
                        {formatReasonNotSold(rev.reasonNotSold)}
                      </div>
                    )}
                  </div>
                )}

                <div className="review-comment">{rev.comment}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerReviewsPage;