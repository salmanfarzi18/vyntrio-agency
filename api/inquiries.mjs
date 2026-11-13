const SCRIPT_URL='https://script.google.com/macros/s/AKfycbxT-lfMvF3fBRRzIGtQOATXMnZG3kfPO75adZmHjdksP47omDfwAU5qDC-Qp1mGrwYE/exec';
const cors={'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
const json=(value,status=200)=>Response.json(value,{status,headers:cors});
export default {async fetch(request){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
  if(request.method!=='POST')return json({ok:false,error:'Use the project inquiry form.'},405);
  if(Number(request.headers.get('content-length')||0)>32768)return json({ok:false,error:'Inquiry is too long.'},413);
  let input;
  try{const raw=await request.text();if(new TextEncoder().encode(raw).length>32768)return json({ok:false,error:'Inquiry is too long.'},413);input=JSON.parse(raw);}catch{return json({ok:false,error:'Invalid inquiry.'},400);}
  if(!input||typeof input!=='object'||Array.isArray(input))return json({ok:false,error:'Invalid inquiry.'},400);
  const payload={};
  for(const [key,max] of Object.entries({name:120,email:254,phone:30,projectType:120,projectDetails:10000,consent:10,inquiryId:40})){
    const value=typeof input[key]==='string'?input[key].trim():'';
    if(value.length>max)return json({ok:false,error:'One of your fields is too long.'},400);
    payload[key]=value;
  }
  if(!payload.name||!payload.phone||!payload.projectType||!payload.projectDetails||payload.consent!=='yes'||!/^\S+@\S+\.\S+$/.test(payload.email))return json({ok:false,error:'Please complete the required fields and contact consent.'},400);
  if(payload.inquiryId&&!/^VYN-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.inquiryId))return json({ok:false,error:'Invalid inquiry reference.'},400);
  try{
    const response=await fetch(SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'follow',signal:AbortSignal.timeout(25000)});
    if(!response.ok)return json({ok:false,error:'Saving is temporarily unavailable. Your details are still in the form.'},503);
    const result=await response.json();
    if(result.ok!==true||typeof result.inquiryId!=='string'||!result.inquiryId.startsWith('VYN-'))return json({ok:false,error:'Google Sheets has not confirmed saving. Your details are still in the form.'},503);
    return json({ok:true,inquiryId:result.inquiryId});
  }catch{return json({ok:false,error:'Saving could not be confirmed. Your details are still in the form; retry with the same details.'},503);}
}};
