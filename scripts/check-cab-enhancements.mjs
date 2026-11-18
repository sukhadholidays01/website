import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { loadCabModule } from "./cab-test-loader.mjs";

// Synthetic data and intercepted provider transport only. Never loads local credentials.
process.env.CAB_STORAGE_MODE = "memory";
process.env.NODE_ENV = "development";
process.env.RAZORPAY_KEY_ID = "rzp_test_synthetic";
process.env.RAZORPAY_KEY_SECRET = "synthetic-test-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "synthetic-webhook-secret";
const store = loadCabModule("src/lib/cab/store");
const security = loadCabModule("src/lib/cab/security");
const tracking = loadCabModule("src/lib/cab/tracking");
const gateway = loadCabModule("src/lib/cab/razorpay");
const payments = loadCabModule("src/lib/cab/payments");
const { renderCabEmail } = loadCabModule("src/lib/cab/email-templates");
const { cabPlaces } = loadCabModule("src/data/cabPlaces");
const token = "a".repeat(64), otherToken = "b".repeat(64);
const booking = { id: "SH-CAB-SYNTHETIC", requestKey: "synthetic", requestHash: "", accessHash: security.hash(token), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), journey: { tripType: "one-way", airportDirection: "pickup", origin: cabPlaces[0], destination: cabPlaces[1], departure: new Date(Date.now()+3600000).toISOString().slice(0,16), passengers: 2, vehicle: "sedan", pickupAddress: "Synthetic pickup", dropAddress: "Synthetic drop" }, route: null, fare: { method: "manual", total: 1000, distanceKm: null, billableKm: null, days: 1, lines: [], inclusions: "Test", exclusions: "Test", version: "v1" }, status: "ASSIGNED", customer: { name: "Synthetic traveller", phone: "9000000000", email: "test@example.invalid", notes: "Synthetic test" }, assignment: { driverId: "demo-driver-1", vehicleId: "demo-vehicle-0", driver: "Synthetic driver", phone: "9000000000", vehicle: "TEST ONLY" }, payments: [], history: [] };
await store.changeCabState(s => { s.bookings = [booking]; s.operations.settings.payments = { full: true, advance: true, advanceType: "percent", advanceValue: 25, payLater: true }; });
for (const kind of ["request", "quote", "accepted", "confirmation", "assignment", "driver-assignment", "started", "completed", "cancelled", "payment-success", "payment-failure", "refund", "admin-request", "status"]) assert(renderCabEmail(kind,booking).subject.length>0);
console.log("PASS all customer, driver and payment lifecycle email templates render without sending");
let state = await store.readCabState();
assert.equal(gateway.payableAmount(state, booking.id, "full"),100000);
assert.equal(gateway.payableAmount(state, booking.id, "advance"),25000);
state.operations.settings.payments.advance=false;
assert.throws(()=>gateway.payableAmount(state,booking.id,"advance"));
console.log("PASS full/advance paise calculation and disabled payment option");

const access = await tracking.issueDriverAccess(booking.id,"OWNER");
await assert.rejects(()=>tracking.updateDriverLocation(otherToken,{bookingId:booking.id,lat:26,lon:82,accuracy:10}));
await assert.rejects(()=>tracking.updateDriverLocation(access.token,{bookingId:booking.id,lat:91,lon:82,accuracy:10}));
await assert.rejects(()=>tracking.updateDriverLocation(access.token,{bookingId:"another-booking",lat:26,lon:82,accuracy:10}));
await tracking.updateDriverLocation(access.token,{bookingId:booking.id,lat:26,lon:82,accuracy:10});
await assert.rejects(()=>tracking.customerTracking(booking.id,otherToken));
assert.equal((await tracking.customerTracking(booking.id,token)).stale,false);
await store.changeCabState(s=>{s.locations[booking.id].at=new Date(Date.now()-180000).toISOString();});
assert.equal((await tracking.customerTracking(booking.id,token)).stale,true);
await store.changeCabState(s=>{s.bookings[0].assignment.driverId="demo-driver-2";});
await assert.rejects(()=>tracking.updateDriverLocation(access.token,{bookingId:booking.id,lat:26,lon:82,accuracy:10}));
await store.changeCabState(s=>{s.bookings[0].assignment.driverId="demo-driver-1";s.bookings[0].status="COMPLETED";});
await assert.rejects(()=>tracking.updateDriverLocation(access.token,{bookingId:booking.id,lat:26,lon:82,accuracy:10}));
assert.equal((await tracking.customerTracking(booking.id,token)).location,null);
await store.changeCabState(s=>{s.bookings[0].status="ASSIGNED";});
await tracking.issueDriverAccess(booking.id,"OWNER");
await assert.rejects(()=>tracking.updateDriverLocation(access.token,{bookingId:booking.id,lat:26,lon:82,accuracy:10}));
console.log("PASS GPS validation, assigned-driver isolation, customer authorisation, staleness, terminal status and credential revocation");

// Keep repository in memory; allow the gateway to exercise its persistent-mode boundary.
store.cabStorageMode = () => "mysql";
const originalFetch=globalThis.fetch;
let orders=0, captured=true, failed=false, wrongAmount=false, refundReceipt="", captures=0;
globalThis.fetch=async(url,options={})=>{
 assert(String(url).startsWith("https://api.razorpay.com/v1/"),"Unexpected network call");
 const endpoint=String(url).split("/v1/")[1];let body;
 if(endpoint==="orders"&&options.method==="POST"){orders++;const input=JSON.parse(options.body);assert.equal(input.amount,25000);assert.equal(input.partial_payment,false);body={id:"order_synthetic",amount:25000,currency:"INR"};}
 else if(endpoint==="orders/order_synthetic")body={id:"order_synthetic",amount:25000,currency:"INR",status:captured?"paid":"attempted",amount_paid:captured?25000:0};
 else if(endpoint==="payments/pay_synthetic"){captures++;body={id:"pay_synthetic",order_id:"order_synthetic",amount:wrongAmount?1:25000,currency:"INR",status:failed?"failed":captured?"captured":"authorized",captured};}
 else if(endpoint==="payments/pay_synthetic/refund"){refundReceipt=JSON.parse(options.body).receipt;body={id:"rfnd_synthetic"};}
 else if(endpoint==="refunds/rfnd_synthetic")body={id:"rfnd_synthetic",payment_id:"pay_synthetic",amount:25000,currency:"INR",receipt:refundReceipt,status:"processed"};
 else throw Error("Unexpected provider endpoint: "+endpoint);
 return new Response(JSON.stringify(body),{status:200,headers:{"Content-Type":"application/json"}});
};
try {
 await assert.rejects(()=>gateway.createRazorpayOrder(booking.id,otherToken,{option:"advance"}));
 await assert.rejects(()=>gateway.createRazorpayOrder(booking.id,token,{option:"advance",amount:1}));
 const first=await gateway.createRazorpayOrder(booking.id,token,{option:"advance"});
 const second=await gateway.createRazorpayOrder(booking.id,token,{option:"advance"});
 assert.equal(first.attempt.orderId,second.attempt.orderId);assert.equal(orders,1);
 const signature=createHmac("sha256",process.env.RAZORPAY_KEY_SECRET).update("order_synthetic|pay_synthetic").digest("hex");
 const callback={bookingId:booking.id,orderId:"order_synthetic",paymentId:"pay_synthetic",signature};
 await assert.rejects(()=>gateway.verifyCheckout({...callback,signature:"0".repeat(64)},token));
 wrongAmount=true;await assert.rejects(()=>gateway.verifyCheckout(callback,token));wrongAmount=false;
 captured=false;assert.equal((await gateway.verifyCheckout(callback,token)).status,"PENDING");
 failed=true;assert.equal((await gateway.reconcilePayment("order_synthetic","pay_synthetic","failure:synthetic")).status,"FAILED");failed=false;
 await gateway.createRazorpayOrder(booking.id,token,{option:"advance"});assert.equal(orders,1);
 captured=true;await gateway.verifyCheckout(callback,token);
 await gateway.verifyCheckout(callback,token);
 assert.equal((await store.readCabState()).bookings[0].payments.length,1);
 const raw=JSON.stringify({event:"payment.captured",payload:{payment:{entity:{id:"pay_synthetic",order_id:"order_synthetic"}}}});
 const webhookSignature=createHmac("sha256",process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest("hex");
 await assert.rejects(()=>gateway.razorpayWebhook(raw,"0".repeat(64),"event_test"));
 await gateway.razorpayWebhook(raw,webhookSignature,"event_test");await gateway.razorpayWebhook(raw,webhookSignature,"event_test");
 assert.equal((await store.readCabState()).bookings[0].payments.length,1);
 assert.equal(gateway.payableAmount(await store.readCabState(),booking.id,"full"),75000);
 await assert.rejects(()=>gateway.createRazorpayOrder(booking.id,token,{option:"advance"}));
 console.log("PASS backend order reservation/reuse, owner checks, browser amount rejection, signature checks, amount/capture reconciliation, duplicate callback/webhook and remaining balance");
 await gateway.requestRefund(first.attempt.id,"OWNER",{reason:"Synthetic refund test"});
 await gateway.reconcileRefund("rfnd_synthetic");
 assert.equal((await store.readCabState()).bookings[0].payments.filter(p=>p.type==="refund").length,1);
 console.log("PASS provider-verified refund and duplicate refund reconciliation");
 await store.changeCabState(s=>{s.operations.paymentAttempts=[];s.bookings[0].payments=[];s.refunds=[];});
 const beforeConcurrent=orders;
 const concurrent=await Promise.allSettled([gateway.createRazorpayOrder(booking.id,token,{option:"advance"}),gateway.createRazorpayOrder(booking.id,token,{option:"advance"})]);
 assert(concurrent.some(r=>r.status==="fulfilled"));assert.equal(orders,beforeConcurrent+1);
 await store.changeCabState(s=>{s.operations.paymentAttempts=[];});
 globalThis.fetch=async()=>{throw Error("Synthetic provider timeout");};
 await assert.rejects(()=>gateway.createRazorpayOrder(booking.id,token,{option:"advance"}));
 assert.equal((await store.readCabState()).operations.paymentAttempts[0].status,"RECONCILIATION_REQUIRED");
 await assert.rejects(()=>gateway.createRazorpayOrder(booking.id,token,{option:"advance"}));
 console.log("PASS failed-payment retry reuses its order, concurrent initiation creates one order, and uncertain creation blocks replacement");
 process.env.NODE_ENV="production";
 await assert.rejects(()=>payments.simulateCabPayment(booking.id,token,{}));
 await assert.rejects(()=>payments.initiateCabPayment(booking.id,token));
 process.env.RAZORPAY_KEY_ID="rzp_live_synthetic";
 delete process.env.CAB_RAZORPAY_LIVE_ENABLED;
 assert.equal(gateway.razorpayConfiguration().enabled,false);
 console.log("PASS production mock prohibition and explicit live activation gate");
 assert(captures>0);
} finally {globalThis.fetch=originalFetch;}
console.log("All cab enhancement checks passed. No provider request or real money movement occurred.");
