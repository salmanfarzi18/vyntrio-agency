// Preserve Cashfree's exact payload and signature. Verification and persistence
// happen in the private Apps Script backend; no payment keys live in this repo.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxT-lfMvF3fBRRzIGtQOATXMnZG3kfPO75adZmHjdksP47omDfwAU5qDC-Qp1mGrwYE/exec';
const MAX_BYTES = 256 * 1024;

export default {
  async fetch(request) {
    if (request.method === 'GET') return Response.json({ok:true,service:'VYNTRIO Cashfree webhook relay'});
    if (request.method !== 'POST') return Response.json({ok:false}, {status:405,headers:{Allow:'GET, POST'}});
    const signature=request.headers.get('x-webhook-signature')||'';
    const timestamp=request.headers.get('x-webhook-timestamp')||'';
    if (!/^[A-Za-z0-9+/]{43}=$/.test(signature)||!/^\d{10,16}$/.test(timestamp)) return Response.json({ok:false,error:'Missing or invalid webhook signature.'},{status:401});
    if (Number(request.headers.get('content-length')||0)>MAX_BYTES) return Response.json({ok:false},{status:413});
    const rawBody=await request.text();
    if (new TextEncoder().encode(rawBody).length>MAX_BYTES) return Response.json({ok:false},{status:413});
    try {
      JSON.parse(rawBody);
    } catch {return Response.json({ok:false,error:'Invalid JSON.'},{status:400});}
    try {
      const response=await fetch(SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cashfreeWebhook',rawBody,signature,timestamp}),redirect:'follow',signal:AbortSignal.timeout(25000)});
      if(!response.ok) return Response.json({ok:false,error:'Storage unavailable. Retry delivery.'},{status:503});
      const result=await response.json();
      if(result.ok!==true) return Response.json({ok:false,error:result.code==='invalid_signature'?'Signature rejected.':'Storage rejected delivery.'},{status:result.code==='invalid_signature'?401:503});
      return Response.json({ok:true,duplicate:!!result.duplicate,ignored:!!result.ignored});
    } catch {return Response.json({ok:false,error:'Storage unavailable. Retry delivery.'},{status:503});}
  }
};
