import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Button, Card, Avatar, StarRating, Modal, Input, Textarea } from '../../components/ui';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', rating: 5, text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadReviews = () => {
    setLoading(true);
    api.get('/reviews')
      .then((data) => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const publishedReviews = reviews.filter((r) => r.status === 'published');
  const totalPublished = publishedReviews.length;

  const meanRating = totalPublished > 0
    ? (publishedReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / totalPublished).toFixed(1)
    : '0.0';

  const starCounts = [5, 4, 3, 2, 1].map((star) => {
    const count = publishedReviews.filter((r) => Math.round(Number(r.rating)) === star).length;
    const percent = totalPublished > 0 ? (count / totalPublished) * 100 : 0;
    return { star, count, percent };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Please enter your name.');
      return;
    }
    if (!form.text.trim()) {
      setFormError('Please write a review.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/reviews/public', {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        rating: Number(form.rating),
        text: form.text.trim()
      });
      setOpenModal(false);
      setForm({ name: '', phone: '', rating: 5, text: '' });
      setSuccessMsg('Thank you! Your review will appear after moderation.');
    } catch (err) {
      setFormError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">Patient Reviews</h1>
          <p className="text-sm text-muted-foreground">
            See what our patients say about their experience at SmileCraft Dental Clinic.
          </p>
        </div>
        <Button onClick={() => setOpenModal(true)}>Leave a Review</Button>
      </div>

      {/* SUCCESS BANNER FOR SUBMITTED REVIEWS */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-lg flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Card with Stats */}
      <Card className="p-6">
        <div className="grid gap-6 md:grid-cols-2 items-center">
          <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-border/60">
            <span className="text-4xl md:text-5xl font-extrabold text-foreground">{meanRating}</span>
            <div className="my-2">
              <StarRating value={Math.round(Number(meanRating))} />
            </div>
            <p className="text-sm text-muted-foreground">{totalPublished} reviews</p>
          </div>

          <div className="space-y-2 px-2">
            {starCounts.map(({ star, count, percent }) => (
              <div key={star} className="flex items-center gap-3 text-xs md:text-sm">
                <span className="w-12 font-medium">{star} stars</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading reviews...</div>
        ) : publishedReviews.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">No reviews yet. Be the first to leave one!</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {publishedReviews.map((rev) => (
              <Card key={rev.id} className="p-6 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={rev.name} />
                      <div>
                        <h3 className="font-semibold text-sm">{rev.name}</h3>
                        <p className="text-xs text-muted-foreground">{formatDate(rev.date)}</p>
                      </div>
                    </div>
                    <StarRating value={rev.rating} />
                  </div>
                  <p className="text-sm text-muted-foreground pt-1 italic">"{rev.text}"</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal to leave a review */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Leave a Patient Review"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-sm text-red-600 font-medium">{formError}</p>}
          <div className="space-y-1">
            <label className="text-sm font-medium">Your Rating</label>
            <div className="pt-1">
              <StarRating
                value={form.rating}
                onChange={(val) => setForm({ ...form, rating: val })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Name *</label>
            <Input
              type="text"
              placeholder="Your full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Phone Number (Optional)</label>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Your Review *</label>
            <Textarea
              placeholder="Tell us about your experience..."
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={4}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
