/* Read-only, session-scoped Species Familiarity view reader. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlaySpeciesFamiliarity = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const TIERS = ['', 'Familiar', 'Acquainted', 'Experienced', 'Specialist', 'Expert'];
  const validDex = dex => Number.isInteger(dex) && dex >= 1 && dex <= 151;
  function create(client) {
    let owner = null;
    let epoch = 0;
    const states = new Map();
    const pending = new Map();
    function reset(userId) {
      owner = typeof userId === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(userId) ? userId : null;
      epoch++;
      states.clear(); pending.clear();
    }
    function get(dex) { return states.get(dex) || { status: owner ? 'idle' : 'signed-out' }; }
    function load(dex) {
      if (!owner || !validDex(dex)) return Promise.resolve(get(dex));
      if (pending.has(dex)) return pending.get(dex);
      if (states.has(dex)) return Promise.resolve(get(dex));
      const token = epoch;
      const trainer = owner;
      states.set(dex, { status: 'loading' });
      const work = (async function () {
        let state;
        try {
          const { data, error } = await client.from('species_mastery_progress')
            .select('dex,eligible_captures,tier_level,tier_name')
            .eq('trainer_id', trainer).eq('dex', dex).maybeSingle();
          if (error) throw error;
          if (data == null) state = { status: 'empty' };
          else {
            if (data.dex !== dex || !Number.isSafeInteger(data.eligible_captures) || data.eligible_captures < 1
              || !Number.isInteger(data.tier_level) || data.tier_level < 1 || data.tier_level > 5
              || data.tier_name !== TIERS[data.tier_level]) throw new Error('Invalid progress row');
            state = { status: 'ready', count: data.eligible_captures, tier: data.tier_name };
          }
        } catch (_) { state = { status: 'unavailable' }; }
        if (token === epoch && trainer === owner) states.set(dex, state);
        return token === epoch && trainer === owner ? state : { status: 'stale' };
      })();
      pending.set(dex, work);
      work.then(() => { if (pending.get(dex) === work) pending.delete(dex); });
      return work;
    }
    return { reset, get, load };
  }
  function presentation(state) {
    if (state?.status === 'ready') return {
      label: `${state.tier} · ${state.count} recorded ${state.count === 1 ? 'catch' : 'catches'}`,
      note: 'Shared across this species’ forms. Separate from Mastery points.'
    };
    if (state?.status === 'empty') return {
      label: 'Not recorded yet',
      note: 'Eligible catches count after processing. Mastery points are separate.'
    };
    if (state?.status === 'unavailable') return {
      label: 'Unavailable', note: 'Refresh to try loading your Familiarity progress again.'
    };
    if (state?.status === 'signed-out') return { label: 'Sign in to view', note: 'Your species progress appears here.' };
    return { label: 'Loading…', note: 'Species progress is separate from Mastery points.' };
  }
  return { create, presentation };
});
