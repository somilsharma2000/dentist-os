import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Modal,
  PageHeader,
  StatCard,
  Avatar,
  statusVariant,
  EmptyState
} from '../../components/ui';
import { formatDate, formatINR } from '../../lib/utils';
import {
  Calendar,
  Users,
  Wallet,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Target
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Goal modal state
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    revenue: 500000,
    newPatients: 30,
    treatments: 60,
    reviews: 20
  });

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res);
      if (res.goals) {
        const rev = res.goals.find((g) => g.key === 'revenue')?.target || 500000;
        const pts = res.goals.find((g) => g.key === 'newPatients')?.target || 30;
        const trmt = res.goals.find((g) => g.key === 'treatments')?.target || 60;
        const revs = res.goals.find((g) => g.key === 'reviews')?.target || 20;
        setGoalForm({ revenue: rev, newPatients: pts, treatments: trmt, reviews: revs });
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleUpdateGoals = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings', {
        goals: {
          revenue: Number(goalForm.revenue),
          newPatients: Number(goalForm.newPatients),
          treatments: Number(goalForm.treatments),
          reviews: Number(goalForm.reviews)
        }
      });
      setGoalModalOpen(false);
      fetchDashboard();
    } catch (err) {
      console.error('Failed to update goals:', err);
    }
  };

  const completeTask = async (taskId) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: 'completed' });
      fetchDashboard();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground p-6">Loading…</div>;
  }

  if (!data) {
    return <div className="text-muted-foreground p-6">Failed to load dashboard data.</div>;
  }

  const {
    today,
    todayCount = 0,
    revenueThisMonth = 0,
    activePatients = 0,
    totalPatients = 0,
    pendingInvoicesCount = 0,
    pendingInvoicesAmount = 0,
    dailySummary = {},
    goals = [],
    leadPipeline = {},
    tasks = [],
    appointmentsToday = [],
    revenueTrend = [],
    recentPatients = [],
    pendingTreatmentPlans = [],
    lowStock = []
  } = data;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of your practice today" />

      {/* Top 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Appointments"
          value={todayCount}
          icon={Calendar}
        />
        <StatCard
          label="Revenue This Month"
          value={formatINR(revenueThisMonth)}
          icon={Wallet}
        />
        <StatCard
          label="Active Patients"
          value={activePatients}
          sub={`${totalPatients} total`}
          icon={Users}
        />
        <StatCard
          label="Pending Invoices"
          value={formatINR(pendingInvoicesAmount)}
          sub={`${pendingInvoicesCount} invoices`}
          icon={Receipt}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* (f) Revenue Trend Card (Span full width lg:col-span-2) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip formatter={(val) => [formatINR(val), 'Revenue']} />
                  <Area type="monotone" dataKey="total" stroke="#0891b2" fill="#0891b2" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* (a) Daily Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Summary: {formatDate(today)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground text-sm">Today's Revenue</span>
              <span className="font-semibold text-base">{formatINR(dailySummary.revenueToday || 0)}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground text-sm">Completed Visits</span>
              <span className="font-semibold text-base">{dailySummary.completedVisits || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Appointments Today</span>
              <span className="font-semibold text-base">{dailySummary.appointmentsToday || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* (b) Goals Tracking Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Goals Tracking</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setGoalModalOpen(true)}>
              <Target className="h-4 w-4 mr-1" />
              Set Target
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal) => {
              const targetVal = goal.target || 1;
              const pct = Math.round((goal.current / targetVal) * 100);
              const isINR = goal.unit === '₹';
              const formattedCurrent = isINR ? formatINR(goal.current) : goal.current;
              const formattedTarget = isINR ? formatINR(goal.target) : goal.target;
              const isOnTrack = pct >= 60;

              return (
                <div key={goal.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{goal.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {formattedCurrent} / {formattedTarget}
                      </span>
                      <Badge variant={isOnTrack ? 'success' : 'warning'}>
                        {isOnTrack ? 'On Track' : 'Behind'}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* (e) Today's Schedule Card */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentsToday.length === 0 ? (
              <EmptyState title="No appointments today" subtitle="Enjoy your light schedule" />
            ) : (
              <div className="space-y-3">
                {appointmentsToday.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm w-14">{appt.time}</span>
                        <span className="font-medium text-sm">{appt.patientName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-16">
                        {appt.dentistName || 'Dr. Rajesh Kumar'} • {appt.procedure}
                      </p>
                    </div>
                    <Badge variant={statusVariant(appt.status)}>{appt.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* (d) Today's Tasks Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Today's Tasks</CardTitle>
            <Link to="/admin/tasks" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <EmptyState title="No pending tasks" subtitle="All set for today!" />
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => completeTask(task.id)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Mark complete"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <span className="text-sm font-medium">{task.title}</span>
                    </div>
                    {task.assignee && <Badge variant="default">{task.assignee}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* (c) Lead Pipeline Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Lead Pipeline</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {leadPipeline.newThisWeek || 0} new this week • {leadPipeline.conversionRate || 0}% conversion
              </p>
            </div>
            <Link to="/admin/leads" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {(!leadPipeline.top || leadPipeline.top.length === 0) ? (
              <EmptyState title="No recent leads" />
            ) : (
              <div className="space-y-3">
                {leadPipeline.top.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Avatar name={lead.name} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{lead.name}</span>
                          <Badge variant="info">{lead.source}</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2 w-32">
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${lead.score || 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">{lead.score}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* (h) Pending Treatment Plans Card */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Treatment Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTreatmentPlans.length === 0 ? (
              <EmptyState title="No pending treatment plans" />
            ) : (
              <div className="space-y-3">
                {pendingTreatmentPlans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{plan.patientName}</p>
                      <p className="text-xs text-muted-foreground">{plan.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatINR(plan.cost)}</p>
                      <Badge variant={statusVariant(plan.status)}>{plan.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* (g) Recent Patients Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Patients</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPatients.length === 0 ? (
              <EmptyState title="No recent patients" />
            ) : (
              <div className="space-y-3">
                {recentPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Avatar name={patient.name} />
                      <div>
                        <p className="font-medium text-sm">{patient.name}</p>
                        <p className="text-xs text-muted-foreground">{patient.phone}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(patient.lastVisit)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* (i) Low Stock Alerts Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <EmptyState title="All inventory items well stocked" />
            ) : (
              <div className="space-y-3">
                {lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <span className="font-medium text-sm">{item.item}</span>
                    <span className="text-sm font-semibold text-destructive">
                      {item.quantity} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Set Goals Modal */}
      <Modal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title="Set Goal Targets"
        footer={
          <>
            <Button variant="outline" onClick={() => setGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateGoals}>
              Save Targets
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateGoals} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Revenue Target (₹)</label>
            <Input
              type="number"
              value={goalForm.revenue}
              onChange={(e) => setGoalForm({ ...goalForm, revenue: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Patients Target</label>
            <Input
              type="number"
              value={goalForm.newPatients}
              onChange={(e) => setGoalForm({ ...goalForm, newPatients: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Treatments Completed Target</label>
            <Input
              type="number"
              value={goalForm.treatments}
              onChange={(e) => setGoalForm({ ...goalForm, treatments: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reviews Target</label>
            <Input
              type="number"
              value={goalForm.reviews}
              onChange={(e) => setGoalForm({ ...goalForm, reviews: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
