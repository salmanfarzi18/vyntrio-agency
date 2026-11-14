export const isTeamRole=(role:string)=>['owner','admin','staff'].includes(role);
export function hasAuthMethod(amr:unknown,method:string){return Array.isArray(amr)&&amr.some(entry=>entry===method||(entry&&typeof entry==='object'&&entry.method===method));}
export function managementSessionReady(role:string,assurance:string,amr:unknown,method='totp'){
 return isTeamRole(role)&&assurance==='aal2'&&hasAuthMethod(amr,'password')&&(method!=='phone'||hasAuthMethod(amr,'mfa/phone'));
}
