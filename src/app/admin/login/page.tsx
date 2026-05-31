'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('admin-credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.ok) {
      router.push('/admin/dashboard');
    } else {
      setError('Email atau password salah. Periksa kembali.');
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div className="animate-slide-up" style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex',
            width: 68, height: 68, borderRadius: 18,
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.15)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 20, letterSpacing: '-0.04em' }}>PGI</span>
          </div>
          <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 2 }}>
            Parama Global Inspira
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
            Distribution Center · Jember
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
            Admin Panel
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Login Admin</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
            Gunakan email dan password akun Anda
          </p>

          {error && (
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: 'var(--color-danger-light)',
              border: '1px solid #FCA5A5',
              borderRadius: 10, padding: '12px 14px',
              marginBottom: 20,
            }}>
              <AlertCircle size={18} color="var(--color-danger)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#991B1B' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input-field"
                type="email"
                placeholder="Masukkan email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  className="input-field"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', display: 'flex', padding: 4,
                  }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !email || !password}
              style={{ marginTop: 8, background: '#1E293B' }}
            >
              {loading ? (
                <><span className="spinner" /> Memproses...</>
              ) : 'MASUK'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link
            href="/login"
            style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}
          >
            ← Kembali ke login staff
          </Link>
        </div>


      </div>
    </div>
  );
}
