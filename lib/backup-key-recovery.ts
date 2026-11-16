import {constants,createPublicKey,publicEncrypt} from 'node:crypto';

// This temporary owner recovery surface expires automatically after migration.
export function backupKeyRecoveryEnabled(now=Date.now()){
 return process.env.VERCEL_ENV==='production'
  &&process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/,'')==='https://vyntrio-agency.vercel.app'
  &&now<Date.parse('2026-11-17T15:30:00Z');
}

export function wrapBackupKey(key:string,publicJwk:{kty:string;n:string;e:string}){
 if(Buffer.from(key,'base64').length!==32)throw Error('Invalid backup key configuration');
 const publicKey=createPublicKey({format:'jwk',key:publicJwk});
 if(publicKey.asymmetricKeyType!=='rsa'||publicKey.asymmetricKeyDetails?.modulusLength!==2048){
  throw Error('A 2048-bit RSA public key is required');
 }
 return publicEncrypt({key:publicKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(key,'utf8')).toString('base64');
}
