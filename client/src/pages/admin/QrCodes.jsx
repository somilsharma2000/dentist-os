import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  PageHeader,
  EmptyState
} from '../../components/ui';
import { Plus, Download, Trash2 } from 'lucide-react';

function QrCard({ qr, onDelete }) {
  const [imgUrl, setImgUrl] = useState('');

  useEffect(() => {
    if (!qr.url) return;
    const targetUrl = qr.url.startsWith('http')
      ? qr.url
      : window.location.origin + (qr.url.startsWith('/') ? qr.url : '/' + qr.url);

    QRCode.toDataURL(targetUrl)
      .then((url) => setImgUrl(url))
      .catch((err) => console.error('Error generating QR code:', err));
  }, [qr.url]);

  return (
    <Card className="flex flex-col items-center justify-between p-6 text-center space-y-4">
      <div className="flex flex-col items-center space-y-3">
        {imgUrl ? (
          <img src={imgUrl} alt={qr.name} className="w-40 h-40 border rounded-md p-2 bg-white shadow-sm" />
        ) : (
          <div className="w-40 h-40 border rounded-md flex items-center justify-center text-xs text-muted-foreground bg-muted">
            Generating QR...
          </div>
        )}
        <div>
          <h4 className="font-semibold text-base">{qr.name}</h4>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={qr.url}>
            {qr.url}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t w-full justify-center">
        {imgUrl && (
          <a href={imgUrl} download={`${qr.name || 'qr-code'}.png`}>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </Button>
          </a>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(qr.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

export default function QrCodes() {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '/book'
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchQrCodes = async () => {
    try {
      setLoading(true);
      const data = await api.get('/qrCodes');
      setQrCodes(data || []);
    } catch (err) {
      console.error('Error fetching QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrCodes();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/qrCodes', formData);
      setOpenModal(false);
      setFormData({ name: '', url: '/book' });
      fetchQrCodes();
    } catch (err) {
      console.error('Error creating QR code:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this QR code?')) return;
    try {
      await api.del(`/qrCodes/${id}`);
      fetchQrCodes();
    } catch (err) {
      console.error('Error deleting QR code:', err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR Codes"
        subtitle="Generate scannable links"
        actions={
          <Button onClick={() => setOpenModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New QR
          </Button>
        }
      />

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading QR codes...</div>
      ) : qrCodes.length === 0 ? (
        <EmptyState title="No QR codes generated" subtitle="Create your first QR code to link to online booking or feedback." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {qrCodes.map((qr) => (
            <QrCard key={qr.id} qr={qr} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* New QR Modal */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Generate New QR Code"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Generating...' : 'Generate QR'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              QR Code Name / Label
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Online Booking Reception Desk"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Target URL or Path
            </label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="e.g. /book or https://smilecraft.in/reviews"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
