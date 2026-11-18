'use client';
import {useEffect} from 'react';
import {reportBrowserError} from '@/lib/monitoring-browser';
export default function ManagementError({error,retry}:{error:Error & {digest?:string};retry:()=>void}){useEffect(()=>{reportBrowserError(error);},[error]);return <main className="workspace-loading"><h1>We couldn’t open management.</h1><p>Your saved records have not been changed. Please retry.</p><button className="button primary" onClick={retry}>Try again</button><a className="button" href="/management/login">Back to management sign-in</a></main>;}
