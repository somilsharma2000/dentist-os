import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Textarea,
  Select,
  Modal,
  PageHeader,
  EmptyState,
  statusVariant
} from '../../components/ui';
import { formatDate, todayISO } from '../../lib/utils';
import {
  Plus,
  Trash2,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
  Globe
} from 'lucide-react';

export default function Social() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // New post form state
  const [formData, setFormData] = useState({
    platform: 'Instagram',
    content: '',
    scheduledDate: todayISO(),
    status: 'scheduled',
    likes: 0
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await api.get('/socialPosts');
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching social posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/socialPosts', formData);
      setOpenModal(false);
      setFormData({
        platform: 'Instagram',
        content: '',
        scheduledDate: todayISO(),
        status: 'scheduled',
        likes: 0
      });
      fetchPosts();
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this social post?')) return;
    try {
      await api.del(`/socialPosts/${id}`);
      fetchPosts();
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'Instagram':
        return (
          <div className="rounded-lg p-2 bg-pink-100 text-pink-600">
            <Instagram className="h-5 w-5" />
          </div>
        );
      case 'Facebook':
        return (
          <div className="rounded-lg p-2 bg-blue-100 text-blue-600">
            <Facebook className="h-5 w-5" />
          </div>
        );
      case 'YouTube':
      case 'Youtube':
        return (
          <div className="rounded-lg p-2 bg-red-100 text-red-600">
            <Youtube className="h-5 w-5" />
          </div>
        );
      case 'WhatsApp':
      case 'Whatsapp':
        return (
          <div className="rounded-lg p-2 bg-emerald-100 text-emerald-600">
            <MessageCircle className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="rounded-lg p-2 bg-purple-100 text-purple-600">
            <Globe className="h-5 w-5" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Media"
        subtitle="Schedule and track posts"
        actions={
          <Button onClick={() => setOpenModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Post
          </Button>
        }
      />

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading posts...</div>
      ) : posts.length === 0 ? (
        <EmptyState title="No social posts" subtitle="Create your first post to schedule or publish." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(post.platform)}
                    <div>
                      <h4 className="font-semibold text-sm">{post.platform}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(post.scheduledDate)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusVariant(post.status)}>{post.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-sm whitespace-pre-wrap line-clamp-4">{post.content}</p>

                <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                  <span>♥ {post.likes || 0} likes</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(post.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Post Modal */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Schedule / Add Social Post"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePost} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Post'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Platform
            </label>
            <Select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            >
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="YouTube">YouTube</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Post Content
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your social post content here..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Scheduled Date
              </label>
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Status
              </label>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </Select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
