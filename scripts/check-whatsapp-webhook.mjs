import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { serverModuleLoader } from './server-module-loader.mjs';

const originalEnv = { ...process.env }, originalInfo = console.info;
const logs = [], events = new Map(), conversations = new Map();
let leads = 0, notifications = 0, customers = 0, fail = false, rollbacks = 0, snapshot;
const connection = {
  async beginTransaction() { snapshot = { events: new Map(events), conversations: new Map(conversations), leads, notifications, customers }; },
  async commit() {},
  async rollback() { rollbacks++; events.clear(); conversations.clear(); for (const [k,v] of snapshot.events) events.set(k,v); for (const [k,v] of snapshot.conversations) conversations.set(k,v); ({ leads, notifications, customers } = snapshot); },
  release() {},
  async execute(sql, args = []) {
    if (fail && sql.startsWith('INSERT INTO whatsapp_events')) throw Error('PRIVATE_DATABASE_DETAILS');
    if (sql.startsWith('SELECT lock_id')) return [[{ lock_id: 1 }]];
    if (sql.startsWith('SELECT event_key')) return [events.has(args[0]) ? [{}] : []];
    if (sql.startsWith('SELECT conversation_key')) return [conversations.has(args[0]) ? [{}] : []];
    if (sql.startsWith('SELECT customer_id')) return [[]];
    if (sql.startsWith('INSERT INTO customers')) customers++;
    if (sql.startsWith('INSERT INTO cab_enquiries')) leads++;
    if (sql.startsWith('INSERT INTO notifications')) notifications++;
    if (sql.startsWith('INSERT INTO whatsapp_conversations')) conversations.set(args[0], args);
    if (sql.startsWith('INSERT INTO whatsapp_events')) events.set(args[0], args);
    return [{ affectedRows: 1 }];
  },
};
try {
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test-only-verify';
  process.env.META_APP_SECRET = 'test-only-secret';
  console.info = line => logs.push(line);
  const load = serverModuleLoader({ '@/lib/db': { getDatabasePool: () => ({ getConnection: async () => connection }) } });
  const { GET, POST } = load('src/app/api/whatsapp/webhook/route');
  const url = 'https://sukhadholidays.in/api/whatsapp/webhook';
  const verify = params => GET(new Request(url + '?' + new URLSearchParams(params)));
  const params = { 'hub.mode': 'subscribe', 'hub.verify_token': 'test-only-verify', 'hub.challenge': '123456' };
  let response = await verify(params);
  assert.equal(response.status, 200); assert.equal(await response.text(), '123456');
  assert.match(response.headers.get('content-type'), /text\/plain/);
  assert.equal((await verify({ ...params, 'hub.verify_token': 'wrong' })).status, 403);
  assert.equal((await verify({ ...params, 'hub.mode': 'other' })).status, 403);
  assert.equal((await verify({})).status, 400);
  const message = { from: '919876543210', id: 'wamid.test', type: 'text', timestamp: '1795400000', text: { body: 'PRIVATE_MESSAGE_CONTENT' } };
  const payload = (messages = [message], statuses = []) => ({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '12345' }, messages, statuses } }] }] });
  const post = (value, signature) => {
    const body = typeof value === 'string' ? value : JSON.stringify(value);
    return POST(new Request(url, { method: 'POST', body, headers: { 'x-hub-signature-256': signature ?? 'sha256=' + createHmac('sha256', process.env.META_APP_SECRET).update(body).digest('hex') } }));
  };
  assert.equal((await post(payload(), 'sha256=' + '0'.repeat(64))).status, 403);
  assert.equal(events.size, 0);
  assert.equal((await post(payload(), '')).status, 403);
  assert.equal((await post(payload())).status, 200);
  assert.equal(events.size, 1); assert.equal(leads, 1); assert.equal(customers, 1); assert.equal(notifications, 1);
  assert.equal(JSON.parse([...events.values()][0][6]).text, message.text.body);
  assert.equal((await post(payload())).status, 200);
  assert.equal(events.size, 1); assert.equal(leads, 1);
  assert.equal((await post(payload([{ ...message, id: 'wamid.second' }]))).status, 200);
  assert.equal(leads, 1); assert.equal(customers, 1);
  for (const status of ['sent', 'delivered', 'read', 'failed']) {
    const p = payload([], [{ id: 'wamid.outgoing', recipient_id: message.from, timestamp: message.timestamp, status, errors: [{ code: 131000, message: 'PRIVATE_ERROR' }] }]);
    assert.equal((await post(p)).status, 200); assert.equal((await post(p)).status, 200);
  }
  assert.equal(events.size, 6); assert.equal(leads, 1);
  for (const type of ['image', 'document', 'audio', 'video', 'interactive', 'unknown']) {
    assert.equal((await post(payload([{ ...message, id: 'wamid.' + type, type, [type]: { id: 'media', caption: 'caption', type: 'button_reply', button_reply: { id: 'yes', title: 'Yes' } } }]))).status, 200);
  }
  const stored = id => JSON.parse([...events.values()].find(row => row[3] === id)[6]);
  assert.equal(stored('wamid.document').media.id, 'media');
  assert.equal(stored('wamid.video').media.caption, 'caption');
  assert.equal(stored('wamid.interactive').interactive.id, 'yes');
  assert.deepEqual(stored('wamid.outgoing').errorCodes, [131000]);
  for (const value of [{}, { object: 'page' }, payload([null, {}, { id: 'bad' }]), { object: 'whatsapp_business_account', entry: [null] }]) assert.equal((await post(value)).status, 200);
  for (const value of ['{broken', 'null', '[]']) assert.equal((await post(value)).status, 400);
  assert.equal((await post('x'.repeat(1024 * 1024 + 1))).status, 413);
  const before = events.size;
  fail = true;
  const retry = payload([{ ...message, from: '919999999999', id: 'wamid.retry' }]);
  response = await post(retry); assert.equal(response.status, 503); assert.equal(await response.text(), 'Service unavailable');
  assert.equal(events.size, before); assert.equal(leads, 1); assert.equal(rollbacks, 1);
  fail = false; assert.equal((await post(retry)).status, 200); assert.equal(leads, 2);
  const tampered = JSON.stringify(payload()) + ' ';
  assert.equal((await post(tampered, 'sha256=' + createHmac('sha256', process.env.META_APP_SECRET).update(JSON.stringify(payload())).digest('hex'))).status, 403);
  delete process.env.META_APP_SECRET; assert.equal((await POST(new Request(url, { method: 'POST' }))).status, 503);
  delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN; assert.equal((await verify(params)).status, 503);
  assert(!logs.join('').match(/PRIVATE_|test-only-|919876543210/));
  originalInfo('WhatsApp webhook checks passed: verification, raw signatures, messages/media, statuses, duplicate delivery, limits, rollback/retry, redaction and configuration. No real database or network used.');
} finally { console.info = originalInfo; process.env = originalEnv; }
