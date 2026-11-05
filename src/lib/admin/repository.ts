import { seedDatabase } from '@/data/admin/seed';
import type { AdminDatabase, AdminRecord, Module, Promotion, Repository } from '@/types/admin';
export const storageKey = 'sukhad-operations-demo-v1';
let cache: AdminDatabase | undefined;
const clone = <T,>(value:T):T => JSON.parse(JSON.stringify(value));
export function readDatabase():AdminDatabase {
  if (typeof window === 'undefined') return seedDatabase;
  if (cache) return cache;
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (saved?.version===1 && saved.collections && saved.itineraries && saved.assignments) { cache=saved; return saved; } } catch { /* Local demo still works without persistence. */ }
  cache=clone(seedDatabase); return cache;
}
export function writeDatabase(database:AdminDatabase):boolean {
  cache=database;
  let persisted=true;
  try { localStorage.setItem(storageKey,JSON.stringify(database)); } catch { persisted=false; }
  window.dispatchEvent(new Event('sukhad-admin-change'));
  return persisted;
}
export function invalidateDatabase() { cache=undefined; }
export function mockRepository<T extends AdminRecord>(module:Module):Repository<T> {
  return {list:async()=>readDatabase().collections[module] as T[], get:async id=>readDatabase().collections[module].find(r=>r.id===id) as T|undefined,
    save:async record=>{const db=clone(readDatabase());const index=db.collections[module].findIndex(r=>r.id===record.id);if(index<0)db.collections[module].push(record);else db.collections[module][index]=record;writeDatabase(db);},
    remove:async id=>{const db=clone(readDatabase());db.collections[module]=db.collections[module].filter(r=>r.id!==id);writeDatabase(db);}};
}
export function publicOffers(database=readDatabase(), now=new Date()):Promotion[] {
  if (database.collections.settings[0]?.notifications === false) return [];
  return (database.collections.offers as Promotion[]).filter(p=>p.active && (!p.startDate||new Date(p.startDate)<=now) && (!p.endDate||new Date(p.endDate+'T23:59:59')>=now) && /^(\/[^/]|https?:\/\/)/.test(p.href)).sort((a,b)=>a.order-b.order||b.priority-a.priority);
}
export function safeUrl(value:string) { return /^(\/[^/]|https?:\/\/)/.test(value); }
export const money=(value:number,currency='INR')=>new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(value);
export function pendingBalance(database:AdminDatabase):number {
  return database.collections.bookings.filter(b=>b.status!=='CANCELLED').reduce((sum,b)=>{
    const paid=database.collections.payments.filter(p=>p.bookingId===b.id&&!['PENDING','REFUNDED'].includes(p.status)).reduce((amount,p)=>amount+Number(p.amount),0);
    return sum+Math.max(0,Number(b.total)-paid);
  },0);
}

