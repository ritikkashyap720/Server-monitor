import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MonitorProvider } from './context/MonitorContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FullView from './pages/FullView';
import ContainerDetail from './pages/ContainerDetail';

export default function App() {
  return (
    <MonitorProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="view" element={<FullView />} />
            <Route path="container/:id" element={<ContainerDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MonitorProvider>
  );
}
