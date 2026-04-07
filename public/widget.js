(function() {
  'use strict';

  var SUPABASE_URL = 'https://xqlbxcfzhtjegcbpfuml.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbGJ4Y2Z6aHRqZWdjYnBmdW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDQyNjksImV4cCI6MjA5MDc4MDI2OX0.v8rLyH5xJSBMeirfPK87jUHeBvSGvO7sXvUm56wbN6g';
  var AI_URL = 'https://app.heysynk.app/api/ai/reply';


  var config = window.heySynk || {};
  var workspaceSlug = config.workspace || 'risertechnologies';
  var brandName = config.brand || 'DevLokr';
  var brandColor = config.color || '#2563EB';
  var offlineStart = config.offlineStart !== undefined ? config.offlineStart : 20; // 8PM
  var offlineEnd = config.offlineEnd !== undefined ? config.offlineEnd : 8;   // 8AM

  // Session
  var sessionId = sessionStorage.getItem('hs_session');
  if (!sessionId) { sessionId = 'hs_' + Math.random().toString(36).substr(2,9) + '_' + Date.now(); sessionStorage.setItem('hs_session', sessionId); }

  var workspaceId = null;
  var conversationId = null;
  var visitorName = sessionStorage.getItem('hs_name') || '';
  var visitorEmail = sessionStorage.getItem('hs_email') || '';
  var pagesVisited = JSON.parse(sessionStorage.getItem('hs_pages') || '[]');
  var entryPage = sessionStorage.getItem('hs_entry') || window.location.pathname;
  sessionStorage.setItem('hs_entry', entryPage);
  var currentPage = window.location.pathname;
  if (!pagesVisited.find(function(p) { return p.path === currentPage; })) {
    pagesVisited.push({ path: currentPage, time: new Date().toISOString() });
    sessionStorage.setItem('hs_pages', JSON.stringify(pagesVisited));
  }

  function isOffline() {
    var h = new Date().getHours();
    if (offlineStart > offlineEnd) return h >= offlineStart || h < offlineEnd;
    return h >= offlineStart && h < offlineEnd;
  }

  function api(method, path, body) {
    return fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method: method,
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function(r) { return r.json().catch(function() { return {}; }); });
  }

  // ── Styles ──────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#hs-widget-btn{position:fixed!important;bottom:24px!important;right:24px!important;left:auto!important;top:auto!important;width:56px!important;height:56px!important;border-radius:50%!important;border:none!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;z-index:99998!important;box-shadow:0 4px 20px rgba(0,0,0,.2)!important;transition:transform .2s,box-shadow .2s!important;margin:0!important;padding:0!important}',
    '#hs-widget-btn:hover{transform:scale(1.08);box-shadow:0 8px 28px rgba(0,0,0,.25)}',
    '#hs-widget-panel{position:fixed!important;bottom:92px!important;right:24px!important;left:auto!important;top:auto!important;width:360px!important;height:520px!important;border-radius:16px!important;background:#fff!important;box-shadow:0 16px 48px rgba(0,0,0,.18)!important;z-index:99999!important;display:none!important;flex-direction:column!important;overflow:hidden!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif!important;border:1px solid #E2E8F0!important}',
    '#hs-widget-panel.open{display:flex!important}',
    '#hs-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}',
    '.hs-msg-bot{display:flex;gap:8px;align-items:flex-end}.hs-msg-bot .hs-bubble{background:#F1F5F9;color:#0F172A;border-radius:16px 16px 16px 4px}',
    '.hs-msg-user{display:flex;justify-content:flex-end}.hs-msg-user .hs-bubble{color:#fff;border-radius:16px 16px 4px 16px}',
    '.hs-bubble{padding:10px 14px;font-size:13px;line-height:1.6;max-width:82%}',
    '.hs-typing{display:flex;gap:4px;padding:10px 14px}.hs-dot{width:6px;height:6px;border-radius:50%;background:#94A3B8;animation:hs-bounce .8s ease-in-out infinite}.hs-dot:nth-child(2){animation-delay:.15s}.hs-dot:nth-child(3){animation-delay:.3s}',
    '@keyframes hs-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}',
    '#hs-input-area{padding:12px;border-top:1px solid #E2E8F0;display:flex;gap:8px;align-items:center}',
    '#hs-input{flex:1;border:1.5px solid #E2E8F0;border-radius:10px;padding:9px 12px;font-size:13px;outline:none;font-family:inherit;resize:none;height:38px;line-height:1.4}',
    '#hs-input:focus{border-color:var(--hs-color)}',
    '#hs-send{width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '#hs-send:disabled{opacity:.4;cursor:not-allowed}',
    '#hs-pre-chat{padding:20px;display:flex;flex-direction:column;gap:12px}',
    '.hs-pre-input{padding:10px 12px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:13px;font-family:inherit;outline:none;width:100%;box-sizing:border-box}',
    '.hs-pre-input:focus{border-color:var(--hs-color)}',
    '.hs-start-btn{padding:11px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;color:#fff;width:100%}',
    '#hs-badge{position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:#EF4444;color:#fff;font-size:10px;font-weight:800;display:none;align-items:center;justify-content:center;border:2px solid #fff}',
  ].join('');
  document.head.appendChild(style);

  // ── HTML ─────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'hs-widget-btn';
  btn.style.background = brandColor;
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg><div id="hs-badge"></div>';
  btn.style.position = 'relative';

  var panel = document.createElement('div');
  panel.id = 'hs-widget-panel';
  panel.style.setProperty('--hs-color', brandColor);

  var offline = isOffline();
  var statusDot = offline ? '#F59E0B' : '#16A34A';
  var statusText = offline ? 'We\'re offline — we\'ll reply soon' : 'Online · Usually replies in minutes';

  panel.innerHTML = [
    '<div style="background:' + brandColor + ';padding:16px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0">',
    '  <div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;flex-shrink:0">' + brandName[0] + '</div>',
    '  <div style="flex:1"><div style="font-size:14px;font-weight:800;color:#fff">' + brandName + ' Support</div>',
    '  <div style="font-size:11px;color:rgba(255,255,255,0.8);display:flex;align-items:center;gap:5px"><div style="width:6px;height:6px;border-radius:50%;background:' + statusDot + '"></div>' + statusText + '</div></div>',
    '  <button id="hs-close" style="background:transparent;border:none;cursor:pointer;color:rgba(255,255,255,0.7);font-size:22px;padding:0;line-height:1">&times;</button>',
    '</div>',
    '<div id="hs-chat-body" style="flex:1;display:flex;flex-direction:column;overflow:hidden">',
    '  <div id="hs-pre-chat" class="hs-pre-chat">',
    '    <div style="text-align:center;padding:10px 0 4px"><div style="font-size:22px;margin-bottom:8px">👋</div><div style="font-size:14px;font-weight:700;color:#0F172A">How can we help?</div><div style="font-size:12px;color:#64748B;margin-top:4px">' + (offline ? 'Leave us a message and we\'ll get back to you.' : 'Start a conversation with our team.') + '</div></div>',
    '    <input class="hs-pre-input" id="hs-pre-name" placeholder="Your name" value="' + visitorName + '">',
    '    <input class="hs-pre-input" id="hs-pre-email" type="email" placeholder="Your email (optional)" value="' + visitorEmail + '">',
    '    <input class="hs-pre-input" id="hs-pre-msg" placeholder="What can we help you with?">',
    '    <button class="hs-start-btn" id="hs-start-btn" style="background:' + brandColor + '">Start conversation &rarr;</button>',
    '  </div>',
    '  <div id="hs-messages" style="display:none"></div>',
    '  <div id="hs-input-area" style="display:none">',
    '    <input id="hs-input" placeholder="Type a message..." />',
    '    <button id="hs-send" style="background:' + brandColor + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg></button>',
    '  </div>',
    '</div>',
  ].join('');

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // ── Events ───────────────────────────────────────
  btn.addEventListener('click', function() {
    panel.classList.toggle('open');
    document.getElementById('hs-badge').style.display = 'none';
  });
  document.getElementById('hs-close').addEventListener('click', function() {
    panel.classList.remove('open');
  });

  function addMessage(text, role) {
    var msgs = document.getElementById('hs-messages');
    var div = document.createElement('div');
    div.className = role === 'user' ? 'hs-msg-user' : 'hs-msg-bot';
    var bubble = document.createElement('div');
    bubble.className = 'hs-bubble';
    if (role !== 'user') {
      var avatar = document.createElement('div');
      avatar.style.cssText = 'width:26px;height:26px;border-radius:50%;background:' + brandColor + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0';
      avatar.textContent = brandName[0];
      div.appendChild(avatar);
    } else {
      bubble.style.background = brandColor;
    }
    bubble.textContent = text;
    div.appendChild(bubble);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var msgs = document.getElementById('hs-messages');
    var div = document.createElement('div');
    div.className = 'hs-msg-bot';
    div.id = 'hs-typing-indicator';
    div.innerHTML = '<div style="width:26px;height:26px;border-radius:50%;background:' + brandColor + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0">' + brandName[0] + '</div><div class="hs-bubble hs-typing"><div class="hs-dot"></div><div class="hs-dot"></div><div class="hs-dot"></div></div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    var t = document.getElementById('hs-typing-indicator');
    if (t) t.remove();
  }

  async function getAIReply(userMsg, context) {
    try {
      var res = await fetch('https://app.heysynk.app/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: context, customer_name: visitorName || 'Visitor', agent_name: brandName + ' Support', workspace_id: workspaceId })
      });
      var data = await res.json();
      return data.reply || 'Thanks for reaching out! Our team will get back to you shortly.';
    } catch(e) {
      return 'Thanks for your message! Our team will get back to you shortly.';
    }
  }

  async function startConversation(name, email, firstMsg) {
    visitorName = name;
    visitorEmail = email;
    sessionStorage.setItem('hs_name', name);
    if (email) sessionStorage.setItem('hs_email', email);

    // Create contact if email provided
    var contactId = null;
    if (email) {
      var existing = await api('GET', 'contacts?workspace_id=eq.' + workspaceId + '&email=eq.' + encodeURIComponent(email) + '&select=id');
      if (existing && existing[0]) { contactId = existing[0].id; }
      else {
        var newContact = await api('POST', 'contacts', { workspace_id: workspaceId, name: name || 'Visitor', email: email, status: 'active' });
        if (newContact && newContact[0]) contactId = newContact[0].id;
      }
    }

    // Create conversation
    var conv = await api('POST', 'conversations', {
      workspace_id: workspaceId, contact_id: contactId,
      status: 'open', channel: 'live_chat', priority: 'normal',
      last_message: firstMsg, last_message_at: new Date().toISOString(),
      source_url: window.location.href,
    });
    if (conv && conv[0]) conversationId = conv[0].id;

    // Insert first message
    if (conversationId) {
      await api('POST', 'messages', { conversation_id: conversationId, workspace_id: workspaceId, sender_type: 'contact', body: firstMsg, type: 'text' });
    }

    // Show chat UI
    document.getElementById('hs-pre-chat').style.display = 'none';
    document.getElementById('hs-messages').style.display = 'flex';
    document.getElementById('hs-input-area').style.display = 'flex';
    addMessage(firstMsg, 'user');

    // AI auto-reply
    showTyping();
    var context = 'Visitor ' + (name || 'Anonymous') + ' on page ' + window.location.pathname + ' says: ' + firstMsg;
    var reply = await getAIReply(firstMsg, context);
    removeTyping();
    addMessage(reply, 'bot');

    // Store AI reply as message
    if (conversationId) {
      await api('POST', 'messages', { conversation_id: conversationId, workspace_id: workspaceId, sender_type: 'agent', body: reply, type: 'text' });
    }
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    addMessage(text, 'user');
    if (conversationId) {
      await api('POST', 'messages', { conversation_id: conversationId, workspace_id: workspaceId, sender_type: 'contact', body: text, type: 'text' });
    }
    showTyping();
    var context = 'Ongoing conversation. Visitor says: ' + text;
    var reply = await getAIReply(text, context);
    removeTyping();
    addMessage(reply, 'bot');
    if (conversationId) {
      await api('POST', 'messages', { conversation_id: conversationId, workspace_id: workspaceId, sender_type: 'agent', body: reply, type: 'text' });
    }
  }

  document.getElementById('hs-start-btn').addEventListener('click', function() {
    var name = document.getElementById('hs-pre-name').value.trim();
    var email = document.getElementById('hs-pre-email').value.trim();
    var msg = document.getElementById('hs-pre-msg').value.trim();
    if (!name) { document.getElementById('hs-pre-name').focus(); return; }
    if (!msg) { document.getElementById('hs-pre-msg').focus(); return; }
    startConversation(name, email, msg);
  });

  document.getElementById('hs-pre-msg').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('hs-start-btn').click();
  });

  document.getElementById('hs-send').addEventListener('click', function() {
    var inp = document.getElementById('hs-input');
    sendMessage(inp.value);
    inp.value = '';
  });

  document.getElementById('hs-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      sendMessage(this.value);
      this.value = '';
    }
  });

  // ── Tracking ─────────────────────────────────────
  function upsertVisitor() {
    if (!workspaceId) return;
    var data = { current_page: window.location.pathname, last_seen: new Date().toISOString(), name: visitorName || 'Visitor', email: visitorEmail || null, pages_visited: pagesVisited, total_pages: pagesVisited.length, entry_page: entryPage };
    api('GET', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId + '&select=id').then(function(rows) {
      if (rows && rows[0]) api('PATCH', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId, data);
      else api('POST', 'live_visitors', Object.assign({}, data, { session_id: sessionId, workspace_id: workspaceId, device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop' }));
    });
  }

  function removeVisitor() {
    if (workspaceId) api('DELETE', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId);
  }

  // Init
  api('GET', 'workspaces?slug=eq.' + workspaceSlug + '&select=id').then(function(data) {
    if (!data || !data[0]) { console.warn('[heySynk] Workspace not found: ' + workspaceSlug); return; }
    workspaceId = data[0].id;
    fetch('https://ipapi.co/json/').then(function(r) { return r.json(); }).then(function(geo) {
      api('POST', 'live_visitors', { session_id: sessionId, workspace_id: workspaceId, name: visitorName || 'Visitor', email: visitorEmail || null, current_page: currentPage, device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop', ip_address: geo.ip, country: geo.country_name, city: geo.city, entry_page: entryPage, pages_visited: pagesVisited, total_pages: pagesVisited.length, last_seen: new Date().toISOString() }).catch(function() { upsertVisitor(); });
      api('PATCH', 'live_visitors?session_id=eq.' + sessionId + '&workspace_id=eq.' + workspaceId, { ip_address: geo.ip, country: geo.country_name, city: geo.city });
    }).catch(function() { upsertVisitor(); });
  });

  setInterval(upsertVisitor, 30000);
  window.addEventListener('beforeunload', removeVisitor);
  document.addEventListener('visibilitychange', function() { if (document.hidden) removeVisitor(); else upsertVisitor(); });

  // Public API
  window.heySynk.identify = function(d) {
    if (d.name) { visitorName = d.name; sessionStorage.setItem('hs_name', d.name); }
    if (d.email) { visitorEmail = d.email; sessionStorage.setItem('hs_email', d.email); }
    upsertVisitor();
  };

})();
