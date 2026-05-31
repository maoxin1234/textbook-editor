import { HashRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor/:projectId" element={<EditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
