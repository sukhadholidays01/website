export class CustomerRequestError extends Error {
  constructor(message:string,public code:string,public status:number){super(message);}
}
export async function customerRequest<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T> {
  const response=await fetch("/api/customer/"+path,{method:body===undefined?"GET":"POST",cache:"no-store",credentials:"same-origin",signal,
    headers:body===undefined?undefined:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok)throw new CustomerRequestError(result.error||"We could not complete your request. Please retry.",result.code||"REQUEST_ERROR",response.status);
  return result;
}
