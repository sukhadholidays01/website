'use client';
import { useSyncExternalStore } from 'react';
import { readDatabase, invalidateDatabase } from '@/lib/admin/repository';
import { seedDatabase } from '@/data/admin/seed';
import { CustomerItinerary } from './ItineraryBuilder';
import { EmptyState } from './ui';
const subscribe = (callback: () => void) => { const refresh = () => { invalidateDatabase(); callback(); }; window.addEventListener('storage', refresh); window.addEventListener('sukhad-admin-change', refresh); return () => { window.removeEventListener('storage', refresh); window.removeEventListener('sukhad-admin-change', refresh); }; };
export function PublicItineraryPreview({ id }: {
    id: string;
}) { const db = useSyncExternalStore(subscribe, readDatabase, () => seedDatabase); const itinerary = db.itineraries.find(i => i.id === id); return <div className="admin-root"><div style={{ maxWidth: 950, margin: 'auto', padding: '32px 16px' }}>{itinerary ? <CustomerItinerary itinerary={itinerary}/> : <EmptyState title="Demo itinerary unavailable" description="This preview uses local browser data. Save the itinerary in the admin workspace first."/>}</div></div>; }
