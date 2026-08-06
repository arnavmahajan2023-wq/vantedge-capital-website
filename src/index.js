
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const clean=(value,max=500)=>String(value??"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,max);
const esc=value=>clean(value,2000).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validPhone=v=>/^[0-9+()\-\s]{8,20}$/.test(v);

async function verifyTurnstile(token,request,env){
  const body=new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token,remoteip:request.headers.get("CF-Connecting-IP")||""});
  const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  return r.ok?await r.json():{success:false};
}

async function sendEmail(env,payload){
  const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`,{
    method:"POST",
    headers:{"Authorization":`Bearer ${env.CF_EMAIL_API_TOKEN}`,"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.success===false){console.error("Email API:",JSON.stringify(data));throw new Error("Email delivery failed")}
  return data;
}

async function contact(request,env,ctx){
  const requestUrl=new URL(request.url);
  const origin=request.headers.get("Origin")||"";
  if(origin && new URL(origin).hostname!==requestUrl.hostname){
    return json({success:false,message:"Invalid request origin."},403);
  }
  for(const key of ["TURNSTILE_SECRET","CF_ACCOUNT_ID","CF_EMAIL_API_TOKEN"]){
    if(!env[key]) return json({success:false,message:"The enquiry service is temporarily unavailable while secure email settings are being completed. Please use WhatsApp or call us."},503);
  }
  let input;
  try{input=await request.json()}catch{return json({success:false,message:"Invalid form request."},400)}
  if(clean(input.companyWebsite,200)) return json({success:true,message:"Enquiry received."});

  const name=clean(input.name,100),phone=clean(input.phone,20),email=clean(input.email,160).toLowerCase();
  const service=clean(input.service,120),preferredContact=clean(input.preferredContact,40);
  const message=clean(input.message,1500),token=clean(input.turnstileToken,2048),consent=input.consent===true;

  if(name.length<2||!validPhone(phone)||!validEmail(email)||!service||message.length<10||!token||!consent){
    return json({success:false,message:"Please complete all required fields correctly."},400);
  }

  let check;
  try{check=await verifyTurnstile(token,request,env)}
  catch{return json({success:false,message:"Security verification could not be completed. Please try again."},502)}
  if(!check.success||check.action!=="contact_form"){
    return json({success:false,message:"Security verification failed or expired. Please try again."},403);
  }

  const submittedAt=new Date().toISOString();
  const safe={name:esc(name),phone:esc(phone),email:esc(email),service:esc(service),preferredContact:esc(preferredContact),message:esc(message).replaceAll("\n","<br>")};
  const html=`<!doctype html><html><body style="margin:0;background:#f3f5f8;font-family:Arial,sans-serif;color:#172033"><div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #dfe5ed;border-radius:14px;overflow:hidden"><div style="background:#07111f;padding:22px 26px;color:#fff"><div style="font-size:21px;font-weight:700">VANTEDGE CAPITAL</div><div style="margin-top:5px;color:#d7a648;font-size:13px">New website enquiry</div></div><div style="padding:26px"><p><b>Name:</b> ${safe.name}</p><p><b>Phone:</b> ${safe.phone}</p><p><b>Email:</b> ${safe.email}</p><p><b>Service:</b> ${safe.service}</p><p><b>Preferred contact:</b> ${safe.preferredContact}</p><div style="margin-top:18px;padding:16px;background:#f7f8fa;border-radius:10px">${safe.message}</div><div style="margin-top:20px;color:#98a2b3;font-size:11px">Submitted: ${submittedAt}</div></div></div></body></html>`;
  const text=`NEW VANTEDGE WEBSITE ENQUIRY\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nService: ${service}\nPreferred contact: ${preferredContact}\n\nMessage:\n${message}\n\nSubmitted: ${submittedAt}`;

  try{
    const sent=await sendEmail(env,{to:"contact@vantedgecapital.in",from:"website@vantedgecapital.in",replyTo:email,subject:`New Website Enquiry | ${service} | ${name}`,html,text});
    if(env.CRM_WEBHOOK_URL) ctx.waitUntil(fetch(env.CRM_WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,phone,email,service,preferredContact,message,submittedAt,source:"vantedge-website"})}).catch(console.error));
    return json({success:true,message:"Your enquiry has been sent.",reference:sent.result?.id||null});
  }catch(e){
    console.error(e);
    return json({success:false,message:"We could not send your enquiry. Please use WhatsApp or call us."},502);
  }
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==="/api/contact"){
      return request.method==="POST"?contact(request,env,ctx):json({success:false,message:"Method not allowed."},405);
    }
    return env.ASSETS.fetch(request);
  }
};
