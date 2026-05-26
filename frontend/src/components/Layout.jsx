import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout({ session }) {
  return (
    <div className="flex min-h-screen bg-neutral-background">
      <Sidebar userEmail={session?.user?.email} />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
