'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { readDatabase, writeDatabase, invalidateDatabase } from '@/lib/admin/repository';
import { seedDatabase } from '@/data/admin/seed';
import type { AdminDatabase, AdminRecord, Module, Role } from '@/types/admin';
import { rolePermissions } from '@/types/admin';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export type AdminContextValue = {
    db: AdminDatabase;
    role: Role;
    driverId: string;
    session: boolean;
    ready: boolean;
    toast: string;
    notify: (text: string) => void;
    login: (role: Role, driverId: string) => void;
    logout: () => void;
    can: (module: string) => boolean;
    mutate: (action: string, entity: string, update: (db: AdminDatabase) => void) => void;
    save: (module: Module, record: AdminRecord) => void;
    remove: (module: Module, id: string) => void;
    assign: (bookingId: string, driverId: string, vehicleId: string) => void;
};
const Context = createContext<AdminContextValue | null>(null);
export function AdminProvider({ children }: {
    children: ReactNode;
}) {
    const [db, setDb] = useState(seedDatabase), [role, setRole] = useState<Role>('SUPER_ADMIN'), [driverId, setDriverId] = useState(''), [session, setSession] = useState(false), [ready, setReady] = useState(false), [toast, setToast] = useState('');
    useEffect(() => { const refresh = () => { setDb(copy(readDatabase())); }; const externalRefresh = () => { invalidateDatabase(); refresh(); }; const timer = setTimeout(() => { refresh(); try {
        const value = JSON.parse(sessionStorage.getItem('sukhad-demo-session') || 'null');
        if (value && value.role in rolePermissions) {
            setRole(value.role);
            setDriverId(value.driverId || '');
            setSession(true);
        }
    }
    catch { } setReady(true); }, 0); window.addEventListener('storage', externalRefresh); window.addEventListener('sukhad-admin-change', refresh); return () => { clearTimeout(timer); window.removeEventListener('storage', externalRefresh); window.removeEventListener('sukhad-admin-change', refresh); }; }, []);
    useEffect(() => { if (!toast)
        return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); }, [toast]);
    const can = (module: string) => rolePermissions[role].includes('*') || rolePermissions[role].includes(module);
    function mutate(action: string, entity: string, update: (draft: AdminDatabase) => void) { const draft = copy(readDatabase()); update(draft); draft.collections.activity.unshift({ id: crypto.randomUUID(), name: action, status: 'SUCCESS', isDemo: true, admin: `Demo ${role.toLowerCase().replaceAll('_', ' ')}`, action, entity, date: new Date().toISOString() }); const persisted = writeDatabase(draft); setDb(draft); setToast(persisted ? `${action} · saved in this browser` : `${action} · memory only; browser storage is full or unavailable`); }
    function save(module: Module, record: AdminRecord) {
        if (!can(module))
            throw Error('This demo role cannot edit this module.');
        if (module === 'bookings' && record.driverId && !['COMPLETED', 'CANCELLED'].includes(record.status)) {
            const current = readDatabase();
            const vehicle = current.collections.vehicles.find(v => v.id === record.vehicleId);
            if (vehicle && Number(vehicle.seats) < Number(record.travellers)) throw Error('The assigned vehicle has too few seats. Change the vehicle first.');
            if (current.assignments.some(a => a.bookingId !== record.id && (a.driverId === record.driverId || a.vehicleId === record.vehicleId) && a.startDate <= String(record.endDate) && a.endDate >= String(record.startDate))) throw Error('The new dates overlap an existing fleet assignment.');
        }
        mutate('Saved ' + module, record.id, draft => {
            const i = draft.collections[module].findIndex(r => r.id === record.id);
            if (i < 0)
                draft.collections[module].push(record);
            else
                draft.collections[module][i] = record;
            if (module === 'bookings') {
                if (['COMPLETED', 'CANCELLED'].includes(record.status)) {
                    const assignment = draft.assignments.find(a => a.bookingId === record.id);
                    if (assignment) {
                        const driver = draft.collections.drivers.find(d => d.id === assignment.driverId);
                        const vehicle = draft.collections.vehicles.find(v => v.id === assignment.vehicleId);
                        if (driver) driver.status = 'AVAILABLE';
                        if (vehicle) vehicle.status = 'AVAILABLE';
                    }
                    draft.assignments = draft.assignments.filter(a => a.bookingId !== record.id);
                } else {
                    draft.assignments.filter(a => a.bookingId === record.id).forEach(a => { a.startDate = String(record.startDate); a.endDate = String(record.endDate); });
                }
                draft.collections.trips.filter(t => t.bookingId === record.id).forEach(t => {
                    t.startDate = record.startDate; t.endDate = record.endDate;
                    if (['COMPLETED', 'CANCELLED'].includes(record.status)) t.status = record.status;
                });
            }
            if (module === 'payments') {
                const booking = draft.collections.bookings.find(b => b.id === record.bookingId);
                if (booking) {
                    const paid = draft.collections.payments.filter(p => p.bookingId === booking.id && p.status !== 'REFUNDED' && p.status !== 'PENDING').reduce((sum, p) => sum + Number(p.amount), 0);
                    booking.paymentStatus = paid >= Number(booking.total) ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
                }
            }
        });
    }
    function remove(module: Module, id: string) {
        if (!can(module)) throw Error('This demo role cannot delete this record.');
        const current = readDatabase();
        if ((module === 'drivers' && current.assignments.some(a => a.driverId === id)) ||
            (module === 'vehicles' && current.assignments.some(a => a.vehicleId === id))) {
            setToast('Release the current assignment before deleting this resource.');
            return;
        }
        mutate('Deleted ' + module, id, draft => {
            const removed = draft.collections[module].find(r => r.id === id);
            draft.collections[module] = draft.collections[module].filter(r => r.id !== id);
            if (module === 'payments' && removed) {
                const booking = draft.collections.bookings.find(b => b.id === removed.bookingId);
                if (booking) {
                    const paid = draft.collections.payments.filter(p => p.bookingId === booking.id && !['PENDING', 'REFUNDED'].includes(p.status)).reduce((sum, p) => sum + Number(p.amount), 0);
                    booking.paymentStatus = paid >= Number(booking.total) ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
                }
            }
        });
    }
    function assign(bookingId: string, newDriverId: string, newVehicleId: string) { if (!can('bookings') && !can('trips'))
        throw Error('Assignment is unavailable for this role.'); const current = readDatabase(); const booking = current.collections.bookings.find(b => b.id === bookingId); const driver = current.collections.drivers.find(d => d.id === newDriverId); const vehicle = current.collections.vehicles.find(v => v.id === newVehicleId); if (!booking || !driver || !vehicle)
        throw Error('Choose a booking, driver and vehicle.'); if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED')
        throw Error('This booking is closed.'); if (!booking.startDate || !booking.endDate) throw Error('Set the trip dates before assigning a driver.'); if (driver.status !== 'AVAILABLE' && booking.driverId !== driver.id)
        throw Error('This driver is unavailable.'); if (vehicle.status !== 'AVAILABLE' && booking.vehicleId !== vehicle.id)
        throw Error('This vehicle is unavailable.'); if (Number(vehicle.seats) < Number(booking.travellers))
        throw Error('The vehicle has too few seats.'); const overlaps = current.assignments.some(a => a.bookingId !== booking.id && (a.driverId === driver.id || a.vehicleId === vehicle.id) && a.startDate <= String(booking.endDate) && a.endDate >= String(booking.startDate)); if (overlaps)
        throw Error('An existing assignment overlaps these dates.'); mutate('Assigned driver and vehicle', booking.id, draft => { const b = draft.collections.bookings.find(b => b.id === bookingId)!; const oldDriver = draft.collections.drivers.find(d => d.id === b.driverId); const oldVehicle = draft.collections.vehicles.find(v => v.id === b.vehicleId); if (oldDriver)
        oldDriver.status = 'AVAILABLE'; if (oldVehicle)
        oldVehicle.status = 'AVAILABLE'; b.driverId = driver.id; b.vehicleId = vehicle.id; draft.collections.drivers.find(d => d.id === driver.id)!.status = 'ASSIGNED'; draft.collections.vehicles.find(v => v.id === vehicle.id)!.status = 'ASSIGNED'; draft.assignments = draft.assignments.filter(a => a.bookingId !== b.id); draft.assignments.push({ id: crypto.randomUUID(), bookingId: b.id, driverId: driver.id, vehicleId: vehicle.id, startDate: String(b.startDate), endDate: String(b.endDate) }); let trip = draft.collections.trips.find(t => t.bookingId === b.id); if (!trip) {
        trip = { id: 'TRIP-' + b.id, name: b.name, bookingId: b.id, status: 'ASSIGNED', isDemo: true };
        draft.collections.trips.push(trip);
    } Object.assign(trip, { driverId: driver.id, vehicleId: vehicle.id, startDate: b.startDate, endDate: b.endDate, status: 'ASSIGNED' }); }); }
    function login(nextRole: Role, nextDriverId: string) { setRole(nextRole); setDriverId(nextDriverId); setSession(true); try {
        sessionStorage.setItem('sukhad-demo-session', JSON.stringify({ role: nextRole, driverId: nextDriverId }));
    }
    catch { } }
    function logout() { setSession(false); try {
        sessionStorage.removeItem('sukhad-demo-session');
    }
    catch { } }
    return <Context.Provider value={{ db, role, driverId, session, ready, toast, notify: setToast, can, login, logout, mutate, save, remove, assign }}>{children}</Context.Provider>;
}
export function useAdmin() { const value = useContext(Context); if (!value)
    throw Error('AdminProvider is required'); return value; }

