'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { RoleBadge, UserStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { User, UserRole } from '@/types';
import { formatDate } from '@/lib/utils';
import { Search, Plus, MoreHorizontal, KeyRound, UserX, UserCheck, Eye } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  
  // Modals
  const [showAddUser, setShowAddUser] = useState(false);
  const [showResetPIN, setShowResetPIN] = useState<User | null>(null);
  const [showToggleStatus, setShowToggleStatus] = useState<User | null>(null);
  
  // Form
  const [addForm, setAddForm] = useState({ nama: '', username: '', pin: '', role: 'USER' as UserRole });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addLoading, setAddLoading] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const isAdmin = session?.user.role === 'ADMIN';

  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const res = await fetch(`/api/users?${params}`);
    const data = await res.json();
    if (data.success) setUsers(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [search]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!addForm.nama.trim()) errs.nama = 'Nama wajib diisi';
    if (!addForm.username.trim()) errs.username = 'Username wajib diisi';
    if (!/^[a-z0-9._]+$/.test(addForm.username)) errs.username = 'Username hanya boleh huruf kecil, angka, titik, underscore';
    if (!addForm.pin || addForm.pin.length !== 6) errs.pin = 'PIN harus 6 digit';
    setAddErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setAddLoading(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    setAddLoading(false);
    if (data.success) {
      toast.success('User berhasil ditambahkan!');
      setShowAddUser(false);
      setAddForm({ nama: '', username: '', pin: '', role: 'USER' });
      fetchUsers();
    } else {
      toast.error(data.error?.message ?? 'Gagal menambahkan user');
    }
  };

  const handleResetPIN = async () => {
    if (!showResetPIN) return;
    if (newPin.length !== 6) { toast.error('PIN harus 6 digit'); return; }
    if (newPin !== confirmPin) { toast.error('Konfirmasi PIN tidak sesuai'); return; }
    setResetLoading(true);
    const res = await fetch(`/api/users/${showResetPIN.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-pin', new_pin: newPin }),
    });
    const data = await res.json();
    setResetLoading(false);
    setShowResetPIN(null);
    if (data.success) toast.success('PIN berhasil direset!');
    else toast.error(data.error?.message ?? 'Gagal reset PIN');
  };

  const handleToggleStatus = async () => {
    if (!showToggleStatus) return;
    setToggleLoading(true);
    const res = await fetch(`/api/users/${showToggleStatus.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle-status' }),
    });
    const data = await res.json();
    setToggleLoading(false);
    setShowToggleStatus(null);
    if (data.success) {
      toast.success(data.message ?? 'Status user diperbarui');
      fetchUsers();
    } else toast.error(data.error?.message ?? 'Gagal mengubah status');
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen User</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {users.length} user terdaftar
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAddUser(true)}>
            <Plus size={17} />
            Tambah User
          </button>
        )}
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 20, maxWidth: 400 }}>
        <Search size={17} className="search-icon" />
        <input
          className="input-field"
          type="search"
          placeholder="Cari nama atau username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 42 }}
        />
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Dibuat</th>
              {isAdmin && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(null).map((_, i) => (
                <tr key={i}>
                  {Array(isAdmin ? 6 : 5).fill(null).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>
                  ))}
                </tr>
              ))
            ) : users.map((user, index) => {
              const isLast = index === users.length - 1;
              return (
                <tr key={user.user_id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{user.nama}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    @{user.username}
                  </td>
                  <td><RoleBadge role={user.role} /></td>
                  <td><UserStatusBadge status={user.status} /></td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{formatDate(user.created_at)}</td>
                  {isAdmin && (
                    <td>
                      <div style={{ position: 'relative' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setOpenMenu(openMenu === user.user_id ? null : user.user_id)}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openMenu === user.user_id && (
                          <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpenMenu(null)} />
                            <div className="dropdown-menu" style={{ 
                              zIndex: 20,
                              right: 0,
                              left: 'auto',
                              ...(isLast ? { top: 'auto', bottom: 'calc(100% + 6px)' } : {})
                            }}>
                              <button className="dropdown-item" onClick={() => { setShowResetPIN(user); setNewPin(''); setConfirmPin(''); setOpenMenu(null); }}>
                                <KeyRound size={15} />
                                Reset PIN
                              </button>
                              <button className="dropdown-item" onClick={() => { setShowToggleStatus(user); setOpenMenu(null); }}>
                                {user.status === 'ACTIVE' ? <UserX size={15} /> : <UserCheck size={15} />}
                                {user.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAddUser} onClose={() => setShowAddUser(false)} title="Tambah User Baru">
        <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label label-required">Nama Lengkap</label>
            <input className={`input-field ${addErrors.nama ? 'input-error' : ''}`} type="text"
              placeholder="Nama lengkap user"
              value={addForm.nama} onChange={(e) => setAddForm((f) => ({ ...f, nama: e.target.value }))} />
            {addErrors.nama && <p className="error-text">{addErrors.nama}</p>}
          </div>
          <div>
            <label className="label label-required">Username</label>
            <input className={`input-field ${addErrors.username ? 'input-error' : ''}`} type="text"
              placeholder="contoh: budi.santoso"
              autoCapitalize="none"
              value={addForm.username} onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))} />
            {addErrors.username && <p className="error-text">{addErrors.username}</p>}
          </div>
          <div>
            <label className="label label-required">PIN (6 digit)</label>
            <input className={`input-field ${addErrors.pin ? 'input-error' : ''}`}
              type="password" inputMode="numeric" placeholder="••••••" maxLength={6}
              value={addForm.pin} onChange={(e) => setAddForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} />
            {addErrors.pin && <p className="error-text">{addErrors.pin}</p>}
          </div>
          <div>
            <label className="label label-required">Role</label>
            <select className="select-field" value={addForm.role}
              onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
              <option value="USER">Staff (USER)</option>
              <option value="ADMIN">Admin (ADMIN)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAddUser(false)}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={addLoading}>
              {addLoading ? <><span className="spinner" />Menyimpan...</> : <><Plus size={16} />Tambah User</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset PIN Modal */}
      <Modal isOpen={!!showResetPIN} onClose={() => setShowResetPIN(null)} title="Reset PIN">
        {showResetPIN && (
          <>
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#F9FAFB', borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>{showResetPIN.nama}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>@{showResetPIN.username}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div>
                <label className="label label-required">PIN Baru (6 digit)</label>
                <input className="input-field" type="password" inputMode="numeric" maxLength={6}
                  placeholder="••••••" value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </div>
              <div>
                <label className="label label-required">Konfirmasi PIN Baru</label>
                <input className={`input-field ${confirmPin && newPin !== confirmPin ? 'input-error' : ''}`}
                  type="password" inputMode="numeric" maxLength={6}
                  placeholder="••••••" value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                {confirmPin && newPin !== confirmPin && <p className="error-text">PIN tidak sesuai</p>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowResetPIN(null)}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleResetPIN} disabled={resetLoading || newPin.length !== 6 || newPin !== confirmPin}>
                {resetLoading ? <><span className="spinner" />Mereset...</> : <><KeyRound size={16} />Reset PIN</>}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Toggle Status Modal */}
      <Modal isOpen={!!showToggleStatus} onClose={() => setShowToggleStatus(null)} title={showToggleStatus?.status === 'ACTIVE' ? 'Nonaktifkan User?' : 'Aktifkan User?'}>
        {showToggleStatus && (
          <>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                {showToggleStatus.status === 'ACTIVE'
                  ? `User ${showToggleStatus.nama} tidak akan bisa login setelah dinonaktifkan.`
                  : `User ${showToggleStatus.nama} akan dapat login kembali.`
                }
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowToggleStatus(null)}>Batal</button>
              <button
                className={`btn ${showToggleStatus.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}`}
                style={{ flex: 1 }}
                onClick={handleToggleStatus}
                disabled={toggleLoading}
              >
                {toggleLoading ? <><span className="spinner" />Memproses...</>
                  : showToggleStatus.status === 'ACTIVE'
                    ? <><UserX size={16} />Nonaktifkan</>
                    : <><UserCheck size={16} />Aktifkan</>
                }
              </button>
            </div>
          </>
        )}
      </Modal>
    </AdminLayout>
  );
}
