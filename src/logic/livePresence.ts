import { createClient } from '@supabase/supabase-js';

/**
 * Initializes real-time concurrent user tracking using Supabase Realtime Presence.
 * If Supabase environment variables are missing or empty, gracefully falls back to showing 1 online user
 * so the badge previews cleanly on localhost without throwing any runtime errors.
 */
export function initLivePresence(onCountChange: (count: number) => void): (() => void) | null {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Localhost / Unconfigured Fallback: Preview 1 user if keys are absent
    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      typeof supabaseUrl !== 'string' ||
      typeof supabaseAnonKey !== 'string' ||
      supabaseUrl.trim() === '' ||
      supabaseAnonKey.trim() === ''
    ) {
      onCountChange(1);
      return null;
    }

    // Per-tab unique ID in sessionStorage so refreshes reuse the same slot without duplicate counts
    let tabId = '';
    try {
      tabId = sessionStorage.getItem('labubu_tab_id') || '';
      if (!tabId) {
        tabId =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `tab_${Math.random().toString(36).substring(2)}_${Date.now()}`;
        sessionStorage.setItem('labubu_tab_id', tabId);
      }
    } catch {
      tabId = `tab_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    }

    const supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim());

    const channel = supabase.channel('labubu-live-users', {
      config: {
        presence: {
          key: tabId,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      try {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        if (typeof count === 'number' && !isNaN(count)) {
          onCountChange(Math.max(1, count));
        }
      } catch {
        onCountChange(1);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ online_at: new Date().toISOString() }).catch(() => {});
      }
    });

    const cleanup = () => {
      try {
        channel.untrack().catch(() => {});
        supabase.removeChannel(channel).catch(() => {});
      } catch {
        // Fail silently
      }
    };

    window.addEventListener('beforeunload', cleanup);

    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  } catch {
    // Fail silently, preview 1 online
    onCountChange(1);
    return null;
  }
}
