import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Select,
  Modal,
  PageHeader
} from '../../components/ui';

export default function ToothChart() {
  const [toothMap, setToothMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [selectedState, setSelectedState] = useState('healthy');

  const quadrants = [
    { name: 'Upper Right', teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
    { name: 'Upper Left', teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
    { name: 'Lower Left', teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
    { name: 'Lower Right', teeth: [41, 42, 43, 44, 45, 46, 47, 48] }
  ];

  const legendItems = [
    { state: 'healthy', label: 'Healthy', class: 'bg-muted text-muted-foreground' },
    { state: 'filled', label: 'Filled', class: 'bg-sky-200 text-sky-900' },
    { state: 'crowned', label: 'Crowned', class: 'bg-amber-200 text-amber-900' },
    { state: 'rootcanal', label: 'Root Canal', class: 'bg-purple-200 text-purple-900' },
    { state: 'implant', label: 'Implant', class: 'bg-indigo-300 text-indigo-900' },
    { state: 'extracted', label: 'Extracted', class: 'bg-red-200 text-red-900 line-through opacity-60' }
  ];

  const fetchChart = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tooth-chart');
      const map = {};
      if (Array.isArray(res)) {
        res.forEach((item) => {
          map[item.tooth] = item.state;
        });
      }
      setToothMap(map);
    } catch (err) {
      console.error('Failed to load tooth chart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChart();
  }, []);

  const handleToothClick = (tooth) => {
    setSelectedTooth(tooth);
    setSelectedState(toothMap[tooth] || 'healthy');
    setModalOpen(true);
  };

  const updateState = async (stateToSave) => {
    if (!selectedTooth) return;
    try {
      const updatedList = await api.put(`/tooth-chart/${selectedTooth}`, { state: stateToSave });
      const map = {};
      if (Array.isArray(updatedList)) {
        updatedList.forEach((item) => {
          map[item.tooth] = item.state;
        });
      } else {
        map[selectedTooth] = stateToSave;
      }
      setToothMap(map);
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to update tooth state:', err);
    }
  };

  const getToothClass = (tooth) => {
    const st = toothMap[tooth] || 'healthy';
    switch (st) {
      case 'filled':
        return 'bg-sky-200 text-sky-900';
      case 'crowned':
        return 'bg-amber-200 text-amber-900';
      case 'rootcanal':
        return 'bg-purple-200 text-purple-900';
      case 'implant':
        return 'bg-indigo-300 text-indigo-900';
      case 'extracted':
        return 'bg-red-200 text-red-900 line-through opacity-60';
      case 'healthy':
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tooth Chart"
        subtitle="Click a tooth to record its condition"
      />

      {/* Legend Card */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Condition Legend
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          {legendItems.map((item) => (
            <div key={item.state} className="flex items-center gap-2 text-xs font-medium">
              <span className={`inline-block w-4 h-4 rounded ${item.class}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quadrants.map((quad) => (
            <Card key={quad.name}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {quad.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-8 gap-1">
                  {quad.teeth.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleToothClick(t)}
                      className={`w-9 h-9 rounded-md text-xs font-medium flex items-center justify-center transition-transform hover:scale-105 ${getToothClass(
                        t
                      )}`}
                      title={`Tooth ${t}: ${toothMap[t] || 'healthy'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tooth State Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Tooth #${selectedTooth}`}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => updateState('healthy')}
              className="mr-auto text-muted-foreground"
            >
              Clear
            </Button>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateState(selectedState)}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Condition State</label>
            <Select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="healthy">Healthy</option>
              <option value="filled">Filled</option>
              <option value="crowned">Crowned</option>
              <option value="rootcanal">Root Canal</option>
              <option value="implant">Implant</option>
              <option value="extracted">Extracted</option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
