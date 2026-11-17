import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { ROLES, useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading, role, loginAsDemo } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          color: 'var(--ink-soft)',
        }}
      >
        <Loader2 size={32} className="spin" style={{ color: 'var(--teal-600)' }} />
        <span>Verifying clinical authorization...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if restricted
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="page" style={{ maxWidth: '640px', margin: '2rem auto' }}>
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            padding: '2rem',
            boxShadow: 'var(--sh-1)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--amber-bg)',
              color: 'var(--amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={28} />
          </div>

          <h2 style={{ margin: 0, color: 'var(--navy-900)' }}>Access Restricted</h2>
          <p style={{ margin: 0, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            This portal module requires <strong>{allowedRoles.join(' or ')}</strong> clearance.
            You are currently signed in as <strong>{user?.name}</strong> (
            <span style={{ textTransform: 'capitalize' }}>{role}</span>).
          </p>

          <div
            style={{
              background: 'var(--wash)',
              padding: '1rem',
              borderRadius: 'var(--r-md)',
              width: '100%',
              marginTop: '0.5rem',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--ink-soft)',
                display: 'block',
                marginBottom: '0.65rem',
              }}
            >
              Switch demo role for evaluation:
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              {allowedRoles.map((neededRole) => (
                <button
                  key={neededRole}
                  type="button"
                  className="btn btn--secondary"
                  style={{ textTransform: 'capitalize' }}
                  onClick={() => loginAsDemo(neededRole)}
                >
                  <Sparkles size={14} /> Switch to {neededRole}
                </button>
              ))}
            </div>
          </div>

          <Link to="/" className="btn btn--ghost" style={{ marginTop: '0.5rem' }}>
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
