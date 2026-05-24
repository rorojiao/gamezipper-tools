// GameZipper Tools Service Worker v2
// Pure caching — Monetag push NOTIFICATIONS DISABLED
const CACHE='gzt-v2';

self.addEventListener('install',e=>{
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).catch(()=>{}));
  e.clients.claim();
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  if(!url.protocol.startsWith('http'))return;

  // Cache-first for static assets
  if(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|mp3|ogg|wav|webp)$/i.test(url.pathname)){
    e.respondWith(
      caches.open(CACHE).then(c=>
        c.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
          if(resp&&resp.status===200)c.put(e.request,resp.clone());
          return resp;
        }))
      ).catch(()=>fetch(e.request))
    );
    return;
  }

  // Network-first for HTML/pages
  e.respondWith(
    fetch(e.request).then(resp=>{
      if(resp&&resp.status===200&&url.origin===self.location.origin){
        caches.open(CACHE).then(c=>c.put(e.request,resp.clone())).catch(()=>{});
      }
      return resp;
    }).catch(()=>caches.match(e.request))
  );
});
