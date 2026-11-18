'use client';
import {useEffect} from 'react';
import {reportBrowserError} from '@/lib/monitoring-browser';
export default function ErrorPage({error,retry}:{error:Error & {digest?:string};retry:()=>void}){useEffect(()=>{reportBrowserError(error);},[error]);return <main className="standalone"><span className="eyebrow">SOMETHING NEEDS ATTENTION</span><h1>We couldn’t load this page.</h1><p>Your work is still safe. Please retry or contact VYNTRIO if the problem continues.</p><button className="button primary" onClick={retry}>Try again</button><a href="mailto:vyntrioagency@gmail.com">Contact support</a></main>;}
