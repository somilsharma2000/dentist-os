import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Textarea,
  Modal,
  PageHeader,
  StatCard,
  Avatar,
  StarRating,
  EmptyState,
  statusVariant
} from '../../components/ui';
import { formatDate } from '../../lib/utils';
import { Star, Trash2 } from 'lucide-react';

export default function ReviewsAdmin() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All sources');

  // Modal state for responding to a review
  const [selectedReview, setSelectedReview] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await api.get('/reviews');
      setReviews(data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handlePublish = async (review) => {
    try {
      await api.put(`/reviews/${review.id}`, { status: 'published' });
      fetchReviews();
    } catch (err) {
      console.error('Error publishing review:', err);
    }
  };

  const handleOpenRespondModal = (review) => {
    setSelectedReview(review);
    setResponseText(review.response || '');
  };

  const handleSaveResponse = async () => {
    if (!selectedReview) return;
    try {
      setSubmittingResponse(true);
      await api.put(`/reviews/${selectedReview.id}`, {
        response: responseText,
        status: 'responded'
      });
      setSelectedReview(null);
      setResponseText('');
      fetchReviews();
    } catch (err) {
      console.error('Error saving response:', err);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.del(`/reviews/${id}`);
      fetchReviews();
    } catch (err) {
      console.error('Error deleting review:', err);
    }
  };

  // Stats calculation
  const totalReviews = reviews.length;
  const avgRating = totalReviews
    ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / totalReviews).toFixed(1)
    : '0.0';
  const pendingCount = reviews.filter((r) => r.status === 'pending').length;
  const publishedCount = reviews.filter((r) => r.status === 'published').length;

  // Star breakdown (5 down to 1)
  const starCounts = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(Number(r.rating)) === star).length;
    const percentage = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percentage };
  });

  const sourcesList = ['All sources', 'Website', 'Google', 'In-Clinic', 'Whatsapp', 'Followup-Sms'];

  // Filtering
  const filteredReviews = reviews.filter((r) => {
    const matchStatus =
      statusFilter === 'All'
        ? true
        : statusFilter.toLowerCase() === r.status?.toLowerCase();
    const matchSource =
      sourceFilter === 'All sources'
        ? true
        : r.source?.toLowerCase() === sourceFilter.toLowerCase();
    return matchStatus && matchSource;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" subtitle="Manage patient reviews and ratings" />

      {/* StatCards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Average Rating" value={avgRating} sub="Out of 5.0 stars" icon={Star} />
        <StatCard label="Total Reviews" value={totalReviews} sub="All time submissions" />
        <StatCard label="Pending Moderation" value={pendingCount} sub="Requires response/publish" />
        <StatCard label="Published Reviews" value={publishedCount} sub="Visible publicly" />
      </div>

      {/* Rating Distribution Card */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xl">
            {starCounts.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-8 font-medium">{star} ★</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
                </div>
                <span className="w-16 text-right text-muted-foreground">
                  {count} ({percentage}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="space-y-4">
        {/* Status Tabs */}
        <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
          {['All', 'Pending', 'Responded'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                statusFilter === tab
                  ? 'bg-card shadow-sm font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Source Chips */}
        <div className="flex flex-wrap gap-2">
          {sourcesList.map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                sourceFilter === src
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading reviews...</div>
          ) : filteredReviews.length === 0 ? (
            <EmptyState title="No reviews found" subtitle="Try adjusting your status or source filters." />
          ) : (
            <div className="divide-y">
              {filteredReviews.map((review) => (
                <div key={review.id} className="p-6 space-y-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={review.name} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{review.name}</h4>
                          {review.phone && (
                            <span className="text-xs text-muted-foreground">({review.phone})</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(review.date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="default">{review.source || 'Website'}</Badge>
                      <Badge variant={statusVariant(review.status)}>{review.status}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StarRating value={Number(review.rating) || 0} />
                    <span className="text-xs font-semibold text-amber-600">{review.rating} / 5</span>
                  </div>

                  <p className="text-sm italic text-foreground/90">"{review.text}"</p>

                  {review.response && (
                    <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Response: </span>
                      {review.response}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    {review.status === 'pending' && (
                      <Button size="sm" onClick={() => handlePublish(review)}>
                        Publish
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleOpenRespondModal(review)}>
                      Respond
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(review.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Respond Modal */}
      <Modal
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title={`Respond to ${selectedReview?.name || 'Review'}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveResponse} disabled={submittingResponse}>
              {submittingResponse ? 'Saving...' : 'Save & Submit Response'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-md text-xs">
            <p className="font-medium text-foreground">{selectedReview?.name}</p>
            <p className="italic text-muted-foreground">"{selectedReview?.text}"</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Your Response
            </label>
            <Textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Thank you for your feedback! We are glad to hear about your experience..."
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
