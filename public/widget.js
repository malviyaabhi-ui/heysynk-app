(function() {
  'use strict';
  
  var SUPABASE_URL = 'https://xqlbxcfzhtjegcbpfuml.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbGJ4Y2Z6aHRqZWdjYnBmdW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDQyNjksImV4cCI6MjA5MDc4MDI2OX0.v8rLyH5xJSBMeirfPK87jUHeBvSGvO7sXvUm56wbN6g';
  var API_URL = 'https://app.heysynk.app';

  var config = window.heySynk || {};
  var workspaceSlug = config.workspace;
  if (!workspaceSlug) { console.warn('[heySynk] No workspace configured'); return; }

  // Generate or retrieve session ID
  var sessionId = sessionStorage.getItem('hs_session');
  if (!sessionId) {
    sessionId = 'hs_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    sessionStorage.setItem('hs_session', sessionId);
  }

  var workspaceId = null;
  var visitorData = {
    session_id: sessionId,
    workspace_id: null,
    name: sessionStorage.getItem('hs_name') || 'Visitor',
    email: sessionStorage.getItem('hs_email') || null,
    current_page: window.location.pathname,
    device: getDevice(),
    country: null,
    city: null,
    last_seen: new Date().toISOString(),
  };

  function getDevice() {
    var ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'Mobile';
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    return 'Desktop';
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
    }).then(function(r) { return r.json().catch(function() { return {} }) });
  }

  // Get workspace ID from slug
  function init() {
    api('GET', 'workspaces?slug=eq.' + workspaceSlug + '&select=id').then(function(data) {
      if (!data || !data[0]) { console.warn('[heySynk] Workspace not found: ' + workspaceSlug); return; }
      workspaceId = data[0].id;
      visitorData.workspace_id = workspaceId;

      // Get location from IP
      fetch('https://ipapi.co/json/').then(function(r) { return r.json() }).then(function(geo) {
        visitorData.country = geo.country_name || null;
        visitorData.city = geo.city || null;
        upsertVisitor();
      }).catch(function() { upsertVisitor() });
    });
  }

  function upsertVisitor() {
    // Check if visitor exists
    api('GET', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId).then(function(data) {
      if (data && data[0]) {
        // Update
        api('PATCH', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId, {
          current_page: visitorData.current_page,
          last_seen: new Date().toISOString(),
          name: visitorData.name,
          email: visitorData.email,
        });
      } else {
        // Insert
        api('POST', 'live_visitors', visitorData);
      }
    });
  }

  function removeVisitor() {
    if (!workspaceId) return;
    api('DELETE', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId);
  }

  // Track page changes (SPA support)
  var lastPage = window.location.pathname;
  setInterval(function() {
    if (window.location.pathname !== lastPage) {
      lastPage = window.location.pathname;
      visitorData.current_page = lastPage;
      upsertVisitor();
    }
    // Heartbeat every 30s
    if (workspaceId) {
      api('PATCH', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId, {
        last_seen: new Date().toISOString(),
        current_page: window.location.pathname,
      });
    }
  }, 30000);

  // Remove on leave
  window.addEventListener('beforeunload', removeVisitor);
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) removeVisitor();
    else upsertVisitor();
  });

  // Expose API for identifying visitors
  window.heySynk.identify = function(data) {
    if (data.name) { visitorData.name = data.name; sessionStorage.setItem('hs_name', data.name); }
    if (data.email) { visitorData.email = data.email; sessionStorage.setItem('hs_email', data.email); }
    upsertVisitor();
  };

  // Expose chat open
  window.heySynk.chat = function() {
    window.open('https://app.heysynk.app/' + workspaceSlug + '/inbox', '_blank');
  };

  init();
})();
