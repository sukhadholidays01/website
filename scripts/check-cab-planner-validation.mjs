import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { serverModuleLoader } from './server-module-loader.mjs';
process.env.NODE_ENV = 'development';
process.env.CAB_STORAGE_MODE = 'memory';
process.env.CAB_ROUTING_PROVIDER = 'demo';
process.env.CAB_EMAIL_MODE = 'preview';
process.env.CAB_EMAIL_SEND_ENABLED = 'false';
const load = serverModuleLoader();
const { journeySchema } = load('src/lib/cab/validation');
const { cabPlaces } = load('src/data/cabPlaces');
const base = { tripType: 'one-way', airportDirection: 'pickup', origin: cabPlaces[0], destination: cabPlaces[1], passengers: 2, vehicle: 'sedan' };
const originalNow = Date.now;
const local = time => new Date(time + 330 * 60000).toISOString().slice(0,16);
try {
  for (const now of [Date.parse('2026-11-26T10:10:59+05:30'), Date.parse('2026-11-27T00:00:10+05:30')]) {
    Date.now = () => now;
    assert(journeySchema.safeParse({...base, departure:local(now)}).success, 'Current minute accepted');
    assert(journeySchema.safeParse({...base, departure:local(now + 60000)}).success, 'One minute ahead accepted');
    assert(!journeySchema.safeParse({...base, departure:local(now - 60000)}).success, 'Past minute rejected');
    assert(!journeySchema.safeParse({...base, departure:'2026-02-30T12:00'}).success, 'Impossible date rejected');
    assert(!journeySchema.safeParse({...base, tripType:'round-trip', departure:local(now), returnAt:local(now)}).success);
    const parsed = journeySchema.parse({...base, departure:local(now), pickupAddress:'', dropAddress:''});
    assert.equal(parsed.pickupAddress, '');
    assert(!journeySchema.safeParse({...base, departure:local(now), pickupAddress:'x'.repeat(401)}).success);
  }
} finally { Date.now = originalNow; }
const service = load('src/lib/cab/service'), store = load('src/lib/cab/store');
const accessToken = randomBytes(32).toString('hex');
const input = { journey:{...base,departure:local(Date.now()+60000)}, customer:{name:'Isolated Planner Test',phone:'+919000000003',email:'planner@example.invalid',notes:''},consent:true,requestKey:randomUUID(),accessToken };
const booking = await service.createCabBooking(input);
assert.equal(booking.status,'REQUESTED');
assert.equal(booking.assignment,undefined);
assert.equal(booking.payments.length,0);
assert.equal(booking.journey.pickupAddress,'');
assert.equal((await service.createCabBooking(input)).id,booking.id);
const state = await store.readCabState();
assert(state.operations.notifications.some(n=>n.bookingId===booking.id&&n.kind==='request'));
assert(state.operations.notifications.some(n=>n.bookingId===booking.id&&n.kind==='admin-request'));
console.log('PASS current-minute/one-minute pickup, IST midnight, past/invalid dates, return ordering, optional address limits, unchanged request idempotency, pending status, no assignment/payment and customer/admin outbox events. No database or provider used.');
