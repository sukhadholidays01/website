import {ItineraryBuilder} from '@/components/admin/ItineraryBuilder';
export default async function Page({searchParams}:{searchParams:Promise<{booking?:string;preview?:string;new?:string}>}){const query=await searchParams;return <ItineraryBuilder bookingId={query.booking} previewId={query.preview} create={query.new==='1'}/>;}

