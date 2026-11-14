'use client';
export default function Error({reset}:{reset:()=>void}){
 return <main className="workspace-loading"><h1>We couldn’t load this page.</h1><p>Your saved records have not been changed. Please check your connection and retry.</p><button className="button primary" onClick={reset}>Try again</button><a className="button" href="/portal">Back to workspace</a></main>;
}
