export class CustomerRequestError extends Error {
  constructor(message:string,public code:string,public status:number){super(message);}
}
export async function customerRequest<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T> {
  let response:Response;
  try {
    response=await fetch("/api/customer/"+path,{method:body===undefined?"GET":"POST",cache:"no-store",credentials:"same-origin",signal,
      headers:body===undefined?undefined:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  } catch(error) {
    if(signal?.aborted)throw error;
    throw new CustomerRequestError("Unable to connect. Check your connection and try again.","NETWORK_ERROR",0);
  }
  let result:unknown;
  try {result=await response.json();}catch{result=null;}
  const data=result&&typeof result==="object"?result as Record<string,unknown>:null;
  if(!response.ok){
    const fallback=response.status===429?"Too many requests. Please try again later.":response.status>=500?"Customer account services are temporarily unavailable. Please try again later.":"We could not complete your request. Please check your details and retry.";
    const reference=typeof data?.requestId==="string"&&/^[a-f0-9-]{36}$/.test(data.requestId)?` Reference: ${data.requestId}.`:"";
    throw new CustomerRequestError((typeof data?.error==="string"?data.error:fallback)+reference,typeof data?.code==="string"?data.code:"REQUEST_ERROR",response.status);
  }
  if(!data)throw new CustomerRequestError("An unexpected response was received. Please try again later.","INVALID_RESPONSE",response.status);
  return result as T;
}
