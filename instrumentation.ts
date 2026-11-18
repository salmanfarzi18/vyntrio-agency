import type {Instrumentation} from 'next';
export async function register(){if(process.env.NEXT_RUNTIME==='nodejs'){const {startServerMonitoring}=await import('./lib/monitoring-server');startServerMonitoring();}}
export const onRequestError:Instrumentation.onRequestError=async(error)=>{
 if(process.env.NEXT_RUNTIME==='nodejs'){const {reportServerError,flushMonitoring}=await import('./lib/monitoring-server');reportServerError(error);await flushMonitoring();}
};
