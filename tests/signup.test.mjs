import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { onRequestPost } from '../functions/api/signup.js'
const {privateKey} = generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}})
const env={GOOGLE_SHEETS_SPREADSHEET_ID:'fake-sheet-id',GOOGLE_SERVICE_ACCOUNT_EMAIL:'test@example.invalid',GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:privateKey}
const request=(body,origin='https://example.com')=>new Request('https://example.com/api/signup',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
test('유효한 신청만 시트에 RAW로 저장하고 확인 후 성공을 반환한다',async(t)=>{
 const original=globalThis.fetch; t.after(()=>{globalThis.fetch=original}); let calls=[]
 globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options}); if(String(url).includes('oauth2.googleapis.com')) return Response.json({access_token:'fake-token'}); return Response.json({updates:{updatedRows:1}})}
 const response=await onRequestPost({request:request({email:' User@Example.com ',stage:'exploring',consent:true}),env})
 assert.equal(response.status,201); assert.equal((await response.json()).ok,true); assert.equal(calls.length,2)
 assert.match(calls[1].url,/valueInputOption=RAW/); const values=JSON.parse(calls[1].options.body).values[0]
 assert.deepEqual(values.slice(1),['user@example.com','exploring','1']); assert.ok(!calls[1].url.includes('user@example.com'))
})
test('잘못된 입력과 외부 출처는 시트에 전송하지 않는다',async(t)=>{
 const original=globalThis.fetch; t.after(()=>{globalThis.fetch=original});let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected')}
 for (const body of [{email:'bad',consent:true},{email:'a@example.com',consent:false},{email:'a@example.com',stage:'invalid',consent:true}]) assert.equal((await onRequestPost({request:request(body),env})).status,400)
 assert.equal((await onRequestPost({request:request({email:'a@example.com',consent:true},'https://other.example'),env})).status,403); assert.equal(calls,0)
})
test('설정 누락·인증 실패·시트 쓰기 실패 시 성공을 표시하지 않는다',async(t)=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original});const body={email:'a@example.com',consent:true}
 assert.equal((await onRequestPost({request:request(body),env:{}})).status,503)
 globalThis.fetch=async()=>new Response('',{status:403}); assert.equal((await onRequestPost({request:request(body),env})).status,503)
 let count=0;globalThis.fetch=async()=>++count===1?Response.json({access_token:'fake-token'}):new Response('',{status:500}); assert.equal((await onRequestPost({request:request(body),env})).status,503)
 count=0;globalThis.fetch=async()=>++count===1?Response.json({access_token:'fake-token'}):Response.json({updates:{updatedRows:0}}); assert.equal((await onRequestPost({request:request(body),env})).status,503)
})
