// src/components/layout/Layout.jsx
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import FloatingBackground from '../utils/FloatingBackground';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FloatingBackground />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
