'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, LayoutDashboard, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

export function UserLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const toast = useToast();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
    toast.info('Berhasil logout');
  };

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/cz', icon: AlertCircle, label: 'Clarification Zone' },
    { href: '/issues/new', icon: FileText, label: 'Buat Issue' },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: 80 }}>
      {/* Sticky Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'white',
        borderBottom: '1px solid var(--color-border)',
        height: 56,
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 14,
          }}>
            {session?.user.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
              Halo, {session?.user.name?.split(' ')[0]}!
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              @{session?.user.username}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowLogout(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--color-text-muted)', display: 'flex', borderRadius: 8 }}
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Content */}
      <main style={{ padding: '16px 16px 0' }}>
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
            >
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Modal */}
      <Modal isOpen={showLogout} onClose={() => setShowLogout(false)} title="Konfirmasi Logout">
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 20 }}>
          Apakah Anda yakin ingin keluar dari sistem?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowLogout(false)}>
            Batal
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </Modal>
    </div>
  );
}
