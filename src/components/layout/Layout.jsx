import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Chatbot from '@/components/chatbot/Chatbot'; // Added import

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <Chatbot /> {/* Added Chatbot component */}
    </div>
  );
}

