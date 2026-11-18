import {CustomerManagement} from '@/components/admin/CustomerManagement';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CustomerManagement id={id}/>;}
