'use client';
import { useState, useCallback } from 'react';
import { useAdmin } from './AdminProvider';
import { FormModal, StatusBadge } from './ui';
export function AssignmentModal({ bookingId, onClose }: {
    bookingId: string;
    onClose: () => void;
}) { const { db, assign } = useAdmin(); const booking = db.collections.bookings.find(b => b.id === bookingId); const [driver, setDriver] = useState(String(booking?.driverId || '')), [vehicle, setVehicle] = useState(String(booking?.vehicleId || '')), [error, setError] = useState(''); const close = useCallback(() => onClose(), [onClose]); if (!booking)
    return null; return <FormModal title="Assign driver & vehicle" onClose={close}><div className="a-panel a-panel-body"><div className="a-eyebrow">DEMO TRIP · {booking.id}</div><h3>{String(booking.destination)}</h3><p className="a-inline-note">{String(booking.startDate)} – {String(booking.endDate)} · {String(booking.travellers)} travellers</p></div>{error && <p className="a-error" role="alert">{error}</p>}<h3 className="a-section-title" style={{ marginTop: 20 }}>DRIVER AVAILABILITY</h3><div className="a-assignment-list">{db.collections.drivers.map(d => { const available = d.status === 'AVAILABLE' || d.id === booking.driverId; return <div key={d.id} className={`a-assignment ${driver === d.id ? 'selected' : ''}`}><span className="a-avatar">{d.name.slice(-1)}</span><div><strong>{d.name} <span className="a-demo">DEMO</span></strong><p>Vehicle: {db.collections.vehicles.find(v => v.id === d.vehicleId)?.name || 'Not linked'}</p><StatusBadge status={d.status}/></div><button className="a-btn" disabled={!available} onClick={() => { setDriver(d.id); const linked = db.collections.vehicles.find(v => v.id === d.vehicleId); if (linked && (linked.status === 'AVAILABLE' || linked.id === booking.vehicleId))
    setVehicle(linked.id); }}>{driver === d.id ? 'Selected' : available ? 'Select' : 'Unavailable'}</button></div>; })}</div><label className="a-field"><span>Vehicle · sufficient seating required</span><select value={vehicle} onChange={e => setVehicle(e.target.value)}><option value="">Select vehicle</option>{db.collections.vehicles.map(v => <option key={v.id} value={v.id} disabled={(v.status !== 'AVAILABLE' && v.id !== booking.vehicleId) || Number(v.seats) < Number(booking.travellers)}>{v.name} · {String(v.seats)} seats · {v.status}</option>)}</select></label><p className="a-inline-note">Unavailable drivers and vehicles cannot be assigned. Overlapping trip dates are checked again when saving.</p><div className="a-form-footer"><button className="a-btn" onClick={onClose}>Cancel</button><button className="a-btn a-primary" disabled={!driver || !vehicle} onClick={() => { try {
    assign(bookingId, driver, vehicle);
    onClose();
}
catch (e) {
    setError(e instanceof Error ? e.message : 'Assignment failed');
} }}>Confirm assignment</button></div></FormModal>; }
