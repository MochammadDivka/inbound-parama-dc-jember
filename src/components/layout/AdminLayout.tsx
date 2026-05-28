'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, AlertCircle, Users,
  BarChart2, LogOut, ChevronDown, Menu, X,
} from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { RoleBadge } from '@/components/ui/Badge';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/issues', icon: FileText, label: 'Issues' },
  { href: '/admin/cz', icon: AlertCircle, label: 'CZ' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/reports', icon: BarChart2, label: 'Reports' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const toast = useToast();
  const [showLogout, setShowLogout] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' });
    toast.info('Berhasil logout');
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      {/* Top Navigation — Desktop */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'white',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {/* Logo */}
          <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 16 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em',
            }}>
              P
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              Parama DC Jember
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', gap: 2, flex: 1 }} className="hidden-mobile">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 14px', borderRadius: 8,
                    fontSize: 14, fontWeight: active ? 600 : 500,
                    color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    background: active ? 'var(--color-primary-light)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={17} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'white', cursor: 'pointer',
                transition: 'background 0.1s ease',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 13,
              }}>
                {session?.user.name?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                  {session?.user.name}
                </div>
                {session?.user.role && (
                  <RoleBadge role={session.user.role} />
                )}
              </div>
              <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
            </button>

            {userMenuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 20 }}
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="dropdown-menu" style={{ zIndex: 30 }}>
                  <button
                    className="dropdown-item danger"
                    onClick={() => { setUserMenuOpen(false); setShowLogout(true); }}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="show-mobile"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--color-text)', display: 'none' }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div style={{
            borderTop: '1px solid var(--color-border)',
            padding: '8px 16px 16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 10,
                    fontSize: 15, fontWeight: active ? 600 : 500,
                    color: active ? 'var(--color-primary)' : 'var(--color-text)',
                    background: active ? 'var(--color-primary-light)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Page Content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px' }}>
        {children}
      </main>

      {/* Logout Confirm */}
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
