import { IssueStatus, CZStatus, UserRole, UserStatus } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = '' }: BadgeProps) {
  return <span className={`badge ${className}`}>{children}</span>;
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const map: Record<IssueStatus, { cls: string; dot: string; label: string }> = {
    OPEN: { cls: 'badge-open', dot: '🟡', label: 'Open' },
    WAITING_APPROVAL: { cls: 'badge-waiting', dot: '🔵', label: 'Menunggu Persetujuan' },
    SOLVED: { cls: 'badge-solved', dot: '🟢', label: 'Selesai' },
    CANCELLED: { cls: 'badge-cancelled', dot: '🔴', label: 'Dibatalkan' },
  };
  const { cls, dot, label } = map[status] ?? map.OPEN;
  return (
    <span className={`badge ${cls}`}>
      <span>{dot}</span>
      {label}
    </span>
  );
}

export function CZStatusBadge({ status }: { status: CZStatus }) {
  const map: Record<CZStatus, { cls: string; dot: string; label: string }> = {
    OPEN: { cls: 'badge-open', dot: '🟡', label: 'Open' },
    SOLVED: { cls: 'badge-solved', dot: '🟢', label: 'Selesai' },
  };
  const { cls, dot, label } = map[status];
  return (
    <span className={`badge ${cls}`}>
      <span>{dot}</span>
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, { cls: string; label: string }> = {
    USER: { cls: 'badge-user', label: 'Staff' },
    ADMIN: { cls: 'badge-admin', label: 'Admin' },
  };
  const { cls, label } = map[role] ?? map.USER;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  if (status === 'ACTIVE') {
    return (
      <span className="badge badge-solved">
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
        Aktif
      </span>
    );
  }
  return (
    <span className="badge badge-cancelled">
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      Nonaktif
    </span>
  );
}

export function SelisihDisplay({ value }: { value: number }) {
  const cls = value < 0 ? 'selisih-minus' : value > 0 ? 'selisih-plus' : 'selisih-zero';
  const prefix = value > 0 ? '+' : '';
  return <span className={cls}>{prefix}{value} PCS</span>;
}
