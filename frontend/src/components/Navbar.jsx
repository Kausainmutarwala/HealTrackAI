/**
 * Navbar
 * props:
 *  - user: { name, role }
 */
export default function Navbar({ user = { name: 'Aarav Mehta', role: 'Patient' } }) {
  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <header
      style={{
        height: 64,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div className="mono text-faint" style={{ fontSize: 12 }}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 13.5, fontWeight: 600 }}>{user.name}</p>
          <p className="text-faint" style={{ fontSize: 11.5 }}>{user.role}</p>
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--good-soft)',
            color: 'var(--good)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            fontFamily: 'var(--font-display)',
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}