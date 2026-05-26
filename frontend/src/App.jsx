import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Campaigns from './pages/Campaigns';
import Layout from './components/Layout';

// MODO DEMO: auth desactivado para revisar el diseño
// TODO: reactivar auth con Supabase antes de produccion

const DEMO_SESSION = { user: { email: 'admin@selectionlatam.com' } };

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout session={DEMO_SESSION} />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="campaigns" element={<Campaigns />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
