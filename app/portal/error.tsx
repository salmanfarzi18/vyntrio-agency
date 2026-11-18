'use client';
import {useEffect} from 'react';
import {reportBrowserError} from '@/lib/monitoring-browser';
export default function Error({error,retry}:{error:Error & {digest?:string};retry:()=>void}){useEffect(()=>{reportBrowserError(error);},[error]);
 return <main className="workspace-loading"><h1>We couldn’t load this page.</h1><p>Your saved records have not been changed. Please check your connection and retry.</p><button className="button primary" onClick={retry}>Try again</button><a className="button" href="/portal">Back to workspace</a></main>;
}
