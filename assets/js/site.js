
document.documentElement.classList.remove("no-js");
const cfg = window.VANTEDGE_CONFIG || {};
const all = s => [...document.querySelectorAll(s)];
all("[data-email]").forEach(el => {const v=cfg.publicEmail||"contact@vantedgecapital.in";el.textContent=v;if(el.tagName==="A")el.href=`mailto:${v}`});
all("[data-phone]").forEach(el => {const v=cfg.phoneDisplay||"95525 24673";el.textContent=v;if(el.tagName==="A")el.href=`tel:${cfg.phoneLink||"+919552524673"}`});
all("[data-city]").forEach(el => el.textContent=cfg.city||"Pune, Maharashtra");
all("[data-year]").forEach(el => el.textContent=new Date().getFullYear());
all("[data-whatsapp]").forEach(el => {const n=cfg.whatsappNumber||"919552524673";el.href=`https://wa.me/${n}?text=${encodeURIComponent("Hello VANTEDGE CAPITAL, I would like to know more about your services.")}`});
const arn=document.querySelector("[data-arn-bar]");if(arn&&cfg.arn){arn.hidden=false;arn.textContent=`AMFI Registered Mutual Fund Distributor | ARN: ${cfg.arn}${cfg.euin?` | EUIN: ${cfg.euin}`:""}`}
const m=document.querySelector(".menu-toggle"),nav=document.querySelector(".main-nav");if(m&&nav)m.addEventListener("click",()=>{const o=nav.classList.toggle("open");m.setAttribute("aria-expanded",String(o))});
document.querySelectorAll(".faq-item button").forEach(b=>b.addEventListener("click",()=>{const i=b.closest(".faq-item");const o=i.classList.toggle("open");b.setAttribute("aria-expanded",String(o))}));
const form=document.querySelector("#contact-form");if(form)form.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(form),to=cfg.formRecipient||cfg.publicEmail||"contact@vantedgecapital.in";const s=encodeURIComponent(`Website enquiry from ${f.get("name")||"visitor"}`);const body=encodeURIComponent(`Name: ${f.get("name")||""}\nPhone: ${f.get("phone")||""}\nEmail: ${f.get("email")||""}\nService: ${f.get("service")||""}\n\nMessage:\n${f.get("message")||""}`);location.href=`mailto:${to}?subject=${s}&body=${body}`});
const calc=document.querySelector("#sip-calculator");if(calc){const fmt=n=>new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n);const run=()=>{const p=Math.max(0,+calc.monthly.value||0),y=Math.max(1,+calc.years.value||1),a=Math.max(0,+calc.return.value||0),n=y*12,r=a/1200,inv=p*n,val=r>0?p*((((1+r)**n)-1)/r)*(1+r):inv;calc.querySelector("[data-invested]").textContent=`₹${fmt(inv)}`;calc.querySelector("[data-value]").textContent=`₹${fmt(val)}`};calc.addEventListener("input",run);run()}
