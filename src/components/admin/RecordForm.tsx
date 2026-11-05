'use client';
import { useState, useCallback } from 'react';
import type { AdminRecord, Module, FieldValue } from '@/types/admin';
import { configs, type Field } from '@/data/admin/config';
import { safeUrl } from '@/lib/admin/repository';
import { useAdmin } from './AdminProvider';
import { FormDrawer, ImageUploader, DocumentUploader } from './ui';
export function RecordForm({ module, record, onClose }: {
    module: Module;
    record?: AdminRecord;
    onClose: () => void;
}) {
    const { db, save } = useAdmin();
    const config = configs[module];
    const [form, setForm] = useState<AdminRecord>(() => record ? { ...record } : { id: module + '-' + crypto.randomUUID(), name: '', status: config.statuses[0], isDemo: true, ...Object.fromEntries(config.fields.map(f => [f.key, f.type === 'number' ? (f.key === 'displayDuration' ? 7 : f.key === 'order' ? db.collections.offers.length + 1 : 0) : f.type === 'checkbox' ? (f.key === 'isDemo') : f.options?.[0] || ''])) });
    const [error, setError] = useState('');
    const close = useCallback(() => onClose(), [onClose]);
    function change(key: string, value: FieldValue) { setForm(old => ({ ...old, [key]: value })); }
    function submit(e: React.FormEvent) { e.preventDefault(); setError(''); try {
        const next = { ...form };
        if (module === 'offers') {
            next.name = String(next.title);
            next.status = next.active ? 'ACTIVE' : 'INACTIVE';
            if (!safeUrl(String(next.href)))
                throw Error('Use a local /path or an https:// URL for this offer.');
            if (next.image && !String(next.image).startsWith('data:image/') && !safeUrl(String(next.image)))
                throw Error('Use a valid image path or upload an image.');
            if (Number(next.displayDuration) < 3 || Number(next.displayDuration) > 30)
                throw Error('Display duration must be 3–30 seconds.');
        }
        if (next.startDate && next.endDate && next.endDate < next.startDate)
            throw Error('End date must be on or after start date.');
        if (module === 'reviews' && next.status === 'PUBLISHED' && !next.consent)
            throw Error('Customer consent is required before publication.');
        if (module === 'bookings' && Number(next.travellers) < 1)
            throw Error('Add at least one traveller.');
        if (module === 'payments') {
            if (Number(next.amount) <= 0)
                throw Error('Payment amount must be greater than zero.');
            if (!next.bookingId)
                throw Error('Select a booking for this payment.');
        }
        if (module === 'documents' && !next.dataUrl)
            throw Error('Choose a local file before saving.');
        if (module === 'enquiries' && next.status === 'CONVERTED' && record?.status !== 'CONVERTED')
            throw Error('Use Convert to Booking after customer confirmation.');
        if (module === 'drivers' || module === 'vehicles') {
            const assigned = db.assignments.some(a => module === 'drivers' ? a.driverId === next.id : a.vehicleId === next.id);
            if (assigned && next.status === 'AVAILABLE')
                throw Error('Release the current booking assignment before marking this resource available.');
        }
        if (module !== 'offers')
            next.isDemo = true;
        save(module, next);
        onClose();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to save');
    } }
    const fields = config.fields;
    function render(field: Field) { const value = form[field.key] ?? ''; if (field.type === 'image')
        return <ImageUploader value={String(value)} onChange={v => change(field.key, v)} onError={setError}/>; if (field.type === 'document')
        return <DocumentUploader value={String(value)} onChange={(v, file) => { setForm(old => ({ ...old, [field.key]: v, fileName: file?.name || '', mimeType: file?.type || '' })); }} onError={setError}/>; if (field.relation) {
        const options = field.relation === 'itineraries' ? db.itineraries : db.collections[field.relation];
        return <select value={String(value)} required={module === 'payments'} onChange={e => change(field.key, e.target.value)}><option value="">Not linked</option>{options.map(r => <option key={r.id} value={r.id}>{r.name} · {r.id}</option>)}</select>;
    } if (field.options)
        return <select value={String(value)} onChange={e => change(field.key, e.target.value)}>{field.options.map(o => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}</select>; if (field.type === 'textarea')
        return <textarea value={String(value)} onChange={e => change(field.key, e.target.value)}/>; if (field.type === 'checkbox')
        return <input type="checkbox" checked={Boolean(value)} onChange={e => change(field.key, e.target.checked)}/>; return <input type={field.type || 'text'} required={field.required} min={field.type === 'number' ? 0 : undefined} value={String(value)} onChange={e => change(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}/>; }
    return <FormDrawer title={`${record ? 'Edit' : 'New'} ${config.singular}`} onClose={close}><p className="a-inline-note">Demo data · saved only in this browser. No supplier or remote service is contacted.</p>{error && <p className="a-error" role="alert">{error}</p>}<form onSubmit={submit}><div className="a-form-grid">{fields.map(f => <label key={f.key} className={`a-field ${['textarea', 'image', 'document'].includes(f.type || '') ? 'a-field-wide' : ''}`}><span>{f.label}{f.required ? ' *' : ''}</span>{render(f)}</label>)}{module !== 'offers' && <label className="a-field"><span>Status</span><select value={form.status} onChange={e => change('status', e.target.value)}>{config.statuses.map(s => <option key={s}>{s}</option>)}</select></label>}</div><div className="a-form-footer"><button type="button" className="a-btn" onClick={onClose}>Cancel</button><button className="a-btn a-primary" type="submit">Save {config.singular.toLowerCase()}</button></div></form></FormDrawer>;
}
