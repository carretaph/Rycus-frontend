// src/pages/CustomerReviewsPage.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

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
}

const STAR_VALUES = [1, 2, 3, 4, 5];

const CustomerReviewsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const customerId = id;
  const { user } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ratings
  const [ratingOverall, setRatingOverall] = useState<number>(0);
  const [ratingPayment, setRatingPayment] = useState<number>(0);
  const [ratingBehavior, setRatingBehavior] = useState<number>(0);
  const [ratingCommunication, setRatingCommunication] =
    useState<number>(0);
  const [comment, setComment] = useState<string>("");

  // Mostrar / ocultar formulario
  const [showForm, setShowForm] = useState<boolean>(true);

  // Checkbox “make my name public”
  const [makeNamePublic, setMakeNamePublic] = useState<boolean>(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId) return;

      try {
        setLoading(true);
        setError(null);

        const [customerRes, reviewsRes] = await Promise.all([
          axios.get(`/customers/${customerId}`),
          axios.get(`/customers/${customerId}/reviews`),
        ]);

        setCustomer(customerRes.data);
        setReviews(reviewsRes.data || []);

        // Si ya hay reviews, por defecto NO mostramos el formulario
        if (reviewsRes.data && reviewsRes.data.length > 0) {
          setShowForm(false);
        } else {
          setShowForm(true);
        }
      } catch (err) {
        console.error("Error loading customer or reviews", err);
        setError("Error loading customer or reviews.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId]);

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

    const reviewData: any = {
      ratingOverall,
      ratingPayment,
      ratingBehavior,
      ratingCommunication,
      comment,
    };

    // Si el usuario marcó "Make my name public"
    if (makeNamePublic && user) {
      reviewData.createdBy = user.name || user.email;
      reviewData.userEmail = user.email; // para que el backend lo vincule
    }

    try {
      const response = await axios.post(
        `/customers/${customerId}/reviews`,
        reviewData
      );
      const newReview: Review = response.data;

      setReviews((prev) => [newReview, ...prev]);

      // reset
      setRatingOverall(0);
      setRatingPayment(0);
      setRatingBehavior(0);
      setRatingCommunication(0);
      setComment("");
      setMakeNamePublic(false);
      setShowForm(false); // después de enviar, esconder el form otra vez
    } catch (err) {
      console.error("Error creating review", err);
      setSubmitError("Error creating review. Please try again.");
    }
  };

  const renderStarSelector = (
    value: number,
    setter: (v: number) => void
  ) => (
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

  // Estrellas en los reviews de abajo
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

  // Dirección completa
  const locationParts = [
    customer.address,
    customer.city,
    customer.state,
    customer.zipCode,
  ].filter(Boolean);

  const extraInfoParts = [customer.customerType, customer.tags].filter(
    Boolean
  );

  return (
    <div className="customer-page">
      <div className="card">
        {/* HEADER DEL CLIENTE */}
        <h1 className="card-title">{displayName}</h1>

        <p className="card-subtitle">
          {locationParts.length > 0
            ? locationParts.join(", ")
            : "Location not specified"}
          {extraInfoParts.length > 0 && <> • {extraInfoParts.join(" • ")}</>}
        </p>

        {/* BOTÓN PARA CREAR NUEVO REVIEW */}
        {reviews.length > 0 && !showForm && (
          <div style={{ marginTop: 24, marginBottom: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowForm(true)}
            >
              + Create new review
            </button>
          </div>
        )}

        {/* FORMULARIO PARA NUEVO REVIEW */}
        {showForm && (
          <>
            <h3 style={{ marginTop: 24, marginBottom: 8 }}>Leave a review</h3>

            <form onSubmit={handleReviewSubmit}>
              <div className="form-grid">
                {/* Overall Experience */}
                <div>
                  <label>Overall Experience</label>
                  {renderStarSelector(ratingOverall, setRatingOverall)}
                </div>

                {/* Payment Reliability */}
                <div>
                  <label>Payment Reliability</label>
                  {renderStarSelector(ratingPayment, setRatingPayment)}
                </div>

                {/* Professional Behavior */}
                <div>
                  <label>Professional Behavior</label>
                  {renderStarSelector(ratingBehavior, setRatingBehavior)}
                </div>

                {/* Communication */}
                <div>
                  <label>Communication</label>
                  {renderStarSelector(
                    ratingCommunication,
                    setRatingCommunication
                  )}
                </div>

                {/* Comment – ocupa toda la fila */}
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

                {/* Checkbox – también fila completa, debajo del comment */}
                <div className="form-grid-full">
                  <label className="public-toggle">
                    <input
                      type="checkbox"
                      checked={makeNamePublic}
                      onChange={(e) =>
                        setMakeNamePublic(e.target.checked)
                      }
                    />
                    <span>Make my name public on this review</span>
                  </label>
                </div>
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

        {/* LISTA DE REVIEWS */}
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
