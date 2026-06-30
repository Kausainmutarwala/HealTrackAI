/**
 * AlertBox
 * props:
 *  - alerts: [{ id, patientName, message, time }]
 *  - onDismiss: (id) => void
 */
export default function AlertBox({ alerts = [], onDismiss }) {
  if (alerts.length === 0) {
    return (
      <div className="card card-pad" style={{ borderColor: 'var(--border)' }}>
        <span className="eyebrow">Emergency alerts</span>
        <p className="text-muted" style={{ marginTop: 8, fontSize: 13.5 }}>
          No active alerts. High-risk patients will show up here the moment the risk engine flags them.
        </p>
      </div>
    );
  }

  return (
    <div className="card card-pad" style={{ borderColor: 'rgba(242,61,92,0.35)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="eyebrow" style={{ color: 'var(--danger)' }}>Emergency alerts</span>
        <span className="badge badge-danger">{alerts.length} active</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-soft)',
              borderLeft: '3px solid var(--danger)',
            }}
          >
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{alert.patientName}</p>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 3 }}>{alert.message}</p>
              <span className="text-faint mono" style={{ fontSize: 11 }}>{alert.time}</span>
            </div>
            {onDismiss && (
              <button
                className="btn-ghost"
                style={{ padding: '6px 10px', fontSize: 12, height: 'fit-content' }}
                onClick={() => onDismiss(alert.id)}
              >
                Dismiss
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
