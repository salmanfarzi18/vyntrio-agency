// Public liveness only. Private diagnostics remain behind owner authentication.
export function GET(){return Response.json({ok:true,service:'vyntrio',status:'available'},{headers:{'Cache-Control':'no-store'}});}
