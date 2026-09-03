import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Modal,
  PageHeader,
  StatCard,
  EmptyState
} from '../../components/ui';
import { Package, AlertTriangle, Plus, Trash2 } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Item Modal state
  const [openAddModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    item: '',
    category: 'Consumables',
    quantity: 10,
    unit: 'pack',
    minStock: 5,
    supplier: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Restock Modal state
  const [selectedRestockItem, setSelectedRestockItem] = useState(null);
  const [restockAmount, setRestockAmount] = useState(5);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await api.get('/inventory');
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Stat calculations
  const totalItems = items.length;
  const lowStockCount = items.filter((i) => Number(i.quantity) <= Number(i.minStock)).length;
  const uniqueCategories = new Set(items.map((i) => i.category).filter(Boolean)).size;
  const totalUnits = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!formData.item.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/inventory', {
        ...formData,
        quantity: Number(formData.quantity) || 0,
        minStock: Number(formData.minStock) || 0
      });
      setOpenModal(false);
      setFormData({
        item: '',
        category: 'Consumables',
        quantity: 10,
        unit: 'pack',
        minStock: 5,
        supplier: ''
      });
      fetchInventory();
    } catch (err) {
      console.error('Error adding inventory item:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestockSubmit = async () => {
    if (!selectedRestockItem) return;
    try {
      const newQty = (Number(selectedRestockItem.quantity) || 0) + (Number(restockAmount) || 0);
      await api.put(`/inventory/${selectedRestockItem.id}`, {
        ...selectedRestockItem,
        quantity: newQty
      });
      setSelectedRestockItem(null);
      setRestockAmount(5);
      fetchInventory();
    } catch (err) {
      console.error('Error restocking inventory:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item from inventory?')) return;
    try {
      await api.del(`/inventory/${id}`);
      fetchInventory();
    } catch (err) {
      console.error('Error deleting inventory item:', err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Manage clinic supplies and stock"
        actions={
          <Button onClick={() => setOpenModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        }
      />

      {/* StatCards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Items" value={totalItems} icon={Package} />
        <StatCard
          label="Low Stock Alert"
          value={lowStockCount}
          sub={lowStockCount > 0 ? 'Requires immediate restock' : 'Stock levels healthy'}
          icon={AlertTriangle}
        />
        <StatCard label="Categories" value={uniqueCategories} />
        <StatCard label="Total Units" value={totalUnits.toLocaleString('en-IN')} />
      </div>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading inventory...</div>
          ) : items.length === 0 ? (
            <EmptyState title="Inventory empty" subtitle="Add items to manage dental supplies and stock levels." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-muted/30">
                    <th className="p-4">Item</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Min Stock</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => {
                    const isLow = Number(item.quantity) <= Number(item.minStock);
                    return (
                      <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-medium text-foreground">{item.item}</td>
                        <td className="p-4 text-muted-foreground">{item.category}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.quantity} {item.unit}</span>
                            {isLow ? (
                              <Badge variant="destructive">Low</Badge>
                            ) : (
                              <Badge variant="success">In Stock</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {item.minStock} {item.unit}
                        </td>
                        <td className="p-4 text-muted-foreground">{item.supplier || '—'}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRestockItem(item);
                                setRestockAmount(5);
                              }}
                            >
                              Restock
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Modal */}
      <Modal
        open={openAddModal}
        onClose={() => setOpenModal(false)}
        title="Add Inventory Item"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={submitting}>
              {submitting ? 'Saving...' : 'Add Item'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Item Name
            </label>
            <Input
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              placeholder="e.g. Orthodontic Wires (Pack)"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Category
              </label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Consumables, Ortho, Surgery"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Unit
              </label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g. pack, box, pcs, bottle"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Initial Quantity
              </label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Minimum Stock Alert Level
              </label>
              <Input
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Supplier
            </label>
            <Input
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="e.g. MedPlus Supplies Bengaluru"
            />
          </div>
        </form>
      </Modal>

      {/* Restock Modal */}
      <Modal
        open={!!selectedRestockItem}
        onClose={() => setSelectedRestockItem(null)}
        title={`Restock: ${selectedRestockItem?.item}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedRestockItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleRestockSubmit}>Confirm Restock</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current Quantity: <span className="font-semibold text-foreground">{selectedRestockItem?.quantity} {selectedRestockItem?.unit}</span>
          </p>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Add Quantity ({selectedRestockItem?.unit})
            </label>
            <Input
              type="number"
              min="1"
              value={restockAmount}
              onChange={(e) => setRestockAmount(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
