'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import styles from './RatingForm.module.css';

interface RatingFormProps {
  consultationId: string;
  vetName: string;
  onSubmit: (rating: number, feedback?: string) => Promise<void>;
  onSkip?: () => void;
  className?: string;
}

export function RatingForm({
  consultationId: _consultationId,
  vetName,
  onSubmit,
  onSkip,
  className,
}: RatingFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(rating, feedback.trim() || undefined);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit rating:', err);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, feedback, onSubmit]);

  // Show success state
  if (isSubmitted) {
    return (
      <div className={cn(styles.container, styles.success, className)}>
        <div className={styles.successIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className={styles.successTitle}>Thank you!</h2>
        <p className={styles.successText}>Your feedback helps us improve our service.</p>
      </div>
    );
  }

  return (
    <div className={cn(styles.container, className)}>
      <h2 className={styles.title}>How was your consultation?</h2>
      <p className={styles.subtitle}>Rate your experience with Dr. {vetName}</p>

      {/* Star Rating */}
      <div className={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={cn(
              styles.starButton,
              (hoveredRating >= star || rating >= star) && styles.starActive
            )}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill={hoveredRating >= star || rating >= star ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>

      {/* Rating labels */}
      <p className={styles.ratingLabel}>
        {rating === 0 && 'Tap to rate'}
        {rating === 1 && 'Poor'}
        {rating === 2 && 'Fair'}
        {rating === 3 && 'Good'}
        {rating === 4 && 'Very Good'}
        {rating === 5 && 'Excellent'}
      </p>

      {/* Feedback textarea (shown after rating) */}
      {rating > 0 && (
        <div className={styles.feedbackContainer}>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your experience (optional)"
            rows={3}
            maxLength={500}
          />
          <p className={styles.charCount}>{feedback.length}/500</p>
        </div>
      )}

      {/* Error message */}
      {error && <p className={styles.error}>{error}</p>}

      {/* Actions */}
      <div className={styles.actions}>
        {onSkip && (
          <Button variant="ghost" onClick={onSkip} disabled={isSubmitting}>
            Skip
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={rating === 0 || isSubmitting}
        >
          Submit Rating
        </Button>
      </div>
    </div>
  );
}
