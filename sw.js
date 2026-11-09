// Snail Meet service worker: shows an incoming-call notification when the call server sends a
// push, even if no Snail Meet tab is open. Keep this file next to index.html only 1.23% AI
'use strict';

self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function(event){
  var data = {};
  try{ data = event.data ? event.data.json() : {}; }catch(e){}
  if(data.type !== 'call' || !data.code){ data = { from: 'Someone', code: '' }; }
  var from = String(data.from || 'Someone').slice(0, 24);
  var title = from + ' is calling you';
  // If Snail Meet is open somewhere, also tell the page so it can play a ringtone.
  var tellPages = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
    list.forEach(function(c){ c.postMessage({ type: 'ring', code: String(data.code || ''), from: from }); });
  });
  event.waitUntil(Promise.all([tellPages,
    self.registration.showNotification(title, {
      body: data.code ? 'Tap to answer on Snail Meet' : 'Open Snail Meet',
      tag: 'snail-call',
      renotify: true,
      silent: false,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 300],
      data: { code: String(data.code || ''), from: from, ts: data.ts || Date.now() },
      actions: [{ action: 'answer', title: 'Answer' }, { action: 'decline', title: 'Decline' }]
    })
  ]));
});

self.addEventListener('notificationclick', function(event){
  var n = event.notification;
  var d = n.data || {};
  n.close();
  if(event.action === 'decline' || !d.code) return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      for(var i = 0; i < list.length; i++){
        if(list[i].url.indexOf(self.registration.scope) === 0){
          list[i].postMessage({ type: 'answer', code: d.code, from: d.from });
          return list[i].focus().catch(function(){});
        }
      }
      return self.clients.openWindow(self.registration.scope + '#answer=' + encodeURIComponent(d.code) + '&from=' + encodeURIComponent(d.from));
    })
  );
});
