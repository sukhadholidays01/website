import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { serverModuleLoader } from './server-module-loader.mjs';

const originalEnv = { ...process.env }, originalFetch = globalThis.fetch;
const token = 'sk.synthetic-test-only', publicToken = 'pk.synthetic-test-only';
const feature = (overrides = {}) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [77.365, 28.627] }, properties: { name: 'Sector 62', full_address: 'Sector 62, Noida, Uttar Pradesh, India', place_formatted: 'Noida, Uttar Pradesh, India', feature_type: 'locality', coordinates: { accuracy: 'approximate' }, context: { country: { country_code: 'IN' }, place: { name: 'Noida' } } }, ...overrides });
const collection = features => ({ type: 'FeatureCollection', features });
let calls = 0, failStatus = 0, throwNetwork = false, malformed = false;
try {
  process.env.CAB_GEOCODING_PROVIDER = 'mapbox';
  process.env.CAB_MAPBOX_PERMANENT_GEOCODING = 'true';
  process.env.CAB_MAPBOX_TOKEN = token;
  process.env.NEXT_PUBLIC_CAB_MAPBOX_TOKEN = publicToken;
  process.env.CAB_SESSION_SECRET = 'isolated-map-signing-secret';
  process.env.CAB_STORAGE_MODE = 'memory'; process.env.NODE_ENV = 'development';
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url.origin + url.pathname, 'https://api.mapbox.com/search/geocode/v6/forward');
    assert.equal(url.searchParams.get('permanent'), 'true'); assert.equal(url.searchParams.get('country'), 'in');
    assert.equal(url.searchParams.get('access_token'), token); assert.equal(url.searchParams.get('language'), 'en,hi');
    assert.equal(options.cache, 'no-store'); assert.equal(url.searchParams.get('limit'), '5');
    if (throwNetwork) throw Error(token + ' private upstream URL');
    if (failStatus) return new Response(JSON.stringify({ message: token }), { status: failStatus });
    return new Response(malformed ? '{broken' : JSON.stringify(collection([feature()])), { status: 200 });
  };
  const load = serverModuleLoader(), adapter = load('src/lib/cab/mapbox-geocoding'), maps = load('src/lib/cab/maps');
  const { placeSchema, journeySchema } = load('src/lib/cab/validation');
  assert.equal(adapter.parseMapboxGeocoding(collection([feature()]))[0].city, 'Noida');
  for (const invalid of [null, {}, [], { features: [] }, { type: 'FeatureCollection', features: null }]) assert.throws(() => adapter.parseMapboxGeocoding(invalid));
  assert.deepEqual(adapter.parseMapboxGeocoding(collection([])), []);
  for (const coordinates of [[0, 0], [77, 39], [67, 28], [99, 28], [77, 5], ['77', 28], [77, null], [NaN, 28]]) assert.equal(adapter.parseMapboxGeocoding(collection([feature({ geometry: { type: 'Point', coordinates } })])).length, 0);
  assert.equal(adapter.parseMapboxGeocoding(collection([feature({ properties: { name: 'Unknown' } })])).length, 0);
  assert.equal(adapter.parseMapboxGeocoding(collection([null, {}])).length, 0);
  const results = await maps.searchCabPlaces('Sector 62 Noida', { lat: 28.6, lon: 77.3 });
  const selected = results[0]; assert.match(selected.id, /^mapbox-[a-f0-9]{64}$/);
  assert.equal(selected.featureType, 'locality'); assert(!JSON.stringify(results).includes(token));
  assert.deepEqual(maps.canonicalPlace(selected), selected);
  const before = calls; await maps.searchCabPlaces('Sector 62 Noida', { lat: 28.6, lon: 77.3 }); assert.equal(calls, before, 'Permanent results safely reused');
  await maps.searchCabPlaces('Sector 62 Noida', { lat: 28.7, lon: 77.4 }); assert.equal(calls, before + 1, 'Proximity participates in cache identity');
  const pin = maps.confirmCabPin({ place: selected, lat: 28.628, lon: 77.366 });
  assert.match(pin.id, /^mapbox-pin-/); assert.equal(pin.lat, 28.628); maps.canonicalPlace(pin);
  assert.throws(() => maps.canonicalPlace({ ...pin, lat: 28.63 }));
  assert.throws(() => maps.canonicalPlace({ ...selected, id: selected.id.replace('mapbox-', 'osm-') }), 'Signatures bind the source prefix');
  assert.throws(() => maps.confirmCabPin({ place: selected, lat: 91, lon: 77 }));
  assert.throws(() => maps.confirmCabPin({ place: { ...selected, lon: 77 }, lat: 28, lon: 77 }));
  const legacy = { label: 'Legacy location', city: 'Noida', lat: 28.6, lon: 77.3 };
  legacy.id = 'osm-' + createHmac('sha256', process.env.CAB_SESSION_SECRET).update(JSON.stringify([legacy.label, legacy.city, legacy.lat, legacy.lon, false])).digest('hex');
  maps.canonicalPlace(legacy);
  const journey = { tripType: 'one-way', airportDirection: 'pickup', origin: pin, destination: load('src/data/cabPlaces').cabPlaces[0], departure: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16), vehicle: 'sedan', passengers: 2, pickupAddress: 'House 25, confirmed entrance', dropAddress: 'Drop hotel address' };
  const snapshot = JSON.parse(JSON.stringify(journeySchema.parse(journey)));
  assert.equal(snapshot.origin.lat, pin.lat); assert.equal(snapshot.origin.id, pin.id); assert.equal(snapshot.origin.featureType, undefined); maps.canonicalPlace(snapshot.origin);
  assert.equal(placeSchema.parse(selected).name, undefined, 'Presentation fields never enter booking snapshots');
  process.env.CAB_SITE_ORIGIN = 'https://cab-test.example.invalid';
  const limits = [];
  const apiLoad = serverModuleLoader({
    '@/lib/cab/maps': maps,
    '@/lib/cab/security': { ...load('src/lib/cab/security'), limitRequest: async (_request, action, maximum) => { limits.push({ action, maximum }); } },
    '@/lib/cab/commercial-api': { handleCommercialApi: async () => null },
    '@/lib/cab/guest-api': { handleGuestApi: async () => null },
  });
  const api = apiLoad('src/app/api/cab/[...path]/route');
  const context = { params: Promise.resolve({ path: ['places'] }) };
  let response = await api.GET(new Request(process.env.CAB_SITE_ORIGIN + '/api/cab/places?q=Sector%2062'), context);
  assert.equal(response.status, 200); assert(!(await response.text()).includes(token));
  response = await api.POST(new Request(process.env.CAB_SITE_ORIGIN + '/api/cab/places', { method: 'POST', headers: { origin: process.env.CAB_SITE_ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify({ place: selected, lat: 28.629, lon: 77.367 }) }), context);
  assert.equal(response.status, 200); maps.canonicalPlace((await response.json()).place);
  assert(limits.some(v => v.action === 'places' && v.maximum === 20));
  assert(limits.some(v => v.action === 'place-pin' && v.maximum === 20));
  response = await api.POST(new Request(process.env.CAB_SITE_ORIGIN + '/api/cab/places', { method: 'POST', headers: { origin: 'https://untrusted.example.invalid' }, body: '{}' }), context);
  assert.equal(response.status, 403, 'Pin signing retains same-origin protection');
  response = await api.GET(new Request(process.env.CAB_SITE_ORIGIN + '/api/cab/places?q=Noida&proximity=0,0'), context);
  assert.equal(response.status, 400);
  for (const status of [401, 403, 429, 500]) { failStatus = status; await assert.rejects(() => adapter.mapboxForward('test'), error => error.status === (status === 429 ? 429 : 503) && !error.message.includes(token)); }
  failStatus = 0; throwNetwork = true; await assert.rejects(() => adapter.mapboxForward('test'), error => !error.message.includes(token));
  throwNetwork = false; malformed = true; await assert.rejects(() => adapter.mapboxForward('test')); malformed = false;
  for (const key of ['CAB_MAPBOX_TOKEN', 'CAB_MAPBOX_PERMANENT_GEOCODING', 'NEXT_PUBLIC_CAB_MAPBOX_TOKEN', 'CAB_SESSION_SECRET']) {
    const value = process.env[key]; delete process.env[key];
    await assert.rejects(() => maps.searchCabPlaces('missing config ' + key)); process.env[key] = value;
  }
  process.env.NEXT_PUBLIC_CAB_MAPBOX_TOKEN = token;
  assert.throws(() => adapter.requireMapboxGeocoding(), 'Secret token is never accepted for a browser map');
  assert.throws(() => serverModuleLoader()('next.config'), 'Build configuration rejects a secret before browser bundling');
  process.env.NEXT_PUBLIC_CAB_MAPBOX_TOKEN = publicToken;
  process.env.CAB_MAPBOX_PERMANENT_GEOCODING = 'false';
  await assert.rejects(() => maps.searchCabPlaces('Sector 62 Noida', { lat: 28.6, lon: 77.3 }), 'Config gate applies even to cached data');
  console.log('PASS Mapbox v6 parsing, errors, bounds, permanent-only requests/cache, config gates, scoped/legacy signatures, adjusted pins, snapshot compatibility and token redaction. No live provider/database used.');
} finally { process.env = originalEnv; globalThis.fetch = originalFetch; }
