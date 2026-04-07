(function() {
  'use strict';

  var SUPABASE_URL = 'https://xqlbxcfzhtjegcbpfuml.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbGJ4Y2Z6aHRqZWdjYnBmdW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDQyNjksImV4cCI6MjA5MDc4MDI2OX0.v8rLyH5xJSBMeirfPK87jUHeBvSGvO7sXvUm56wbN6g';

  var config = window.heySynk || {};
  var workspaceSlug = config.workspace;
  if (!workspaceSlug) { console.warn('[heySynk] No workspace configured'); return; }

  // Session
  var sessionId = sessionStorage.getItem('hs_session');
  if (!sessionId) {
    sessionId = 'hs_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    sessionStorage.setItem('hs_session', sessionId);
  }

  var workspaceId = null;
  var pageStartTime = Date.now();
  var pagesVisited = JSON.parse(sessionStorage.getItem('hs_pages') || '[]');
  var entryPage = sessionStorage.getItem('hs_entry') || window.location.pathname;
  sessionStorage.setItem('hs_entry', entryPage);

  // Track current page
  var currentPage = { path: window.location.pathname, title: document.title, time: new Date().toISOString() };
  if (!pagesVisited.find(function(p) { return p.path === currentPage.path; })) {
    pagesVisited.push(currentPage);
    sessionStorage.setItem('hs_pages', JSON.stringify(pagesVisited));
  }

  function api(method, path, body) {
    return fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function(r) { return r.json().catch(function() { return {}; }); });
  }

  function getTimeOnSite() {
    return Math.round((Date.now() - pageStartTime) / 1000);
  }

  function upsertVisitor() {
    if (!workspaceId) return;
    var data = {
      current_page: window.location.pathname,
      last_seen: new Date().toISOString(),
      name: sessionStorage.getItem('hs_name') || 'Visitor',
      email: sessionStorage.getItem('hs_email') || null,
      pages_visited: pagesVisited,
      total_pages: pagesVisited.length,
      entry_page: entryPage,
      time_on_site: getTimeOnSite(),
    };
    api('GET', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId + '&select=id').then(function(rows) {
      if (rows && rows[0]) {
        api('PATCH', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId, data);
      } else {
        api('POST', 'live_visitors', Object.assign({}, data, {
          session_id: sessionId,
          workspace_id: workspaceId,
          device: getDevice(),
          ip_address: null, // filled by geo
          country: null,
          city: null,
        }));
      }
    });
  }

  function getDevice() {
    var ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'Mobile';
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    return 'Desktop';
  }

  function removeVisitor() {
    if (!workspaceId) return;
    api('DELETE', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId);
  }

  function init() {
    api('GET', 'workspaces?slug=eq.' + workspaceSlug + '&select=id').then(function(data) {
      if (!data || !data[0]) { console.warn('[heySynk] Workspace not found: ' + workspaceSlug); return; }
      workspaceId = data[0].id;

      // Get IP + geo
      fetch('https://ipapi.co/json/').then(function(r) { return r.json(); }).then(function(geo) {
        api('POST', 'live_visitors', {
          session_id: sessionId,
          workspace_id: workspaceId,
          name: sessionStorage.getItem('hs_name') || 'Visitor',
          email: sessionStorage.getItem('hs_email') || null,
          current_page: window.location.pathname,
          device: getDevice(),
          ip_address: geo.ip || null,
          country: geo.country_name || null,
          city: geo.city || null,
          entry_page: entryPage,
          pages_visited: pagesVisited,
          total_pages: pagesVisited.length,
          time_on_site: 0,
          last_seen: new Date().toISOString(),
        }).catch(function() {
          // If already exists, just update
          upsertVisitor();
        });

        // Update with geo if already exists
        api('PATCH', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId, {
          ip_address: geo.ip || null,
          country: geo.country_name || null,
          city: geo.city || null,
        });
      }).catch(function() { upsertVisitor(); });
    });
  }

  // Heartbeat every 30s
  setInterval(function() {
    // Track SPA page changes
    if (window.location.pathname !== currentPage.path) {
      currentPage = { path: window.location.pathname, title: document.title, time: new Date().toISOString() };
      if (!pagesVisited.find(function(p) { return p.path === currentPage.path; })) {
        pagesVisited.push(currentPage);
        sessionStorage.setItem('hs_pages', JSON.stringify(pagesVisited));
      }
    }
    upsertVisitor();
  }, 30000);

  // Remove on leave
  window.addEventListener('beforeunload', removeVisitor);
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) removeVisitor();
    else { pageStartTime = Date.now(); upsertVisitor(); }
  });

  // Public API
  window.heySynk.identify = function(data) {
    if (data.name) { sessionStorage.setItem('hs_name', data.name); }
    if (data.email) { sessionStorage.setItem('hs_email', data.email); }
    upsertVisitor();
  };

  window.heySynk.track = function(event, props) {
    var page = { path: window.location.pathname, event: event, props: props, time: new Date().toISOString() };
    pagesVisited.push(page);
    sessionStorage.setItem('hs_pages', JSON.stringify(pagesVisited));
    upsertVisitor();
  };

  init();
})();
