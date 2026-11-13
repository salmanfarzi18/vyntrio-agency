import {Brand} from '@/components/brand';
import {PaymentReturn} from '@/components/payment-return';
export default async function PaymentReturnPage({searchParams}:{searchParams:Promise<{order_id?:string}>}){const {order_id=''}=await searchParams;return <main className="standalone"><Brand/><span className="eyebrow">SECURE PAYMENT</span><h1>Checking your payment.</h1><PaymentReturn orderId={order_id}/><a className="button" href="/portal/invoices">Open your workspace</a><a href="/">Back to website</a></main>;}
