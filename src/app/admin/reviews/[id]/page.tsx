import {AdminRecordDetail} from '@/components/admin/AdminModule';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdminRecordDetail module="reviews" id={id}/>;}

