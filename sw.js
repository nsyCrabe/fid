const CACHE_NAME = 'cartes-fidelite-v5-categories';
const ASSETS = ['./','./index.html','./app.js','./style.css','./manifest.json','https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js','https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'];
self.addEventListener('install',(event)=>{event.waitUntil(caches.open(CACHE_NAME).then((cache)=>cache.addAll(ASSETS)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',(event)=>{event.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((key)=>key!==CACHE_NAME).map((key)=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',(event)=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then((response)=>{if(response.ok&&new URL(event.request.url).origin===location.origin){const copy=response.clone();caches.open(CACHE_NAME).then((cache)=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));});
