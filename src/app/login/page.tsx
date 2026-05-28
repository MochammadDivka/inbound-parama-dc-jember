'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || pin.length !== 6) return;
    setError('');
    setLoading(true);

    const result = await signIn('user-credentials', {
      username: username.trim().toLowerCase(),
      pin,
      redirect: false,
    });

    setLoading(false);

    if (result?.ok) {
      router.push('/dashboard');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setError('Terlalu banyak percobaan gagal. Hubungi Admin untuk reset PIN.');
      } else {
        setError('Username atau PIN salah. Periksa kembali dan coba lagi.');
      }
    }
  };

  const isLocked = attempts >= 5;

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #1A56DB 0%, #1E3A8A 50%, #1e40af 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div className="animate-slide-up" style={{
        width: '100%',
        maxWidth: 400,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            width: 72, height: 72,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 22, letterSpacing: '-0.04em' }}>PGI</span>
          </div>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 2, letterSpacing: '-0.02em' }}>
            Parama Global Inspira
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Distribution Center · Jember
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            Inbound Issue Tracker
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: 'var(--color-text)' }}>
            Login Staff
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
            Masukkan username dan PIN 6 digit Anda
          </p>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: 'var(--color-danger-light)',
              border: '1px solid #FCA5A5',
              borderRadius: 10, padding: '12px 14px',
              marginBottom: 20,
            }}>
              <AlertCircle size={18} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#991B1B', lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label" htmlFor="username">Username</label>
              <input
                id="username"
                className="input-field"
                type="text"
                placeholder="Masukkan username Anda"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoComplete="username"
                disabled={isLocked || loading}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="pin">PIN (6 digit)</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="pin"
                  className="input-field"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPin(val);
                  }}
                  maxLength={6}
                  autoComplete="current-password"
                  disabled={isLocked || loading}
                  style={{ paddingRight: 48, letterSpacing: pin && !showPin ? '0.3em' : 'normal' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', display: 'flex', padding: 4,
                  }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
                Gunakan numpad untuk memasukkan PIN
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || isLocked || !username || pin.length !== 6}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <><span className="spinner" /> Memproses...</>
              ) : 'MASUK'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Lupa PIN? Hubungi Admin untuk reset.
            </p>
          </div>
        </div>

        {/* Admin Link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link
            href="/admin/login"
            style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}
          >
            Admin / Supervisor? <span style={{ fontWeight: 600, textDecoration: 'underline' }}>Login di sini</span>
          </Link>
        </div>


      </div>
    </div>
  );
}
