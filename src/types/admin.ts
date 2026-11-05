export type BookingStatus = 'ENQUIRY' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type BookingType = 'Flight' | 'Bus' | 'Cab' | 'Holiday' | 'Custom Route';
export type DriverStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'OFF_DUTY' | 'INACTIVE';
export type VehicleStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'MAINTENANCE' | 'INACTIVE';
export type Role = 'SUPER_ADMIN' | 'OPERATIONS_MANAGER' | 'BOOKING_EXECUTIVE' | 'ACCOUNTANT' | 'DRIVER';
export type FieldValue = string | number | boolean;
export interface AdminRecord { id: string; name: string; status: string; isDemo: boolean; [key: string]: FieldValue }
export interface Customer extends AdminRecord { phone: string; email: string; travellers: number; notes: string }
export interface Booking extends AdminRecord { customerId: string; type: BookingType; status: BookingStatus; destination: string; startDate: string; endDate: string; travellers: number; total: number; driverId: string; vehicleId: string; itineraryId: string; paymentStatus: string }
export interface Enquiry extends AdminRecord { customerId: string; type: BookingType; destination: string; quote: number; confirmed: boolean }
export interface Driver extends AdminRecord { phone: string; email: string; license: string; licenseExpiry: string; experience: number; address: string; emergencyContact: string; status: DriverStatus; vehicleId: string; notes: string }
export interface Vehicle extends AdminRecord { category: string; registration: string; seats: number; ac: boolean; driverId: string; insuranceExpiry: string; permitExpiry: string; fitnessExpiry: string; status: VehicleStatus; image: string }
export interface Payment extends AdminRecord { bookingId: string; amount: number; method: string; date: string }
export interface Document extends AdminRecord { bookingId: string; category: string; fileName: string; mimeType: string; dataUrl: string }
export interface Promotion extends AdminRecord { title: string; subtitle: string; category: string; image: string; href: string; cta: string; active: boolean; priority: number; startDate: string; endDate: string; displayDuration: number; order: number; destination: string }
export interface HolidayPackage extends AdminRecord { destination: string; duration: number; theme: string; description: string; gallery: string; highlights: string; inclusions: string; exclusions: string; itineraryId: string; hotel: string; transport: string; price: number }
export interface Destination extends AdminRecord { country: string; region: string; description: string; image: string; gallery: string; themes: string; attractions: string; bestFor: string; duration: string }
export interface CustomRoute extends AdminRecord { origin: string; destinations: string; finalDestination: string; duration: number; style: string; activities: string; vehicleId: string; driverId: string; itineraryId: string; notes: string }
export interface Trip extends AdminRecord { bookingId: string; startDate: string; endDate: string; driverId: string; vehicleId: string }
export interface Hotel extends AdminRecord { destination: string; description: string; confirmation: string }
export interface FlightBooking extends AdminRecord { bookingId: string; origin: string; destination: string; reference: string }
export interface BusBooking extends AdminRecord { bookingId: string; origin: string; destination: string; reference: string }
export interface Review extends AdminRecord { customerId: string; text: string; consent: boolean }
export interface User extends AdminRecord { email: string; role: Role; driverId: string }
export interface VehicleAssignment { id: string; bookingId: string; vehicleId: string; driverId: string; startDate: string; endDate: string }
export interface ActivityLog extends AdminRecord { admin: string; action: string; entity: string; date: string }
export interface Notification extends AdminRecord { bookingId: string; message: string; channel: string }
export interface Activity { id: string; time: string; type: 'Activity' | 'Hotel' | 'Meal' | 'Transfer' | 'Note'; title: string; description: string }
export interface ItineraryDay { id: string; date: string; destination: string; title: string; description: string; activities: Activity[]; hotel: string; meals: string; transport: string; notes: string }
export interface Itinerary { id: string; name: string; status: string; isDemo: boolean; days: ItineraryDay[] }
export type Module = 'bookings' | 'enquiries' | 'trips' | 'customers' | 'drivers' | 'vehicles' | 'packages' | 'destinations' | 'hotels' | 'flights' | 'bus' | 'cabs' | 'custom-routes' | 'offers' | 'payments' | 'documents' | 'reviews' | 'users' | 'activity' | 'settings';
export interface AdminDatabase { collections: Record<Module, AdminRecord[]>; itineraries: Itinerary[]; assignments: VehicleAssignment[]; version: 1 }
export interface Repository<T> { list(): Promise<T[]>; get(id: string): Promise<T | undefined>; save(record: T): Promise<void>; remove(id: string): Promise<void> }
export const rolePermissions: Record<Role, readonly string[]> = {
  SUPER_ADMIN: ['*'], OPERATIONS_MANAGER: ['dashboard','bookings','trips','drivers','vehicles','itineraries','activity'],
  BOOKING_EXECUTIVE: ['dashboard','enquiries','customers','bookings'], ACCOUNTANT: ['dashboard','payments','documents','reports'], DRIVER: ['trips'],
};
