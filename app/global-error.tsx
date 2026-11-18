'use client';
import {useEffect} from 'react';
import {reportBrowserError} from '@/lib/monitoring-browser';
export default function GlobalError({error,retry}:{error:Error;retry:()=>void}){
 useEffect(()=>{reportBrowserError(error);},[error]);
 return <html lang="en"><body style={{fontFamily:'system-ui',padding:32,color:'#14243a'}}><h1>We couldn’t load this page.</h1><p>Please retry, or contact VYNTRIO if this continues.</p><button onClick={retry}>Try again</button><p><a href="mailto:vyntrioagency@gmail.com">Contact support</a></p></body></html>;
}
