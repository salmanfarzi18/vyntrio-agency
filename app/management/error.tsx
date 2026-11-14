'use client';
export default function ManagementError({reset}:{reset:()=>void}){return <main className="workspace-loading"><h1>We couldn’t open management.</h1><p>Your saved records have not been changed. Please retry.</p><button className="button primary" onClick={reset}>Try again</button><a className="button" href="/management/login">Back to management sign-in</a></main>;}
