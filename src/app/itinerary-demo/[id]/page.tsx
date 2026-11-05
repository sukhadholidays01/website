import {PublicItineraryPreview} from '@/components/admin/PublicItineraryPreview';
import type {Metadata} from 'next';
import '../../admin/admin.css';
export const metadata:Metadata={title:'Demo itinerary | Sukhad Holidays',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <PublicItineraryPreview id={id}/>;}

