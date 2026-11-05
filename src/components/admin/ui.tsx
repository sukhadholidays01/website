'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Search, ChevronLeft, ChevronRight, ImagePlus, FileUp, MoreHorizontal } from 'lucide-react';
export function StatusBadge({ status }: {
    status: string;
}) { return <span className={`a-badge a-status-${status.toLowerCase()}`}>{status.replaceAll('_', ' ')}</span>; }
export function PageHeader({ title, description, children }: {
    title: string;
    description: string;
    children?: ReactNode;
}) { return <div className="a-page-header"><div><div className="a-eyebrow">TRAVEL OPERATIONS <span className="a-demo">DEMO</span></div><h1>{title}</h1><p>{description}</p></div><div className="a-actions">{children}</div></div>; }
export function Breadcrumbs({ items }: {
    items: string[];
}) { return <nav aria-label="Breadcrumb" className="a-breadcrumb">{items.join(' / ')}</nav>; }
export function StatCard({ label, value, detail, icon }: {
    label: string;
    value: ReactNode;
    detail: string;
    icon: ReactNode;
}) { return <div className="a-stat"><div className="a-stat-top"><span>{label}</span><span className="a-stat-icon">{icon}</span></div><strong>{value}</strong><small>{detail}</small></div>; }
export function SearchInput({ value, onChange }: {
    value: string;
    onChange: (value: string) => void;
}) { return <label className="a-search"><Search size={17}/><input aria-label="Search records" placeholder="Search records…" value={value} onChange={e => onChange(e.target.value)}/></label>; }
export function FilterBar({ children }: {
    children: ReactNode;
}) { return <div className="a-filters">{children}</div>; }
export function EmptyState({ title = 'No records yet', description = 'Create a record to start this workflow.', children }: {
    title?: string;
    description?: string;
    children?: ReactNode;
}) { return <div className="a-empty"><span className="a-empty-icon">?</span><h3>{title}</h3><p>{description}</p>{children}</div>; }
export function DataTable({ headers, children }: {
    headers: string[];
    children: ReactNode;
}) { return <div className="a-table-scroll" tabIndex={0} role="region" aria-label="Records table"><table className="a-table"><thead><tr>{headers.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
export function Pagination({ page, count, onChange }: {
    page: number;
    count: number;
    onChange: (page: number) => void;
}) { const pages = Math.max(1, Math.ceil(count / 8)); return <div className="a-pagination"><span>{count} records · Page {page} of {pages}</span><div><button aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16}/></button><button aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)}><ChevronRight size={16}/></button></div></div>; }
export function FormModal({ title, children, onClose, wide = false }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
    wide?: boolean;
}) { const ref = useRef<HTMLDivElement>(null); const reduced = useReducedMotion(); useEffect(() => { const before = document.activeElement as HTMLElement; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; ref.current?.focus(); function key(e: KeyboardEvent) { if (e.key === 'Escape')
    onClose(); if (e.key === 'Tab') {
    const nodes = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea,select,[tabindex="0"]');
    if (!nodes?.length)
        return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault();
        last.focus();
    }
    else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
} } document.addEventListener('keydown', key); return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); before?.focus(); }; }, [onClose]); return <div className="a-overlay" onMouseDown={e => { if (e.target === e.currentTarget)
    onClose(); }}><motion.div ref={ref} tabIndex={-1} className={`a-modal ${wide ? 'a-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}><div className="a-modal-head"><h2>{title}</h2><button onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div>{children}</motion.div></div>; }
export const FormDrawer = FormModal;
export function ConfirmDialog({ title, description, onConfirm, onClose }: {
    title: string;
    description: string;
    onConfirm: () => void;
    onClose: () => void;
}) { return <FormModal title={title} onClose={onClose}><p>{description}</p><div className="a-form-footer"><button className="a-btn" onClick={onClose}>Keep record</button><button className="a-btn a-danger" onClick={onConfirm}>Confirm</button></div></FormModal>; }
export function DatePicker({ label, value, onChange }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) { return <label className="a-field"><span>{label}</span><input type="date" value={value} onChange={e => onChange(e.target.value)}/></label>; }
export function ImageUploader({ value, onChange, onError }: {
    value: string;
    onChange: (value: string, file?: File) => void;
    onError: (message: string) => void;
}) { return <Uploader image value={value} onChange={onChange} onError={onError}/>; }
export function DocumentUploader({ value, onChange, onError }: {
    value: string;
    onChange: (value: string, file?: File) => void;
    onError: (message: string) => void;
}) { return <Uploader value={value} onChange={onChange} onError={onError}/>; }
function Uploader({ image = false, value, onChange, onError }: {
    image?: boolean;
    value: string;
    onChange: (value: string, file?: File) => void;
    onError: (message: string) => void;
}) { return <div className="a-upload">{image ? <ImagePlus size={22}/> : <FileUp size={22}/>}<input type="file" aria-label={image ? 'Choose image' : 'Choose local document'} accept={image ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/jpeg,image/png,image/webp,text/plain'} onChange={e => { const file = e.target.files?.[0]; if (!file)
    return; if (file.size > 2 * 1024 * 1024) {
    onError('Choose a file smaller than 2 MB.');
    return;
} const allowed = image ? ['image/jpeg', 'image/png', 'image/webp'] : ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']; if (!allowed.includes(file.type)) {
    onError('This file type is unsupported.');
    return;
} const reader = new FileReader(); reader.onload = () => onChange(String(reader.result), file); reader.onerror = () => onError('Could not read this file.'); reader.readAsDataURL(file); }}/>{image && <input aria-label="Image URL" placeholder="Or enter an image path / URL" value={value.startsWith('data:') ? '' : value} onChange={e => onChange(e.target.value)}/>}<small>{value ? 'File selected · local browser storage' : 'Local browser storage only · maximum 2 MB'}</small></div>; }
export function ActionMenu({ children }: {
    children: ReactNode;
}) { return <details className="a-action-menu"><summary aria-label="Record actions"><MoreHorizontal size={20}/></summary><div>{children}</div></details>; }
export function Timeline({ items }: {
    items: {
        title: string;
        detail: string;
        time: string;
    }[];
}) { return <ol className="a-timeline">{items.map((item, i) => <li key={i}><span>{item.time}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}</ol>; }
export function ActivityLog({ items }: {
    items: {
        id: string;
        action: string;
        entity: string;
        date: string;
    }[];
}) { return <Timeline items={items.map(a => ({ title: a.action, detail: a.entity, time: new Date(a.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }) }))}/>; }
export function NotificationToast({ message }: {
    message: string;
}) { return <AnimatePresence>{message && <motion.div className="a-toast" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{message}</motion.div>}</AnimatePresence>; }
