import {Brand} from '@/components/brand';
export default function Loading(){
 return <main className="workspace-loading" aria-busy="true" aria-label="Loading your workspace"><Brand/><div role="status"><h1>Opening your workspace…</h1><p>Your private records are loading securely.</p></div><div className="workspace-loading-cards" aria-hidden="true"><span/><span/><span/></div></main>;
}
