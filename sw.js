// GameZipper Tools Service Worker v3
// Pure caching — Monetag push NOTIFICATIONS DISABLED
// v3: bypass browser cache for gz-analytics.js so EP rotation propagates immediately
//     (tunnel rotates every ~5min, but CDN cache + SW cache could hold stale EP for 4h)
const CACHE='gzt-v3';

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

  // v3: Network-only for gz-analytics.js — bypass SW cache + browser HTTP cache.
  // CDN cache still applies but `?v=` bumping in HTML references busts it on every tunnel rotation.
  // Without this, SW would return stale EP from local cache for the lifetime of the SW.
  if(url.pathname==='/gz-analytics.js'||url.pathname.startsWith('/gz-analytics.')){
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>fetch(e.request)));
    return;
  }

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
