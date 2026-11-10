
(function(){
var $=function(i){return document.getElementById(i)};
var CFG=JSON.parse($("cfg").textContent);
var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var br=function(s){return esc(s).replace(/\n/g,"<br>")};
var fill=function(id,a,fn){$(id).innerHTML=a.map(fn).join("")};
var card=function(x){return '<div class="card"><div class="ico">'+esc(x.i)+'</div><h3>'+esc(x.t)+'</h3><p>'+esc(x.d)+'</p></div>'};
var Q="",CUR="all";var norm=function(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")};
function show(f){CUR=f;var ws=norm(Q).split(/\s+/).filter(Boolean);var L=CFG.prodotti.filter(function(x){return f==="all"||(f.indexOf("b:")===0?String(x.g||String(x.n||"").split(" ")[0]).toLowerCase()===f.slice(2):x.s===f)}).filter(function(x){if(!ws.length)return true;var t=norm([x.n,x.d,x.m].join(" ")),t2=t.replace(/[\s.\-]/g,"");return ws.every(function(w){return t.indexOf(w)>=0||t2.indexOf(w.replace(/[.\-]/g,""))>=0})});
 var qi=$("qinfo");if(qi){qi.hidden=!ws.length;qi.textContent=L.length?(L.length===1?"1 prodotto trovato":L.length+" prodotti trovati")+" per «"+Q.trim()+"»":"Nessun prodotto trovato per «"+Q.trim()+"». Prova con un’altra parola o scrivici: ti aiutiamo noi."}
 $("prodotti").innerHTML=L.map(function(x){
 return '<div class="card">'+(x.f||String(x.i)==="1"?'<div class="pimg ph"><img src="'+(x.f||CFG.foto)+'" alt="'+esc(x.n)+'"></div>':'<div class="pimg">'+(x.i&&String(x.i)!=="1"?esc(x.i):"🤖")+'</div>')+'<h3>'+esc(x.n)+'</h3><p>'+esc(x.d)+'</p><p><b>'+esc(x.m)+'</b></p><div class="price">'+esc(x.p)+'</div><button class="btn" type="button" data-m="'+esc(x.n)+'">Chiedi informazioni</button></div>'}).join("")}
function render(){
 document.documentElement.style.setProperty("--base",CFG.colore||"#2e7d32");
 document.title=CFG.ditta+" – "+CFG.footer;
 $("root").innerHTML=$("tpl").innerHTML.replace(/\{\{(\w+)\}\}/g,function(_,k){return (k==="foto"||k==="logo")?(CFG[k]||""):br(CFG[k])});
 fill("vant",CFG.vantaggi,function(x){return '<span><i class="ck" aria-hidden="true">✔</i>'+esc(x.t)+"</span>"});
 fill("g-serv",CFG.servizi,card);fill("g-perche",CFG.perche,card);
 fill("g-passi",CFG.passi,function(x){return '<div class="card"><span class="step"></span><h3>'+esc(x.t)+'</h3><p>'+esc(x.d)+'</p></div>'});
 fill("g-rec",CFG.recensioni,function(x){return '<div class="card"><div class="stars">★★★★★</div><h3>'+esc(x.t)+'</h3><p>'+esc(x.d)+'</p><p class="who">'+esc(x.w)+'</p></div>'});
 var q=encodeURIComponent(CFG.indirizzo);
 $("m1").href="https://www.google.com/maps/search/?api=1&query="+q;
 $("gr").href=CFG.gUrl||"#";$("gw").href=CFG.gScrivi||"#";if(!CFG.gRating)$("rate").style.display="none";
 $("m2").href="https://www.google.com/maps/dir/?api=1&destination="+q;
 show("all");
 $("q").addEventListener("input",function(){Q=this.value;if(Q.trim()){document.querySelectorAll(".chip").forEach(function(c){c.classList.toggle("on",c.getAttribute("data-f")==="all")});CUR="all"}show(CUR)});
 $("sform").addEventListener("submit",function(e){e.preventDefault();Q=$("q").value;show(CUR);vai("catalogo")});
 $("chips").addEventListener("click",function(e){var b=e.target.closest(".chip");if(!b)return;
  document.querySelectorAll(".chip").forEach(function(c){c.classList.toggle("on",c===b)});show(b.getAttribute("data-f"))});
 $("prodotti").addEventListener("click",function(e){var b=e.target.closest("[data-m]");if(!b)return;
  $("r").value="Acquisto di un robot rasaerba";$("m").value="Vorrei informazioni sul modello "+b.getAttribute("data-m")+".";
  vai("contatti")});
 var upd=function(){var v=function(i){return $(i).value.trim()};
  var body="Nome: "+v("n")+"\nContatto: "+v("t")+"\nRichiesta: "+v("r")+"\n\n"+v("m");
  
  var w=String(CFG.whatsapp||"").replace(/\D/g,"");if(/^[03]/.test(w)&&w.length<=11)w="39"+w;var tl=String(CFG.telefono||"").replace(/[^\d+]/g,"");$("tel").href=tl?"tel:"+tl:"#";
  if(w)$("wa").href="https://wa.me/"+w+"?text="+encodeURIComponent("Ciao, sono "+v("n")+" ("+v("t")+"). "+v("r")+": "+v("m"));else $("wa").style.display="none"};
 var ok=function(e){var v=function(i){return $(i).value.trim()};
  if(!v("n")||!v("t")){e.preventDefault();$("fm").textContent="Inserisci almeno il nome e un recapito (telefono o email).";return}
  $("fm").textContent="Si sta aprendo la tua app. Se non succede, scrivici a "+CFG.email+" o chiama "+CFG.telefono+"."};
 ["n","t","r","m"].forEach(function(i){$(i).addEventListener("input",upd);$(i).addEventListener("change",upd)});
 $("wa").addEventListener("click",ok);upd();initCar();initMarchi();initMeteo();initMappa();initLogo();
 var dest=String(CFG.chiave||"").trim()?"w3f":(/@/.test(CFG.email||"")?"fs":"");
 if(dest){$("inv").addEventListener("click",async function(){var v=function(i){return $(i).value.trim()};
  if(!v("n")||!v("t")){$("fm").textContent="Inserisci almeno il nome e un recapito (telefono o email).";return}
  $("inv").disabled=true;$("fm").textContent="Invio in corso…";
  var sogg="Nuova richiesta dal sito – "+v("r"),mail=/@/.test(v("t"))?v("t"):"";
  try{var res,j={};
   try{if(dest==="w3f"){var fd=new FormData();fd.append("access_key",String(CFG.chiave).trim());fd.append("subject",sogg);fd.append("from_name",CFG.ditta);
     fd.append("Nome",v("n"));fd.append("Contatto",v("t"));if(mail)fd.append("email",mail);fd.append("Richiesta",v("r"));fd.append("Messaggio",v("m"));
     res=await fetch("https://api.web3forms.com/submit",{method:"POST",body:fd,headers:{Accept:"application/json"}})}
    else{var body={Nome:v("n"),Contatto:v("t"),Richiesta:v("r"),Messaggio:v("m"),_subject:sogg,_template:"table",_captcha:"false"};if(mail)body._replyto=mail;
     if(/^https?:$/.test(location.protocol)&&!/claude/.test(location.hostname)){body.to=String(CFG.email).trim();res=await fetch("/api/contatto",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body)})}
     else res=await fetch("https://formsubmit.co/ajax/"+encodeURIComponent(String(CFG.email).trim()),{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body)})}}
   catch(ne){var er=new Error("rete");er.net=true;throw er}
   try{j=await res.json()}catch(pe){}
   if(!res.ok||String(j.success)!=="true"){throw new Error(j.message||("errore "+res.status))}
   $("fm").textContent="Richiesta inviata! Ti ricontatteremo al più presto.";["n","t","m"].forEach(function(i){$(i).value=""})}
  catch(e){var anteprima=/claude|claudeusercontent/.test(location.hostname)||location.protocol==="file:";
   $("fm").textContent=(e&&e.net&&anteprima)?"Da questa anteprima l’invio non è possibile: il modulo funziona sul sito pubblicato.":"Invio non riuscito"+(e&&e.message&&!e.net?" ("+e.message+")":"")+". Scrivici su WhatsApp o chiama il "+CFG.telefono+"."}
  $("inv").disabled=false})}else $("inv").style.display="none";
}
function build(c){
 return '<!DOCTYPE html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>'+esc(c.ditta)+' – '+esc(c.footer)+'</title><style id="css">'+$("css").textContent+'</style></head><body><div id="root"></div><template id="tpl">'+$("tpl").innerHTML+'</template><script id="cfg" type="application/json">'+JSON.stringify(c).replace(/</g,"\\u003c")+'<\/script><script id="app">'+$("app").textContent+'<\/script></body></html>'}
var L={chiave:"Chiave Web3Forms (facoltativa: se vuota le richieste arrivano all’email qui sotto)",ditta:"Nome della ditta",logo:"Logo",colore:"Colore principale",titolo1:"Titolo, prima parte",titolo2:"Titolo, parte colorata",intro:"Testo di presentazione",vantaggi:"Punti di forza",tServizi:"Servizi: titolo",sServizi:"Servizi: sottotitolo",servizi:"Servizi",tRip:"Riparazioni: titolo",sRip:"Riparazioni: sottotitolo",passi:"Fasi della riparazione",tPerche:"Perché noi: titolo",sPerche:"Perché noi: sottotitolo",perche:"Motivi per sceglierci",tCatalogo:"Catalogo: titolo",sCatalogo:"Catalogo: sottotitolo",fs:"Filtro catalogo: piccoli",fm:"Filtro catalogo: medi",fl:"Filtro catalogo: grandi",prodotti:"Prodotti del catalogo",tRec:"Recensioni: titolo",sRec:"Recensioni: sottotitolo",recensioni:"Recensioni scelte da te (facoltative)",tContatti:"Contatti: titolo",sContatti:"Contatti: sottotitolo",telefono:"Telefono",gRating:"Google: valutazione (es. 4,8)",gCount:"Google: numero di recensioni",gNota:"Google: nota sotto la valutazione",gUrl:"Google: link alle recensioni",gScrivi:"Google: link per lasciare una recensione",whatsapp:"Numero WhatsApp (solo cifre con prefisso, es. 393331234567)",email:"Email (riceve le richieste del modulo)",indirizzo:"Indirizzo",mappaLat:"Mappa: latitudine del negozio",mappaLon:"Mappa: longitudine del negozio",orari:"Orari di apertura",piva:"Partita IVA",footer:"Testo a piè di pagina",foto:"Foto principale",fotoDidascalia:"Didascalia della foto",tMarchi:"Marchi: titolo",sMarchi:"Marchi: sottotitolo",marchi:"Marchi trattati",meteoLuogo:"Meteo: nome della località",meteoLat:"Meteo: latitudine",meteoLon:"Meteo: longitudine",galleria:"Altre foto del carosello"};
var LS={prodotti:{n:"Nome modello",s:"Fascia (s = piccoli, m = medi, l = grandi)",m:"Superficie",p:"Prezzo",d:"Descrizione",i:"Foto principale (1 = sì, vuoto = icona) oppure un’emoji",g:"Gruppo per i pulsanti del catalogo (vuoto = marca dal nome; k40 = Kress 40V; k60 = Kress 60V Professional; hbat = Honda a batteria; hmot = Honda a motore)"},recensioni:{t:"Titolo",d:"Testo",w:"Autore"},marchi:{n:"Nome del marchio",d:"Descrizione",c:"Prodotti trattati (separati da virgola)"},galleria:{d:"Didascalia"}};
var LD={t:"Titolo",d:"Testo",i:"Icona (emoji)"};
var KEYS={vantaggi:["t"],servizi:["i","t","d"],prodotti:["n","g","s","m","p","d","f","i"],passi:["t","d"],perche:["i","t","d"],recensioni:["t","d","w"],marchi:["n","f","d","c"],galleria:["f","d"]};
function initMarchi(){var m=CFG.marchi||[],t=$("mtabs"),pn=$("mpanel");if(!t)return;if(!m.length){$("marchi").style.display="none";return}
 t.innerHTML=m.map(function(x,i){return '<button type="button" role="tab" id="mt'+i+'" aria-controls="mpanel" aria-selected="'+(i?'false':'true')+'" tabindex="'+(i?'-1':'0')+'"><span class="mth'+(x.f?'':' noimg')+'" aria-hidden="true">'+(x.f?'<img src="'+x.f+'" alt="">':esc(String(x.n||"?").charAt(0)))+'</span><span class="mnm">'+esc(x.n)+'</span></button>'}).join("");
 var b=t.querySelectorAll("button");
 function sel(i,f){var x=m[i];b.forEach(function(e,j){e.setAttribute("aria-selected",j===i?"true":"false");e.tabIndex=j===i?0:-1});
  var cs=String(x.c||"").split(",").map(function(y){return y.trim()}).filter(Boolean);
  pn.setAttribute("aria-labelledby","mt"+i);pn.setAttribute("data-n",x.n||"");
  pn.innerHTML='<div class="mbody"><div class="mhead">'+(x.f?'<img class="mpic" src="'+x.f+'" alt="'+esc(x.n)+'">':'')+'<h3>'+esc(x.n)+'</h3></div><p>'+esc(x.d)+'</p>'+(cs.length?'<p class="mlab">Da noi trovi</p><ul class="mcats">'+cs.map(function(y){return '<li>'+esc(y)+'</li>'}).join("")+'</ul>':'')+'<button type="button" class="btn" id="mask">Chiedi informazioni su '+esc(x.n)+'</button></div>';
  pn.classList.remove("in");void pn.offsetWidth;pn.classList.add("in");
  $("mask").onclick=function(){var mm=$("m");if(mm&&!mm.value)mm.value="Vorrei informazioni sui prodotti "+x.n+".";location.hash="contatti";setTimeout(function(){if($("n"))$("n").focus()},400)};
  if(f)b[i].focus()}
 b.forEach(function(e,i){e.onclick=function(){sel(i)};e.onkeydown=function(ev){var k=ev.key,d=(k==="ArrowRight"||k==="ArrowDown")?1:(k==="ArrowLeft"||k==="ArrowUp")?-1:0;if(d){ev.preventDefault();sel((i+d+b.length)%b.length,true)}}});sel(0)}
function initMeteo(){var bar=$("meteo"),box=$("wx");if(!box)return;var lat=parseFloat(String(CFG.meteoLat||"").replace(",",".")),lon=parseFloat(String(CFG.meteoLon||"").replace(",","."));
 if(!isFinite(lat)||!isFinite(lon))return;
 var q="lat="+lat.toFixed(4)+"&lon="+lon.toFixed(4),key="wx:"+q,data=null;
 try{var c=JSON.parse(localStorage.getItem(key)||"null");if(c&&Date.now()-c.t<3600000)data=c.d}catch(e){}
 var SY=[["thunder","⛈️","Temporali"],["heavysnow","❄️","Neve forte"],["snow","🌨️","Neve"],["sleet","🌨️","Nevischio"],["heavyrain","🌧️","Pioggia forte"],["rainshowers","🌦️","Rovesci"],["lightrain","🌦️","Pioggia leggera"],["rain","🌧️","Pioggia"],["fog","🌫️","Nebbia"],["cloudy","☁️","Nuvoloso"],["partlycloudy","⛅","Parzialmente nuvoloso"],["fair","🌤️","Poco nuvoloso"],["clearsky","☀️","Sereno"]];
 function sym(code){code=String(code||"").replace(/_(day|night|polartwilight)$/,"");for(var i=0;i<SY.length;i++)if(code===SY[i][0]||(SY[i][0]!=="rain"&&code.indexOf(SY[i][0])===0))return SY[i];for(i=0;i<SY.length;i++)if(code.indexOf(SY[i][0])>-1)return SY[i];return ["","🌡️","Previsione"]}
 var fmtD=new Intl.DateTimeFormat("it-IT",{weekday:"short",timeZone:"Europe/Rome"}),fmtK=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome"}),fmtH=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",hour12:false,timeZone:"Europe/Rome"});
 function draw(js){var days={},order=[];(js.properties&&js.properties.timeseries||[]).forEach(function(r){var d=new Date(r.time),k=fmtK.format(d),h=parseInt(fmtH.format(d),10),det=r.data.instant.details;
   if(!days[k]){days[k]={date:d,min:99,max:-99,rain:0,code:null,ch:99};order.push(k)}var D=days[k];
   if(det.air_temperature<D.min)D.min=det.air_temperature;if(det.air_temperature>D.max)D.max=det.air_temperature;
   var n1=r.data.next_1_hours,n6=r.data.next_6_hours;if(n1&&n1.details)D.rain+=n1.details.precipitation_amount||0;else if(n6&&n6.details&&h%6===0)D.rain+=n6.details.precipitation_amount||0;
   var sc=(n6||n1||r.data.next_12_hours||{}).summary;if(sc&&Math.abs(h-12)<D.ch){D.ch=Math.abs(h-12);D.code=sc.symbol_code}});
  var list=order.map(function(k){return days[k]}).filter(function(D){return D.max>-99&&D.code}).slice(0,5);
  if(!list.length)throw new Error("vuoto");
  box.innerHTML=list.map(function(D,i){var s=sym(D.code),dry=D.rain<0.5&&!/rain|sleet|snow|thunder/.test(D.code||"");
   var t=s[2]+(D.rain>=0.1?", "+D.rain.toFixed(1).replace(".",",")+" mm di pioggia":"")+(dry?", prato asciutto":"");
   return '<span class="wday" title="'+esc(t)+'"><span class="wd">'+(i?esc(fmtD.format(D.date).replace(".","")):'Oggi')+'</span><span class="wi" role="img" aria-label="'+esc(t)+'">'+s[1]+'</span><span class="wt"><b>'+Math.round(D.max)+'°</b>/'+Math.round(D.min)+'°</span>'+(dry?'<i class="wok" aria-hidden="true"></i>':'')+'</span>'}).join("");
  bar.hidden=false}
 if(data){try{draw(data);return}catch(e){}}
 function get(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(js){if(!js||!js.properties)throw new Error("formato");return js})}
 var local=/^https?:$/.test(location.protocol)?get("/api/meteo?"+q):Promise.reject();
 local.catch(function(){return get("https://api.met.no/weatherapi/locationforecast/2.0/compact?"+q)})
  .then(function(js){draw(js);try{localStorage.setItem(key,JSON.stringify({t:Date.now(),d:js}))}catch(e){}})
  .catch(function(){bar.hidden=true})}
function initMappa(){var box=$("mtiles"),wrap=$("mappa");if(!box||!wrap)return;
 var lat=parseFloat(String(CFG.mappaLat||"").replace(",",".")),lon=parseFloat(String(CFG.mappaLon||"").replace(",","."));if(!isFinite(lat)||!isFinite(lon))return;
 var z=16,n=Math.pow(2,z)*256,px=(lon+180)/360*n,r=lat*Math.PI/180,py=(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n,failed=false;
 function draw(){if(failed)return;var W=wrap.clientWidth,H=wrap.clientHeight;if(!W||!H)return;var L=px-W/2,T=py-H*0.42,h="";
  for(var tx=Math.floor(L/256);tx<=Math.floor((L+W)/256);tx++)for(var ty=Math.floor(T/256);ty<=Math.floor((T+H)/256);ty++)
   h+='<img alt="" decoding="async" src="https://tile.openstreetmap.org/'+z+'/'+tx+'/'+ty+'.png" style="left:'+Math.round(tx*256-L)+'px;top:'+Math.round(ty*256-T)+'px">';
  box.innerHTML=h;box.querySelectorAll("img").forEach(function(im){im.onerror=function(){failed=true;box.innerHTML="";wrap.classList.remove("live")};im.onload=function(){wrap.classList.add("live")};if(im.complete&&im.naturalWidth)wrap.classList.add("live")})}
 draw();var tm;window.addEventListener("resize",function(){clearTimeout(tm);tm=setTimeout(draw,200)})}
function initLogo(){var lt=$("logolt");if(!lt||!CFG.logo)return;var i=new Image();i.onload=function(){try{
  var c=document.createElement("canvas");c.width=i.naturalWidth;c.height=i.naturalHeight;var g=c.getContext("2d");g.drawImage(i,0,0);
  var d=g.getImageData(0,0,c.width,c.height),p=d.data,ink=[20,40,27];
  for(var k=0;k<p.length;k+=4){var r=p[k],gg=p[k+1],b=p[k+2],mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);
   if(p[k+3]>0&&mn>150&&mx-mn<45){p[k]=ink[0];p[k+1]=ink[1];p[k+2]=ink[2]}}
  g.putImageData(d,0,0);lt.src=c.toDataURL("image/png")}catch(e){}};i.src=CFG.logo}
function initCar(){var g=[{f:CFG.foto,d:CFG.fotoDidascalia}].concat((CFG.galleria||[]).filter(function(x){return x&&x.f}));
 var box=$("car"),cap=$("cap"),dots=$("dots");if(!box||g.length<2)return;
 var cur=0,tm=null;box.className="car multi";
 box.innerHTML=g.map(function(x,i){return '<img src="'+x.f+'" alt="'+esc(x.d||"")+'" class="'+(i?"":"on")+'">'}).join("");
 dots.innerHTML=g.map(function(x,i){return '<button type="button" aria-label="Foto '+(i+1)+'"'+(i?'':' class="on"')+'></button>'}).join("");
 var im=box.querySelectorAll("img"),dt=dots.querySelectorAll("button");
 function go(n){cur=(n+g.length)%g.length;im.forEach(function(e,i){e.classList.toggle("on",i===cur)});dt.forEach(function(e,i){e.classList.toggle("on",i===cur)});cap.textContent=g[cur].d||""}
 function stop(){if(tm){clearInterval(tm);tm=null}}
 function play(){stop();if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)tm=setInterval(function(){go(cur+1)},5000)}
 
 dt.forEach(function(e,i){e.onclick=function(){go(i);play()}});
 var x0=null;box.addEventListener("touchstart",function(e){x0=e.touches[0].clientX},{passive:true});
 box.addEventListener("touchend",function(e){if(x0===null)return;var d=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(d)>40){go(cur+(d<0?1:-1));play()}});
 box.addEventListener("mouseenter",stop);box.addEventListener("mouseleave",play);play()}
function admin(){
 var draft=JSON.parse(JSON.stringify(CFG)),o=document.createElement("div"),b=document.createElement("button");
 var mk=function(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x)e.textContent=x;return e};
 b.className="btn adm-btn";b.textContent="✏️ Modifica sito";o.className="adm";document.body.appendChild(b);document.body.appendChild(o);
 b.onclick=function(){draw();o.classList.add("on")};
 function inp(label,val,set,type){var w=mk("div"),e=type==="long"?mk("textarea"):mk("input");if(type&&type!=="long")e.type=type;
  e.value=val==null?"":val;e.oninput=function(){set(e.value)};w.appendChild(mk("label","",label));w.appendChild(e);return w}
 function photo(key,label,max,bg){key=key||"foto";var w=mk("div"),e=mk("input"),im=mk("img");e.type="file";e.accept="image/*";im.src=draft[key]||"";im.style.cssText="max-width:160px;background:"+(bg==="none"?"#5b5b5b":(bg||"#fff"))+";border-radius:8px;margin-top:6px";
  e.onchange=function(){var fl=e.files[0];if(!fl)return;var r=new FileReader();r.onload=function(){var i=new Image();i.onload=function(){
   var s=Math.min(1,(max||900)/i.width),c=mk("canvas");c.width=Math.round(i.width*s);c.height=Math.round(i.height*s);var g=c.getContext("2d");
   if(bg!=="none"){g.fillStyle=bg||"#fff";g.fillRect(0,0,c.width,c.height)}g.drawImage(i,0,0,c.width,c.height);draft[key]=c.toDataURL(bg==="none"?"image/png":"image/webp",.88);im.src=draft[key]};i.src=r.result};r.readAsDataURL(fl)};
  w.appendChild(mk("label","",label||"Foto principale (scegli un file per sostituirla)"));w.appendChild(e);w.appendChild(im);return w}
 function pic(it){var w=mk("div"),e=mk("input"),im=mk("img"),x=mk("button","btn o","Togli foto");e.type="file";e.accept="image/*";x.type="button";
  im.style.cssText="max-width:140px;background:#fff;border-radius:8px;margin-top:6px;display:"+(it.f?"block":"none");im.src=it.f||"";
  e.onchange=function(){var fl=e.files[0];if(!fl)return;var r=new FileReader();r.onload=function(){var i=new Image();i.onload=function(){
   var s=Math.min(1,600/i.width),c=mk("canvas");c.width=Math.round(i.width*s);c.height=Math.round(i.height*s);var g=c.getContext("2d");
   g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(i,0,0,c.width,c.height);it.f=c.toDataURL("image/webp",.85);im.src=it.f;im.style.display="block"};i.src=r.result};r.readAsDataURL(fl)};
  x.onclick=function(){it.f="";im.style.display="none";e.value=""};
  w.appendChild(mk("label","",it.n!==undefined&&it.c!==undefined?"Miniatura del marchio (scegli un file)":"Foto del prodotto (scegli un file)"));w.appendChild(e);w.appendChild(im);w.appendChild(x);return w}
 function list(k,arr){var f=mk("fieldset");f.appendChild(mk("legend","",L[k]||k));var lab=LS[k]||LD;
  arr.forEach(function(it,ix){var s=mk("fieldset");
   KEYS[k].forEach(function(p){s.appendChild(p==="f"?pic(it):inp(lab[p]||p,it[p],function(x){it[p]=x},p==="d"?"long":null))});
   var d=mk("button","btn o","Elimina");d.type="button";d.onclick=function(){arr.splice(ix,1);draw()};s.appendChild(d);f.appendChild(s)});
  var a=mk("button","btn","+ Aggiungi");a.type="button";a.onclick=function(){var n={};KEYS[k].forEach(function(p){n[p]=""});arr.push(n);draw()};f.appendChild(a);return f}
 function draw(){var old=o.firstChild?o.firstChild.scrollTop:0,box=mk("div","adm-box");box.appendChild(mk("h2","","Modifica il sito"));
  Object.keys(draft).forEach(function(k){var v=draft[k];
   if(k==="foto")box.appendChild(photo());else if(k==="logo")box.appendChild(photo("logo","Logo dell\u2019azienda (meglio PNG con sfondo trasparente)",400,"none"));else if(Array.isArray(v))box.appendChild(list(k,v));
   else box.appendChild(inp(L[k]||k,v,function(x){draft[k]=x},k==="colore"?"color":(String(v).length>60||k==="orari"||k==="intro"?"long":null)))});
  var bar=mk("div","adm-bar"),sv=mk("button","btn","Salva e pubblica"),cn=mk("button","btn o","Chiudi"),ms=mk("span");sv.type=cn.type="button";
  cn.onclick=function(){o.classList.remove("on")};
  sv.onclick=async function(){ms.textContent="Salvataggio in corso…";
   try{var a=await claude.use("artifact");if(!a){ms.textContent="Non hai il permesso di salvare.";return}await a.publish(build(draft))}
   catch(e){ms.textContent="Salvataggio non riuscito: "+((e&&e.message)||(e&&e.code)||"errore")}};
  bar.appendChild(sv);bar.appendChild(cn);bar.appendChild(ms);box.appendChild(bar);o.innerHTML="";o.appendChild(box);box.scrollTop=old}
}
function vai(h){if(location.hash==="#"+h)window.__route&&window.__route();else location.hash=h}
function initPagine(){
 var MAP={hero:"home",meteo:"home",servizi:"home",perche:"home",recensioni:"home",riparazioni:"assistenza",marchi:"marchi",catalogo:"catalogo",contatti:"contatti"},
  PG=["home","catalogo","assistenza","marchi","contatti"],hero=document.querySelector(".hero");
 if(hero)hero.setAttribute("data-in","home");
 Object.keys(MAP).forEach(function(id){var e=$(id);if(e&&id!=="hero")e.setAttribute("data-in",MAP[id])});
 var side=$("side"),dim=$("sdim"),hb=$("hamb");
 function chiudi(){document.body.classList.remove("snav-on");hb.setAttribute("aria-expanded","false")}
 hb.onclick=function(){var on=!document.body.classList.contains("snav-on");document.body.classList.toggle("snav-on",on);hb.setAttribute("aria-expanded",on?"true":"false")};
 dim.onclick=chiudi;document.addEventListener("keydown",function(e){if(e.key==="Escape")chiudi()});
 function route(){var h=decodeURIComponent(location.hash.slice(1))||"home",pg=PG.indexOf(h)>-1?h:(MAP[h]||"home");
  document.querySelectorAll("[data-in]").forEach(function(e){var on=e.getAttribute("data-in")===pg;if(e.id==="meteo"){e.style.display=on?"":"none"}else e.hidden=!on});
  side.querySelectorAll(".sl").forEach(function(a){var on=a.getAttribute("data-pg")===pg;a.classList.toggle("on",on);if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  chiudi();
  var t=PG.indexOf(h)>-1||h===pg?null:$(h);
  if(t)setTimeout(function(){t.scrollIntoView({behavior:"smooth",block:"start"})},30);else window.scrollTo(0,0)}
 window.__route=route;window.addEventListener("hashchange",route);route()}

render();initPagine();
(async function(){try{if(!window.claude||!claude.use)return;var u=await claude.use("user");if(u&&u.canEdit())admin()}catch(e){}})();
})();
