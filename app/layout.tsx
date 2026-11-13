import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:{default:'VYNTRIO Workspace',template:'%s · VYNTRIO'},description:'Your project, your progress, one shared workspace.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
