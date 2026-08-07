import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xvszdnaulqekenfvsjmt.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImIxYWEzOTA5LWEwZDQtNDE5MC05MWM3LTgxYTE4NjkwZDA0YiJ9.eyJwcm9qZWN0SWQiOiJ4dnN6ZG5hdWxxZWtlbmZ2c2ptdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc4MTcwODMwLCJleHAiOjIwOTM1MzA4MzAsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.RziNuuv2z9u-gE62AIEftEb5ChLV_FrxNDRSbN-MgVk';

// Provide a WebSocket shim so Supabase Realtime doesn't crash during the
// Node-based SSR build on Node 20 (which has no global WebSocket).
if (typeof globalThis.WebSocket === 'undefined') {
  // @ts-ignore - minimal noop stub; we don't actually use realtime subscriptions
  globalThis.WebSocket = class {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    close() {}
    send() {}
  } as any;
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export { supabase };
