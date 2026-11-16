const fs=require('node:fs');
const isPreview=process.env.VERCEL_ENV==='preview'||['deploy-preview','branch-deploy'].includes(process.env.CONTEXT);
const raw=process.env.NEXT_PUBLIC_SITE_URL||'https://vyntrio-agency.vercel.app';
const site=new URL(raw).origin;
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title='VYNTRIO Agency | Websites, Apps & Practical AI';
const description='VYNTRIO helps students, startups and growing businesses plan, design and build websites, mobile apps, practical AI solutions and startup MVPs.';
const pages={
 privacy:{title:'Privacy Policy',sections:[
 ['Who handles your information','VYNTRIO Agency provides this website and private project workspace. Contact vyntrioagency@gmail.com for privacy questions, access or correction requests, consent withdrawal, deletion requests, or grievances.'],
 ['What we collect and why','When you submit an inquiry, we collect your name, email, phone number, project type, requirements and contact consent to review your idea and respond. For agreed projects, we process account identifiers, messages, files, milestones, quotations, invoices and payment references to deliver the service and maintain records. Please do not upload passwords, government identity documents or bank credentials.'],
 ['Payments and service providers','Cashfree processes checkout and payment details; VYNTRIO stores order references, amounts and verified payment status rather than full card details. Vercel hosts the application. Supabase provides the database, authentication and private file storage. Google services deliver email and hold private encrypted backup copies. Cloudflare Turnstile helps prevent automated abuse. These providers process information under their own terms, and processing may occur outside India.'],
 ['Cookies and optional analytics','Essential session cookies support sign-in and security. The cookie policy explains optional analytics. Google Analytics is not loaded until configured and you choose Allow analytics; you can change your choice using Cookie preferences. We do not send your project details, email, phone number or sign-in tokens as analytics events.'],
 ['Retention and deletion','Inquiry and project records are retained while needed to respond, perform agreed work, maintain required business records or address disputes. You can ask us to review retention or delete information that is no longer required. Encrypted database snapshots are retained for 30 days; separate file copies may remain until an approved deletion is completed. Removing a current record does not immediately remove it from an existing backup.'],
 ['Your choices and requests','You can ask for information about processing, correction, erasure where applicable, withdrawal of consent, or grievance review by emailing us from the address associated with your inquiry. We may verify ownership before releasing or changing records. Withdrawing necessary contact consent may prevent us from continuing an inquiry. If unresolved, you may use the applicable statutory grievance process.'],
 ['Security and children','Access controls, staff two-step verification and encrypted backup copies help protect records, but no online service can promise absolute security. This service is intended for adults aged 18 and over. If you are under 18, ask a parent or guardian to contact us before providing personal information.'],
 ['Policy changes','We will update this page when our processing changes. Last updated: 16 November 2026.']
 ]},
 terms:{title:'Terms & Conditions',sections:[
 ['Using VYNTRIO','VYNTRIO Agency offers digital development services for students, startups and businesses. Use the website lawfully, provide accurate contact details and upload only material you have permission to share. Do not attempt to bypass access controls, probe other clients’ records or abuse the forms.'],
 ['Inquiries and the ₹1 confirmation','An inquiry is a request for review. The ₹1 fee confirms project interest; it is not a development payment, quotation, subscription, guaranteed consultation or guarantee of project acceptance. The team reviews suitability before agreeing work.'],
 ['Project agreement','Scope, deliverables, pricing, milestones, revisions, payment schedule, intellectual property, handover and support must be agreed in a separate quotation or contract. A demo on this site is an illustrative concept unless explicitly identified as verified client work.'],
 ['Workspace and access','Keep sign-in links, passwords and verification codes private. Client access is limited to assigned workspaces. Tell us promptly if you suspect unauthorized access. We may restrict access to address abuse or security incidents.'],
 ['Availability and external services','Service availability depends on hosting, internet access and external providers. We do not guarantee uninterrupted service, a fixed response time, business results or search rankings. Contact us about faults so we can investigate.'],
 ['Refunds and contact','See the Refund Policy for payment issues. Contact vyntrioagency@gmail.com before sending confidential documents. Applicable law and mandatory consumer rights continue to apply. Last updated: 16 November 2026.']
 ]},
 refunds:{title:'Refund Policy',sections:[
 ['Inquiry confirmation fee','The ₹1 payment confirms your interest in discussing a project. It is separate from project development charges and does not guarantee acceptance or a consultation.'],
 ['Failed or duplicate payments','If money is debited but confirmation is pending, do not pay again immediately. Contact vyntrioagency@gmail.com with your inquiry reference, payment reference, date and amount. Do not send card numbers, PINs or OTPs. We check the payment provider’s record before confirming a payment or assessing a refund request.'],
 ['Refund requests','Contact us for a refund review if you believe a payment was duplicated, incorrectly collected or otherwise requires correction. Eligibility is assessed against the payment record, applicable law and any separately agreed project terms. Approved refunds return through the original payment method where supported. Bank and provider processing times vary; we do not promise instant credit.'],
 ['Project payments','Refunds, cancellations and milestone charges for a development project follow its written agreement and applicable law. Last updated: 16 November 2026.']
 ]},
 cookies:{title:'Cookie Policy',sections:[
 ['Essential functions','The private workspace uses session cookies to sign you in and protect access. Spam prevention may use Cloudflare security storage. These functions are needed to provide the requested service.'],
 ['Optional analytics','If Google Analytics has been configured, it loads only after you select Allow analytics. It helps measure public page visits and confirmed inquiry submissions. We do not use advertising features, session recording or analytics on management, authentication and private workspace pages.'],
 ['Your controls','You can allow or reject optional analytics using Cookie preferences on the public website. Your choice is stored on your device. Withdrawal stops analytics on subsequent loading and clears accessible first-party Google Analytics cookies. Browser settings can block or delete cookies, but blocking essential cookies may prevent sign-in.'],
 ['Contact','Email vyntrioagency@gmail.com with cookie or privacy questions. Last updated: 16 November 2026.']
 ]}
};
let html=fs.readFileSync('public/landing.html','utf8');
html=html.replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`).replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${esc(description)}">`);
const extra=`<link rel="canonical" href="${site}/"><meta name="robots" content="${isPreview?'noindex,nofollow':'index,follow'}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${site}/"><meta property="og:image" content="${site}/social-preview.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${site}/social-preview.png">`;
html=html.replace(/<!-- launch-meta:start -->[\s\S]*?<!-- launch-meta:end -->/,'').replace('</head>',`<!-- launch-meta:start -->${extra}<!-- launch-meta:end --></head>`);
if(!html.includes('/landing-launch.js'))html=html.replace('</body>','<script src="/landing-launch.js" defer></script></body>');
// Never present unverified design-template testimonials as real client evidence.
html=html.replace(/<section\b[^>]*\bid="reviews"[^>]*>[\s\S]*?<\/section>/,'');
html=html.replace('Built with Purpose. Designed to Work.','Explore What We Can Build.').replace('Explore selected work across web applications, AI solutions,','Illustrative concepts across web applications, AI solutions,');
for(const [id,path,label] of [['1:1016','privacy','Privacy Policy'],['1:1018','terms','Terms & Conditions'],['1:1020','refunds','Refund Policy']]){
 const marker=`data-node-id="${id}"`,start=html.indexOf(marker);
 // Existing script replaces these reference nodes with modal buttons; override its final behavior below.
 if(start<0)console.warn('Missing policy footer node: '+label);
}
fs.writeFileSync('public/landing.html',html);
fs.writeFileSync('public/site-settings.json',JSON.stringify({analyticsId:/^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID||'')?process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID:null}));
fs.writeFileSync('public/robots.txt',isPreview?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /portal\nDisallow: /management\nDisallow: /auth/\nDisallow: /login\nDisallow: /payment/\nDisallow: /documents/\nDisallow: /preview\nDisallow: /landing.html\n\nSitemap: ${site}/sitemap.xml\n`);
fs.writeFileSync('public/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['',...Object.keys(pages)].map(p=>`<url><loc>${site}/${p}</loc></url>`).join('')}</urlset>`);
for(const [path,page] of Object.entries(pages)){
 const body=page.sections.map(([h,p])=>`<section><h2>${esc(h)}</h2><p>${esc(p)}</p></section>`).join('');
 fs.writeFileSync(`public/${path}.html`,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.title)} | VYNTRIO Agency</title><meta name="description" content="${esc(page.sections[0][1].slice(0,155))}"><meta name="robots" content="${isPreview?'noindex,nofollow':'index,follow'}"><link rel="canonical" href="${site}/${path}"><link rel="icon" href="/favicon.png"><style>body{margin:0;background:#f7f9ff;color:#14243a;font-family:system-ui,sans-serif;line-height:1.75}main{max-width:790px;margin:auto;padding:40px 24px 80px}a{color:#1554de}header{display:flex;align-items:center;gap:14px;margin-bottom:48px}header img{width:42px;height:42px}h1{font-size:clamp(32px,6vw,48px);line-height:1.2}h2{font-size:21px;margin-top:32px}nav{display:flex;flex-wrap:wrap;gap:18px;margin-top:40px;border-top:1px solid #dce4f4;padding-top:24px}</style></head><body><main><header><img src="/favicon.png" alt=""><strong>VYNTRIO AGENCY</strong></header><a href="/">← Back to website</a><h1>${esc(page.title)}</h1>${body}<nav>${Object.entries(pages).map(([key,p])=>`<a href="/${key}">${esc(p.title)}</a>`).join('')}<a href="/#cookie-preferences">Cookie preferences</a></nav></main></body></html>`);
}
console.log('Prepared public metadata, crawl files, policies and consent configuration.');
