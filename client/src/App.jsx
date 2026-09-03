import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/PublicLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import Home from './pages/public/Home.jsx';
import Services from './pages/public/Services.jsx';
import Team from './pages/public/Team.jsx';
import Reviews from './pages/public/Reviews.jsx';
import Contact from './pages/public/Contact.jsx';
import Book from './pages/public/Book.jsx';
import Portal from './pages/public/Portal.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Patients from './pages/admin/Patients.jsx';
import Appointments from './pages/admin/Appointments.jsx';
import TreatmentPlans from './pages/admin/TreatmentPlans.jsx';
import ToothChart from './pages/admin/ToothChart.jsx';
import Dentists from './pages/admin/Dentists.jsx';
import Invoices from './pages/admin/Invoices.jsx';
import LeadCRM from './pages/admin/LeadCRM.jsx';
import Social from './pages/admin/Social.jsx';
import ReviewsAdmin from './pages/admin/ReviewsAdmin.jsx';
import Recall from './pages/admin/Recall.jsx';
import Automations from './pages/admin/Automations.jsx';
import AiAssistant from './pages/admin/AiAssistant.jsx';
import Tasks from './pages/admin/Tasks.jsx';
import WhatsApp from './pages/admin/WhatsApp.jsx';
import QrCodes from './pages/admin/QrCodes.jsx';
import Inventory from './pages/admin/Inventory.jsx';
import Settings from './pages/admin/Settings.jsx';
import Agency from './pages/admin/Agency.jsx';
import WebsiteMgr from './pages/admin/WebsiteMgr.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/team" element={<Team />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/book" element={<Book />} />
        <Route path="/portal" element={<Portal />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="treatment-plans" element={<TreatmentPlans />} />
        <Route path="tooth-chart" element={<ToothChart />} />
        <Route path="dentists" element={<Dentists />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="leads" element={<LeadCRM />} />
        <Route path="social" element={<Social />} />
        <Route path="reviews" element={<ReviewsAdmin />} />
        <Route path="recall" element={<Recall />} />
        <Route path="automations" element={<Automations />} />
        <Route path="ai-assistant" element={<AiAssistant />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="whatsapp" element={<WhatsApp />} />
        <Route path="qr-codes" element={<QrCodes />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="settings" element={<Settings />} />
        <Route path="agency" element={<Agency />} />
        <Route path="website" element={<WebsiteMgr />} />
      </Route>
    </Routes>
  );
}
