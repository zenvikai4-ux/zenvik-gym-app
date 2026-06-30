import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from '@/context/AuthContext';

// Global flag to suppress auth state changes during user creation
export let suppressAuthEvents = false;
export const setSuppressAuthEvents = (val: boolean) => { suppressAuthEvents = val; };

// ── GYMS ──────────────────────────────────────────────────────────────
export function useGyms() {
  return useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gyms').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Single-gym fetch — used by gym-owner screens that only need their own
// gym's record (e.g. to read broadcasts_per_month), avoiding the need to
// pull every gym in the system the way useGyms() does for Super Admin.
export function useGym(gymId?: string | null) {
  return useQuery({
    queryKey: ['gym', gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase.from('gyms').select('*').eq('id', gymId!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('gyms').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['gyms'] });
      // useGym(gymId) — used by the owner's broadcast screen to read
      // broadcasts_per_month — caches under the SINGULAR 'gym' key, not
      // 'gyms'. Without this, editing a gym's limit here would save
      // correctly but the broadcast screen would keep showing the old
      // value until something else happened to trigger a refetch.
      qc.invalidateQueries({ queryKey: ['gym', vars.id] });
    },
  });
}

// ── BRANCHES ──────────────────────────────────────────────────────────
export function useBranches(gymId?: string | null) {
  return useQuery({
    queryKey: ['branches', gymId],
    queryFn: async () => {
      let q = supabase.from('branches').select('*').order('name');
      if (gymId) q = q.eq('gym_id', gymId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInsertBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (branch: { name: string; location?: string | null; gym_id: string }) => {
      const { data, error } = await supabase.from('branches').insert(branch).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('branches').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

// ── LEADS ──────────────────────────────────────────────────────────────
export function useLeads(gymId?: string | null) {
  return useQuery({
    queryKey: ['leads', gymId],
    queryFn: async () => {
      let q = supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (gymId) q = q.eq('gym_id', gymId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInsertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: any) => {
      // Server-side duplicate check: if a lead with same phone+gym already exists, return it
      if (lead.phone && lead.gym_id) {
        const normalizedPhone = lead.phone.replace(/\s+/g, '');
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('gym_id', lead.gym_id)
          .ilike('phone', normalizedPhone)
          .maybeSingle();
        if (existing) throw new Error('A lead with this phone number already exists.');
      }
      const { data, error } = await supabase.from('leads').insert(lead).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('leads').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

// Lead conversations (AI chat history)
export function useLeadConversations(leadId?: string | null) {
  return useQuery({
    queryKey: ['lead_conversations', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_conversations')
        .select('*')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5000,
  });
}

export function useInsertLeadConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { lead_id: string; gym_id: string; role: string; message: string }) => {
      const { data, error } = await supabase.from('lead_conversations').insert(msg).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['lead_conversations', vars.lead_id] }),
  });
}

export function useSendWhatsAppMessage() {
  return useMutation({
    mutationFn: async ({ phone, message, gymId }: { phone: string; message: string; gymId: string }) => {
      const GYM_SERVER = process.env.EXPO_PUBLIC_GYM_SERVER_URL || 'https://zenvik-gym-server-production.up.railway.app';
      const res = await fetch(`${GYM_SERVER}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message, gym_id: gymId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to send message');
      }
      return res.json();
    },
  });
}

export function useDirectMessages(phone?: string | null, gymId?: string | null) {
  return useQuery({
    queryKey: ['direct_messages', phone, gymId],
    enabled: !!phone && !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('gym_id', gymId!)
        .eq('to_phone', phone!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5000,
  });
}

export function useInsertDirectMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { gym_id: string; from_id?: string; to_phone: string; message: string; direction: string }) => {
      const { data, error } = await supabase.from('direct_messages').insert(msg).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['direct_messages', vars.to_phone, vars.gym_id] }),
  });
}

// Gym knowledge base
export function useGymKnowledge(gymId?: string | null) {
  return useQuery({
    queryKey: ['gym_knowledge', gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_knowledge_base')
        .select('*')
        .eq('gym_id', gymId!)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    },
  });
}

export function useUpsertGymKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (knowledge: any) => {
      const { data, error } = await supabase
        .from('gym_knowledge_base')
        .upsert(knowledge, { onConflict: 'gym_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['gym_knowledge', vars.gym_id] }),
  });
}

// Gym automation config (per-module settings: cron times, instagram id etc.)
export function useGymAutomationConfig(gymId?: string | null) {
  return useQuery({
    queryKey: ['gym_automation_config', gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_automation_config')
        .select('*')
        .eq('gym_id', gymId!)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    },
  });
}

export function useUpsertGymAutomationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: any) => {
      const { data, error } = await supabase
        .from('gym_automation_config')
        .upsert(config, { onConflict: 'gym_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['gym_automation_config', vars.gym_id] }),
  });
}

// ── MEMBERS ───────────────────────────────────────────────────────────
export function useMembers(gymId?: string | null) {
  return useQuery({
    queryKey: ['members', gymId],
    queryFn: async () => {
      // Simple select without complex FK joins to avoid relation name issues
      let q = supabase
        .from('members')
        .select('*')
        .order('name');
      if (gymId) q = q.eq('gym_id', gymId);
      const { data, error } = await q;
      if (error) throw error;
      const today = new Date();
      return (data ?? []).map((m: any) => {
        if (!m.expiry_date) return { ...m, status: 'active' };
        const expiry = new Date(m.expiry_date);
        const diff = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
        const status = diff < 0 ? 'expired' : diff <= 7 ? 'expiring' : 'active';
        return { ...m, status };
      });
    },
  });
}

export function useInsertMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: any) => {
      const { data, error } = await supabase.from('members').insert(member).select().single();
      if (error) throw error;
      // Trigger welcome message
      if (data?.id && member.gym_id) {
        const GYM_SERVER = process.env.EXPO_PUBLIC_GYM_SERVER_URL || 'https://zenvik-gym-server-production.up.railway.app';
        fetch(`${GYM_SERVER}/member/welcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: data.id, gym_id: member.gym_id }),
        }).catch(e => console.warn('Welcome message trigger failed:', e.message));
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('members').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Find the linked profile (if this member ever had Client Login
      // credentials set up) so we can remove their login too — otherwise
      // a deleted member's email/password keeps working indefinitely.
      const { data: linkedProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('member_id', id)
        .maybeSingle();

      if (linkedProfile?.email) {
        try {
          await supabase.rpc('delete_user_account' as any, { user_email: linkedProfile.email });
        } catch (e: any) {
          console.warn('delete_user_account failed (continuing with member deletion):', e?.message);
        }
        await supabase.from('profiles').delete().eq('id', linkedProfile.id);
      }

      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

// ── TRAINERS ──────────────────────────────────────────────────────────
export function useTrainers(gymId?: string | null) {
  return useQuery({
    queryKey: ['trainers', gymId],
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainer')
        .order('name');
      if (gymId) q = q.eq('gym_id', gymId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── PROFILES ──────────────────────────────────────────────────────────
export function useProfiles(gymId?: string | null) {
  return useQuery({
    queryKey: ['profiles', gymId],
    queryFn: async () => {
      let q = supabase.from('profiles').select('*').order('name');
      if (gymId) q = q.eq('gym_id', gymId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── CLIENT PROFILES ───────────────────────────────────────────────────
export function useClientProfiles(gymId?: string | null, trainerId?: string | null) {
  return useQuery({
    queryKey: ['client_profiles', gymId, trainerId],
    queryFn: async () => {
      let allTrainerIds: string[] = [];

      if (trainerId) {
        // The trainerId passed is the logged-in trainer's auth user id = profile id
        // Members store trainer_id = profile.id of the trainer
        // So direct match should work, but also check all profile ids for this user
        allTrainerIds = [trainerId];
      }

      let q = supabase
        .from('members')
        .select('*')
        .order('name');
      if (gymId) q = q.eq('gym_id', gymId);
      if (allTrainerIds.length === 1) {
        q = q.eq('trainer_id', allTrainerIds[0]);
      } else if (allTrainerIds.length > 1) {
        q = q.in('trainer_id', allTrainerIds);
      }
      // Always enforce gym_id isolation - get gym_id from trainer's profile if not passed
      if (!gymId && trainerId) {
        const { data: trainerProfile } = await supabase
          .from('profiles')
          .select('gym_id')
          .eq('id', trainerId)
          .maybeSingle();
        if (trainerProfile?.gym_id) {
          q = q.eq('gym_id', trainerProfile.gym_id);
        }
      }

      const { data: members, error } = await q;
      if (error) throw error;
      if (!members || members.length === 0) return [];

      // For each member, try to get their client_profile (body/diet details)
      const memberIds = members.map((m: any) => m.id);
      const { data: profiles } = await supabase
        .from('client_profiles')
        .select('*')
        .in('member_id', memberIds);

      return members.map((m: any) => {
        const profile = (profiles ?? []).find((p: any) => p.member_id === m.id);
        return {
          ...(profile ?? {}),
          member_id: m.id,
          member: m,
          id: profile?.id ?? `member_${m.id}`,
          session_time: profile?.session_time ?? 'morning',
          name: m.name,
          phone: m.phone,
        };
      });
    },
  });
}

export function useUpdateClientProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, member_id, gym_id, trainer_id, ...update }: { id: string; member_id?: string; gym_id?: string; trainer_id?: string; [key: string]: any }) => {
      let realId = id;

      // If id is fake (member_xxx prefix), we need to create the client_profile first
      if (id.startsWith('member_') && member_id) {
        const { data: existing } = await supabase
          .from('client_profiles')
          .select('id')
          .eq('member_id', member_id)
          .maybeSingle();

        if (existing) {
          realId = existing.id;
        } else {
          // Create new client_profile
          const { data: created, error: createError } = await supabase
            .from('client_profiles')
            .insert({
              member_id,
              gym_id: gym_id || null,
              trainer_id: trainer_id || null,
              ...update,
            })
            .select()
            .single();
          if (createError) throw createError;
          return created;
        }
      }

      const { data, error } = await supabase
        .from('client_profiles')
        .update(update)
        .eq('id', realId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_profiles'] }),
  });
}

// ── DIET PLANS ────────────────────────────────────────────────────────
export function useDietPlans(profileId?: string | null) {
  return useQuery({
    queryKey: ['diet_plans', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase.from('diet_plans').select('*').eq('client_profile_id', profileId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertDietPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: any) => {
      if (!plan.client_profile_id) {
        throw new Error('client_profile_id is required to save a diet plan');
      }
      // Check if plan already exists
      const { data: existing, error: selectError } = await supabase
        .from('diet_plans')
        .select('id')
        .eq('client_profile_id', plan.client_profile_id)
        .eq('day_of_week', plan.day_of_week)
        .eq('meal_slot', plan.meal_slot)
        .maybeSingle();

      if (selectError) throw selectError;

      let savedData;
      if (existing?.id) {
        const { data, error } = await supabase
          .from('diet_plans')
          .update({ items: plan.items })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        savedData = data;
      } else {
        const { data, error } = await supabase
          .from('diet_plans')
          .insert(plan)
          .select()
          .single();
        if (error) throw error;
        savedData = data;
      }

      // Trigger diet notification + WhatsApp via gym server
      if (plan.gym_id) {
        const GYM_SERVER = process.env.EXPO_PUBLIC_GYM_SERVER_URL || 'https://zenvik-gym-server-production.up.railway.app';
        fetch(`${GYM_SERVER}/diet/assigned`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_profile_id: plan.client_profile_id, gym_id: plan.gym_id }),
        }).catch(e => console.warn('diet/assigned trigger failed:', e.message));
      }

      return savedData;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diet_plans'] }),
    onError: (error: any) => {
      console.error('useUpsertDietPlan error:', error?.message ?? error);
    },
  });
}

export function useDeleteDietPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('diet_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diet_plans'] }),
    onError: (error: any) => {
      console.error('useDeleteDietPlan error:', error?.message ?? error);
    },
  });
}

// ── DIET PLAN DAY LINKING ───────────────────────────────────────────────
// "Linked" days keep separate diet_plans rows but share a link_group_id.
// Editing a meal on any linked day propagates that edit to every other row
// sharing the same group. Unlinking just clears link_group_id back to null
// on that one row — it keeps its current content and becomes independent.

// Returns { [day_of_week]: link_group_id | null } for a profile, so the UI
// can show which days are currently linked together.
export function useDietLinkGroups(profileId?: string | null) {
  return useQuery({
    queryKey: ['diet_link_groups', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diet_plans')
        .select('day_of_week, link_group_id')
        .eq('client_profile_id', profileId!)
        .not('link_group_id', 'is', null);
      if (error) throw error;
      const byDay: Record<number, string> = {};
      (data || []).forEach((row: any) => { byDay[row.day_of_week] = row.link_group_id; });
      return byDay;
    },
  });
}

// Link a set of days together. If sourceDay already belongs to a group,
// the new days join that same group (so linking is additive — you can grow
// an existing group rather than always starting a fresh one). Otherwise a
// new group id is created. Every meal slot that exists on sourceDay is
// copied to every other selected day, and all of them are stamped with the
// same link_group_id.
export function useLinkDietDays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      client_profile_id: string;
      gym_id: string;
      sourceDay: number;
      days: number[]; // days to link WITH sourceDay (sourceDay is included automatically)
    }) => {
      const allDays = Array.from(new Set([params.sourceDay, ...params.days]));

      // Reuse sourceDay's existing group id if it has one. Otherwise, mint a
      // new group id by reading one existing UUID we already have on hand
      // (a row id) rather than generating one client-side — avoids relying
      // on crypto.randomUUID() in the RN/Hermes environment, which isn't
      // guaranteed to be available without an extra polyfill.
      const { data: existingSourceRows } = await supabase
        .from('diet_plans')
        .select('id, link_group_id')
        .eq('client_profile_id', params.client_profile_id)
        .eq('day_of_week', params.sourceDay)
        .limit(1);
      let groupId: string | undefined = existingSourceRows?.[0]?.link_group_id;
      if (!groupId) {
        // Use sourceDay's own row id as the new group's id — it's already
        // a valid, unique UUID generated server-side, so it's safe to
        // reuse here rather than generating a fresh one client-side.
        groupId = existingSourceRows?.[0]?.id;
        if (!groupId) {
          // sourceDay has no rows at all yet (no meals set) — fall back to
          // generating one via a trivial insert+delete is wasteful, so
          // instead require the caller to have at least one meal saved on
          // sourceDay before linking. This matches the UI, which already
          // disables linking until sourceDay has meals (see diet.tsx).
          throw new Error('Add at least one meal to this day before linking it with other days.');
        }
      }

      // Get sourceDay's current meals to copy into the other linked days.
      const { data: sourcePlans, error: sourceError } = await supabase
        .from('diet_plans')
        .select('meal_slot, items')
        .eq('client_profile_id', params.client_profile_id)
        .eq('day_of_week', params.sourceDay);
      if (sourceError) throw sourceError;

      for (const day of allDays) {
        if (sourcePlans?.length) {
          for (const p of sourcePlans) {
            const { data: existing } = await supabase
              .from('diet_plans')
              .select('id')
              .eq('client_profile_id', params.client_profile_id)
              .eq('day_of_week', day)
              .eq('meal_slot', p.meal_slot)
              .maybeSingle();
            if (existing?.id) {
              await supabase.from('diet_plans').update({ items: p.items, link_group_id: groupId }).eq('id', existing.id);
            } else {
              await supabase.from('diet_plans').insert({
                client_profile_id: params.client_profile_id, gym_id: params.gym_id,
                day_of_week: day, meal_slot: p.meal_slot, items: p.items, link_group_id: groupId,
              });
            }
          }
        } else {
          // sourceDay has no meals yet — still mark the day as linked so
          // future edits propagate, even though there's nothing to copy yet.
          await supabase.from('diet_plans')
            .update({ link_group_id: groupId })
            .eq('client_profile_id', params.client_profile_id)
            .eq('day_of_week', day);
        }
      }
      return { groupId, days: allDays };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['diet_plans'] });
      qc.invalidateQueries({ queryKey: ['diet_link_groups', vars.client_profile_id] });
    },
  });
}

// Unlink ONE day from its group. Keeps its current content as-is; just
// clears link_group_id so future edits on this day no longer propagate
// and edits elsewhere no longer propagate to it.
export function useUnlinkDietDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { client_profile_id: string; day_of_week: number }) => {
      const { error } = await supabase
        .from('diet_plans')
        .update({ link_group_id: null })
        .eq('client_profile_id', params.client_profile_id)
        .eq('day_of_week', params.day_of_week);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['diet_plans'] });
      qc.invalidateQueries({ queryKey: ['diet_link_groups', vars.client_profile_id] });
    },
  });
}

// Save an edit to one meal slot and propagate it to every OTHER day that
// currently shares the same link_group_id (if any). If the edited day
// isn't linked to anything, this behaves exactly like a normal single-day
// save.
export function usePropagateDietEdit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      client_profile_id: string;
      gym_id: string;
      day_of_week: number;
      meal_slot: string;
      items: string;
    }) => {
      // Find the link group (if any) for the day being edited.
      const { data: editedRow } = await supabase
        .from('diet_plans')
        .select('id, link_group_id')
        .eq('client_profile_id', params.client_profile_id)
        .eq('day_of_week', params.day_of_week)
        .eq('meal_slot', params.meal_slot)
        .maybeSingle();

      const groupId: string | null = editedRow?.link_group_id ?? null;

      // Save the edited day itself first.
      if (editedRow?.id) {
        const { error } = await supabase.from('diet_plans').update({ items: params.items }).eq('id', editedRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('diet_plans').insert({
          client_profile_id: params.client_profile_id, gym_id: params.gym_id,
          day_of_week: params.day_of_week, meal_slot: params.meal_slot, items: params.items,
        });
        if (error) throw error;
      }

      // Propagate to every OTHER row in the same group + same meal slot.
      if (groupId) {
        const { data: groupRows } = await supabase
          .from('diet_plans')
          .select('id, day_of_week')
          .eq('client_profile_id', params.client_profile_id)
          .eq('link_group_id', groupId)
          .eq('meal_slot', params.meal_slot)
          .neq('day_of_week', params.day_of_week);
        for (const row of groupRows || []) {
          await supabase.from('diet_plans').update({ items: params.items }).eq('id', row.id);
        }
      }

      // Trigger diet notification + WhatsApp via gym server for the edited day.
      if (params.gym_id) {
        const GYM_SERVER = process.env.EXPO_PUBLIC_GYM_SERVER_URL || 'https://zenvik-gym-server-production.up.railway.app';
        fetch(`${GYM_SERVER}/diet/assigned`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_profile_id: params.client_profile_id, gym_id: params.gym_id }),
        }).catch(e => console.warn('diet/assigned trigger failed:', e.message));
      }

      return { groupId };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diet_plans'] }),
    onError: (error: any) => {
      console.error('usePropagateDietEdit error:', error?.message ?? error);
    },
  });
}

// ── WEIGHT HISTORY ────────────────────────────────────────────────────
export function useWeightHistory(profileId?: string | null) {
  return useQuery({
    queryKey: ['weight_history', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase.from('weight_history').select('*').eq('client_profile_id', profileId!).order('recorded_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInsertWeightHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ client_profile_id, weight_kg, notes }: { client_profile_id: string; weight_kg: number; notes?: string }) => {
      const { data, error } = await supabase
        .from('weight_history')
        .insert({ client_profile_id, weight_kg, notes, recorded_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['weight_history', vars.client_profile_id] }),
  });
}

// ── ACTIVITY LOG ──────────────────────────────────────────────────────
export function useActivityLog(gymId?: string | null) {
  return useQuery({
    queryKey: ['activity_log', gymId],
    queryFn: async () => {
      let q = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50);
      if (gymId) q = q.eq('gym_id', gymId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInsertActivity() {
  return useMutation({
    mutationFn: async (activity: { gym_id?: string | null; actor_name: string; action: string; details?: string | null }) => {
      const { error } = await supabase.from('activity_log').insert(activity);
      if (error) throw error;
    },
  });
}

// ── INVOICES ───────────────────────────────────────────────────────────
export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    retry: 1,
    queryFn: async () => {
      // 1. Try full select with gym join
      let { data, error } = await supabase
        .from('invoices')
        .select('*, gym:gyms(id, name)')
        .order('created_at', { ascending: false });
      if (!error) return data ?? [];

      // 2. Fallback: plain select (no join)
      const res2 = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (!res2.error) return res2.data ?? [];

      // 3. Table may not exist yet — return empty instead of crashing
      if (
        res2.error.message?.includes('does not exist') ||
        res2.error.code === '42P01' ||
        res2.error.code === 'PGRST116'
      ) {
        return [];
      }
      throw res2.error;
    },
  });
}

export function useInsertInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: any) => {
      const { data, error } = await supabase.from('invoices').insert(invoice).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('invoices').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

// ── GYM SUBSCRIPTIONS ──────────────────────────────────────────────────
export function useGymSubscriptions() {
  return useQuery({
    queryKey: ['gym_subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_subscriptions')
        .select('*, gym:gyms(id, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInsertGymSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sub: any) => {
      const { data, error } = await supabase.from('gym_subscriptions').insert(sub).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gym_subscriptions'] }),
  });
}

export function useUpdateGymSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('gym_subscriptions').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gym_subscriptions'] }),
  });
}

export function useDeleteGymSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gym_subscriptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gym_subscriptions'] }),
  });
}

// ── MODULES ────────────────────────────────────────────────────────────
export function useModules() {
  return useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modules').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGymModules(gymId?: string | null) {
  return useQuery({
    queryKey: ['gym_modules', gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_modules')
        .select('*, module:modules(id, name, description)')
        .eq('gym_id', gymId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertGymModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gym_id, module_id, is_enabled }: { gym_id: string; module_id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from('gym_modules')
        .upsert({ gym_id, module_id, is_enabled }, { onConflict: 'gym_id,module_id' })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['gym_modules', vars.gym_id] });
      qc.invalidateQueries({ queryKey: ['gym_module_price', vars.gym_id] });
    },
  });
}

// ── WHATSAPP LOGS ──────────────────────────────────────────────────────
// gymId: pass the owner's own gym id to scope results to that gym only.
// Omit (pass null/undefined) only for the Super Admin global log view —
// any other caller MUST pass gymId or this will leak other gyms' WhatsApp
// message content and phone numbers to the client.
export function useWhatsappLogs(gymId?: string | null) {
  return useQuery({
    queryKey: ['whatsapp_logs', gymId],
    queryFn: async () => {
      let q = supabase
        .from('whatsapp_logs')
        .select('*, gym:gyms(id, name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (gymId) q = q.eq('gym_id', gymId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInsertWhatsappLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: { gym_id: string; message: string; phone?: string; status?: string }) => {
      const { data, error } = await supabase.from('whatsapp_logs').insert(log).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp_logs'] }),
  });
}

// ── WHATSAPP TEMPLATES ─────────────────────────────────────────────────
export function useWhatsappTemplates() {
  return useQuery({
    queryKey: ['whatsapp_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateWhatsappTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .update(update)
        .eq('id', id)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp_templates'] }),
  });
}

// ── GYM SUBSCRIPTION (single gym) ─────────────────────────────────────
export function useGymSubscriptionByGym(gymId?: string | null) {
  return useQuery({
    queryKey: ['gym_subscription_single', gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_subscriptions')
        .select('*')
        .eq('gym_id', gymId!)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

// ── NOTIFICATIONS ──────────────────────────────────────────────────────
export function useNotifications(memberId?: string | null, gymId?: string | null, profileId?: string | null) {
  return useQuery({
    queryKey: ['notifications', memberId, gymId, profileId],
    enabled: !!(memberId || gymId || profileId),
    queryFn: async () => {
      let q = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (memberId && gymId) {
        // Member: see only their own notifications — NOT gym-wide null rows
        // (those are owner-only summary notifications like broadcast_sent)
        q = q.eq('member_id', memberId).eq('gym_id', gymId);
      } else if (profileId && gymId) {
        // Trainer: see only notifications addressed to their profile
        q = q.eq('member_id', profileId).eq('gym_id', gymId);
      } else if (gymId) {
        // Owner/Admin: see only gym-wide summary notifications
        // (member_id IS NULL) — e.g. broadcast_sent confirmations.
        // Must NOT see individual members'/trainers' own notifications
        // (diet plans, expiry reminders, etc.) — those belong to them only.
        q = q.eq('gym_id', gymId).is('member_id', null);
      } else if (memberId) {
        q = q.eq('member_id', memberId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });
}

export function useInsertNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notif: { gym_id?: string; member_id?: string; title: string; body: string; type?: string }) => {
      const { data, error } = await supabase.from('notifications').insert(notif).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gymId,
      memberId,
      profileId,
    }: {
      gymId?: string | null;
      memberId?: string | null;
      profileId?: string | null;
    }) => {
      let query = supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      if (!gymId) throw new Error('gymId is required to mark notifications as read');
      query = (query as any).eq('gym_id', gymId);

      if (memberId) {
        // Member: only their own notifications.
        query = (query as any).eq('member_id', memberId);
      } else if (profileId) {
        // Trainer: only notifications addressed to their profile.
        query = (query as any).eq('member_id', profileId);
      } else {
        // Owner/Admin: only their own gym-wide summary notifications
        // (member_id IS NULL) — never touch individual members' or
        // trainers' unread notifications.
        query = (query as any).is('member_id', null);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ── QUERIES (support tickets) ─────────────────────────────────────────
export function useQueries(gymId?: string | null, isAdmin?: boolean) {
  return useQuery({
    queryKey: ['queries', gymId, isAdmin],
    queryFn: async () => {
      let q = supabase.from('queries').select('*').order('created_at', { ascending: false });
      if (!isAdmin && gymId) q = q.eq('gym_id', gymId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInsertQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (query: { gym_id?: string; sender_name: string; sender_role: string; message: string; recipient?: string }) => {
      const { data, error } = await supabase.from('queries').insert(query).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queries'] }),
  });
}

export function useUpdateQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('queries').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queries'] }),
  });
}

// ── MEMBER (self-profile) ─────────────────────────────────────────────
export function useMemberById(memberId?: string | null) {
  return useQuery({
    queryKey: ['member_self', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// Find member record by user profile id (fallback when member_id not set)
export function useMemberByProfileId(userId?: string | null, gymId?: string | null) {
  return useQuery({
    queryKey: ['member_by_profile', userId, gymId],
    enabled: !!userId,
    queryFn: async () => {
      // First check if profile has member_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('member_id')
        .eq('id', userId!)
        .maybeSingle();
      if (profile?.member_id) {
        const { data: member } = await supabase
          .from('members')
          .select('*')
          .eq('id', profile.member_id)
          .maybeSingle();
        return member;
      }
      return null;
    },
  });
}

export function useMemberDietPlans(memberId?: string | null) {
  return useQuery({
    queryKey: ['member_diet', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data: profile, error: pe } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('member_id', memberId!)
        .maybeSingle();
      if (pe || !profile) return [];
      const { data, error } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('client_profile_id', profile.id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMemberWeightHistory(memberId?: string | null) {
  return useQuery({
    queryKey: ['member_weight', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('client_profiles')
        .select('id, body_details, weight_target')
        .eq('member_id', memberId!)
        .maybeSingle();
      if (!profile) return { profile: null, history: [] };
      const { data: history } = await supabase
        .from('weight_history')
        .select('*')
        .eq('client_profile_id', profile.id)
        .order('recorded_at', { ascending: true });
      return { profile, history: history ?? [] };
    },
  });
}

// ── BROADCAST (owner/trainer sending to members) ────────────────────
// ── WHATSAPP BROADCAST (WhatsApp only) ────────────────────────────────
// Uses the same Railway automation pattern: inserts a "pending" row into
// whatsapp_logs → Railway server picks it up and sends via Meta API
// using the gym's stored credentials. No direct Meta API call from app.
// ── Broadcast usage tracking (monthly limit enforcement) ──────────────
// Counts how many broadcasts a gym has sent in the current calendar month.
export function useGymBroadcastUsage(gymId?: string | null) {
  return useQuery({
    queryKey: ['gym_broadcast_usage', gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count, error } = await supabase
        .from('whatsapp_logs')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId!)
        .is('phone', null) // null phone = broadcast log entry (not a 1:1 message)
        .gte('created_at', monthStart);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 10000,
  });
}

export function useBroadcastWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gym_id,
      sender_name,
      message,
      recipient_type,
      broadcasts_per_month,
      broadcasts_used,
    }: {
      gym_id: string;
      sender_name: string;
      message: string;
      recipient_type: 'trainers' | 'clients' | 'both';
      broadcasts_per_month?: number;
      broadcasts_used?: number;
    }) => {
      // Enforce monthly broadcast limit before doing anything else
      const limit = broadcasts_per_month ?? 1;
      const used = broadcasts_used ?? 0;
      if (used >= limit) {
        const err: any = new Error('LIMIT_REACHED');
        err.isLimitReached = true;
        err.limit = limit;
        throw err;
      }

      // Get name + phone pairs to broadcast to — each recipient must get
      // their OWN name in the template, not a single shared sender_name.
      const recipients: { name: string; phone: string }[] = [];

      if (recipient_type === 'clients' || recipient_type === 'both') {
        const { data: members } = await supabase
          .from('members')
          .select('name, phone')
          .eq('gym_id', gym_id)
          .eq('status', 'active')
          .not('phone', 'is', null);
        (members || []).forEach((m: any) => {
          if (m.phone) recipients.push({ name: m.name || 'Member', phone: m.phone });
        });
      }

      if (recipient_type === 'trainers' || recipient_type === 'both') {
        const { data: trainers } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('gym_id', gym_id)
          .eq('role', 'trainer')
          .not('phone', 'is', null);
        (trainers || []).forEach((t: any) => {
          if (t.phone) recipients.push({ name: t.name || 'Trainer', phone: t.phone });
        });
      }

      if (recipients.length === 0) throw new Error('No recipients found with phone numbers');

      // Send via gym server broadcast endpoint
      const GYM_SERVER = process.env.EXPO_PUBLIC_GYM_SERVER_URL || 'https://zenvik-gym-server-production.up.railway.app';
      const res = await fetch(`${GYM_SERVER}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_id, message, recipients }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Broadcast failed');
      }

      const serverResult = await res.json(); // { success, sent, failed, total }

      // Log in whatsapp_logs — this row is what counts toward the monthly limit
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .insert({
          gym_id, message, status: 'sent',
          recipient_type, sender_name, phone: null,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, sent: serverResult.sent, failed: serverResult.failed, total: serverResult.total };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['whatsapp_logs'] });
      qc.invalidateQueries({ queryKey: ['gym_broadcast_usage', vars.gym_id] });
    },
  });
}

// ── IN-APP BROADCAST (notifications only) ─────────────────────────────
export function useBroadcastInApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gym_id,
      sender_name,
      message,
      recipient_type,
    }: {
      gym_id: string;
      sender_name: string;
      message: string;
      recipient_type: 'trainers' | 'clients' | 'both';
    }) => {
      const title = `📢 Message from ${sender_name}`;
      const notifRows: any[] = [];

      // Members — addressed by their member id (they see it in their notifications)
      if (recipient_type === 'clients' || recipient_type === 'both') {
        const { data: members } = await supabase
          .from('members')
          .select('id')
          .eq('gym_id', gym_id)
          .eq('status', 'active');
        (members ?? []).forEach((m: any) => {
          if (m.id) notifRows.push({ gym_id, member_id: m.id, title, body: message, type: 'broadcast', is_read: false });
        });
      }

      // Trainers — addressed by their profile id (auth uid)
      if (recipient_type === 'trainers' || recipient_type === 'both') {
        const { data: trainers } = await supabase
          .from('profiles')
          .select('id')
          .eq('gym_id', gym_id)
          .eq('role', 'trainer');
        (trainers ?? []).forEach((t: any) => {
          if (t.id) notifRows.push({ gym_id, member_id: t.id, title, body: message, type: 'broadcast', is_read: false });
        });
      }

      // Insert individual notifications for recipients
      if (notifRows.length > 0) {
        const { error } = await supabase.from('notifications').insert(notifRows);
        if (error) throw error;
      }

      // Insert ONE single summary notification for the owner/admin only.
      // We use type 'broadcast_sent' (not 'broadcast') so members don't
      // accidentally see this if their query includes null member_id rows.
      const { error: ownerError } = await supabase.from('notifications').insert({
        gym_id,
        member_id: null,
        title: `📢 Broadcast Sent`,
        body: `"${message.slice(0, 80)}${message.length > 80 ? '…' : ''}" — sent to ${notifRows.length} recipient${notifRows.length !== 1 ? 's' : ''}`,
        type: 'broadcast_sent',
        is_read: false,
      });
      if (ownerError) console.warn('Owner broadcast notification failed:', ownerError.message);

      return { delivered: notifRows.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ── BROADCAST (trainer sending to their own assigned clients only) ─────
// Sends directly via the gym server's /broadcast endpoint with each
// recipient's own name filled into the gym_broadcast template — same
// personalization guarantee as useBroadcastWhatsApp(). Scoped strictly to
// members assigned to this trainer (trainer_id), never the whole gym.
export function useBroadcastMyClients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gym_id,
      trainer_id,
      message,
    }: {
      gym_id: string;
      trainer_id: string;
      message: string;
    }) => {
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('name, phone')
        .eq('gym_id', gym_id)
        .eq('trainer_id', trainer_id)
        .eq('status', 'active')
        .not('phone', 'is', null);
      if (membersError) throw membersError;

      const recipients = (members || [])
        .filter((m: any) => !!m.phone)
        .map((m: any) => ({ name: m.name || 'Member', phone: m.phone }));

      if (recipients.length === 0) throw new Error('No clients with phone numbers assigned to you yet.');

      const GYM_SERVER = process.env.EXPO_PUBLIC_GYM_SERVER_URL || 'https://zenvik-gym-server-production.up.railway.app';
      const res = await fetch(`${GYM_SERVER}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_id, message, recipients }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Broadcast failed');
      }

      const serverResult = await res.json(); // { success, sent, failed, total }

      // Log it the same way owner broadcasts are logged (phone: null marks
      // this as a broadcast-type entry). This intentionally also counts
      // toward the gym's shared monthly broadcast usage counter — the
      // limit is per WhatsApp number/gym, not per sender, since it exists
      // to protect the gym's Meta messaging quota regardless of who
      // triggered the send.
      await supabase.from('whatsapp_logs').insert({
        gym_id, message, status: 'sent',
        recipient_type: 'clients', sender_name: null, phone: null, trainer_id,
      });

      return serverResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp_logs'] });
    },
  });
}

// ── DELETE GYM ────────────────────────────────────────────────────────
export function useDeleteGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // A gym can have an owner profile plus trainer/member profiles, all
      // with their own logins. Deleting the gym row alone left every one
      // of those auth accounts active forever. Clean them all up first.
      const { data: linkedProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('gym_id', id);

      for (const p of linkedProfiles || []) {
        if (!p.email) continue;
        try {
          await supabase.rpc('delete_user_account' as any, { user_email: p.email });
        } catch (e: any) {
          console.warn(`delete_user_account failed for ${p.email} (continuing):`, e?.message);
        }
      }
      if (linkedProfiles?.length) {
        await supabase.from('profiles').delete().eq('gym_id', id);
      }

      const { error } = await supabase.from('gyms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gyms'] }),
  });
}

// ── GYM STATS (trainer + member count per gym) ────────────────────────
export function useGymStats(gymId?: string | null) {
  return useQuery({
    queryKey: ['gym_stats', gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const [{ count: trainerCount }, { count: memberCount }, { count: membersWithTrainer }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('gym_id', gymId!).eq('role', 'trainer'),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gymId!),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gymId!).not('trainer_id', 'is', null),
      ]);
      return {
        trainerCount: trainerCount ?? 0,
        memberCount: memberCount ?? 0,
        membersWithTrainer: membersWithTrainer ?? 0,
      };
    },
  });
}

// Trainer-specific KPI: count morning vs evening clients assigned to this trainer
export function useTrainerStats(trainerId?: string | null) {
  return useQuery({
    queryKey: ['trainer_stats', trainerId],
    enabled: !!trainerId,
    queryFn: async () => {
      // Get all members assigned to this trainer
      const { data: members } = await supabase
        .from('members')
        .select('id')
        .eq('trainer_id', trainerId!);
      if (!members?.length) return { total: 0, morning: 0, evening: 0, both: 0 };
      const memberIds = members.map((m: any) => m.id);
      // Get their client profiles for session_time
      const { data: profiles } = await supabase
        .from('client_profiles')
        .select('session_time')
        .in('member_id', memberIds);
      const morning = (profiles ?? []).filter((p: any) => p.session_time === 'morning').length;
      const evening = (profiles ?? []).filter((p: any) => p.session_time === 'evening').length;
      const both = (profiles ?? []).filter((p: any) => p.session_time === 'both').length;
      return { total: members.length, morning, evening, both };
    },
  });
}

// ── INSERT / DELETE MODULE ─────────────────────────────────────────────
export function useInsertModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mod: { name: string; description?: string; price: number }) => {
      const { data, error } = await supabase.from('modules').insert(mod).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules'] }),
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules'] }),
  });
}

export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; name?: string; description?: string; price?: number }) => {
      const { data, error } = await supabase.from('modules').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules'] }),
  });
}

// ── GYM MODULE PRICE TOTAL ────────────────────────────────────────────
export function useGymModulePrice(gymId?: string | null) {
  return useQuery({
    queryKey: ['gym_module_price', gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_modules')
        .select('is_enabled, module:modules(id, price)')
        .eq('gym_id', gymId!)
        .eq('is_enabled', true);
      if (error) throw error;
      const total = (data ?? []).reduce((sum: number, gm: any) => sum + (gm.module?.price ?? 0), 0);
      return total;
    },
  });
}

// ── AUTO GENERATE INVOICE ─────────────────────────────────────────────
export function useAutoInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gym_id, amount, description }: { gym_id: string; amount: number; description?: string }) => {
      const now = new Date();
      const due = new Date(now);
      due.setDate(due.getDate() + 30);
      // Try with description first, fall back without it if column doesn't exist
      const insertData: any = {
        gym_id,
        amount,
        status: 'pending',
        due_date: due.toISOString().split('T')[0],
      };
      if (description) insertData.description = description;
      const { data, error } = await supabase.from('invoices').insert(insertData).select().single();
      if (error) {
        // If description column doesn't exist, retry without it
        if (error.message?.includes('description') || error.code === '42703') {
          const { data: data2, error: error2 } = await supabase.from('invoices').insert({
            gym_id, amount, status: 'pending', due_date: due.toISOString().split('T')[0],
          }).select().single();
          if (error2) throw error2;
          return data2;
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

// ── ENABLED MODULE NAMES FOR A GYM ───────────────────────────────────
export function useEnabledModules(gymId?: string | null) {
  return useQuery({
    queryKey: ['enabled_modules', gymId],
    enabled: !!gymId,
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_modules')
        .select('is_enabled, module:modules(name)')
        .eq('gym_id', gymId!)
        .eq('is_enabled', true);
      if (error) throw error;
      const names = new Set((data ?? []).map((gm: any) => gm.module?.name ?? ''));
      return names;
    },
  });
}

// ── SET CREDENTIALS FOR AN ALREADY-IMPORTED MEMBER ─────────────────────
// Used by the bulk-import "Set Login Credentials" modal. Unlike
// useInsertMemberWithLogin, the member row already exists (created during
// bulk import) — this only creates/links the auth user + profile.
export function useSetMemberCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      member_id: string;
      gym_id: string;
      name: string;
      email: string;
      password: string;
    }) => {
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      const adminAccess = adminSession?.access_token;
      const adminRefresh = adminSession?.refresh_token;

      setSuppressAuthEvents(true);
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: { data: { name: params.name } },
        });

        if (signUpError && !signUpError.message.toLowerCase().includes('already')) {
          throw signUpError;
        }

        let userId = signUpData?.user?.id;

        // If the email already had an account, find its user id via profiles
        // (we can't look up auth.users directly from the client).
        if (!userId) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', params.email)
            .maybeSingle();
          userId = existingProfile?.id;
        }

        try {
          await supabase.rpc('confirm_user_email' as any, { user_email: params.email });
        } catch {
          // non-fatal — login will still work once Supabase confirms via email if this fails
        }

        if (userId) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            name: params.name,
            email: params.email,
            role: 'member',
            gym_id: params.gym_id,
            member_id: params.member_id,
          });
          if (profileError) throw profileError;
        } else {
          throw new Error('Could not create or find a login for this email');
        }

        if (adminAccess && adminRefresh) {
          await supabase.auth.setSession({ access_token: adminAccess, refresh_token: adminRefresh });
        }

        return { userId };
      } finally {
        setSuppressAuthEvents(false);
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['members', vars.gym_id] });
      qc.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}


export function useInsertTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      gym_id: string; name: string; email: string;
      password: string; phone?: string; specialization?: string;
    }) => {
      // Save admin session
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      const adminAccess = adminSession?.access_token;
      const adminRefresh = adminSession?.refresh_token;

      // Suppress auth state changes during trainer creation
      setSuppressAuthEvents(true);
      let userId: string | undefined;
      try {
        // Create auth user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: { data: { name: params.name } },
        });
        if (signUpError && !signUpError.message.toLowerCase().includes('already')) throw signUpError;

        userId = signUpData?.user?.id;

        // Complete ALL trainer setup BEFORE restoring admin session.
        if (userId || params.email) {
          await supabase.rpc('confirm_user_email' as any, { user_email: params.email });
        }

        // Create profile
        if (userId) {
          await supabase.from('profiles').upsert({
            id: userId, name: params.name, email: params.email,
            role: 'trainer', gym_id: params.gym_id,
            phone: params.phone || null,
            specialization: params.specialization || null,
          });
        }

        // Restore admin session LAST — after all DB writes are done
        if (adminAccess && adminRefresh) {
          await supabase.auth.setSession({ access_token: adminAccess, refresh_token: adminRefresh });
        }
      } finally {
        // Always re-enable auth events
        setSuppressAuthEvents(false);
      }

      return { userId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainers'] });
      qc.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

// ── INSERT MEMBER WITH OPTIONAL LOGIN ─────────────────────────────────
export function useInsertMemberWithLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      memberData: any;
      createLogin: boolean;
      email?: string;
      password?: string;
    }) => {
      // 1. Insert member
      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert(params.memberData)
        .select()
        .single();
      if (memberError) throw memberError;

      // 2. Create login if module enabled
      if (params.createLogin && params.email && params.password) {
        // Save admin session BEFORE signUp to restore it after
        const { data: { session: adminSession } } = await supabase.auth.getSession();
        const adminAccess = adminSession?.access_token;
        const adminRefresh = adminSession?.refresh_token;

        // Suppress auth events during member creation
        setSuppressAuthEvents(true);
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: params.email,
            password: params.password,
            options: { data: { name: params.memberData.name } },
          });

          if (!signUpError || signUpError.message.toLowerCase().includes('already')) {
            const userId = signUpData?.user?.id;
            await supabase.rpc('confirm_user_email' as any, { user_email: params.email });
            if (userId) {
              await supabase.from('profiles').upsert({
                id: userId, name: params.memberData.name, email: params.email,
                role: 'member', gym_id: params.memberData.gym_id, member_id: member.id,
              });
            }
          }

          // Restore admin session LAST
          if (adminAccess && adminRefresh) {
            await supabase.auth.setSession({ access_token: adminAccess, refresh_token: adminRefresh });
          }
        } finally {
          setSuppressAuthEvents(false);
        }
      }

      return member;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['members', vars.memberData.gym_id] });
    },
  });
}

// ── LATEST INVOICE FOR A GYM ─────────────────────────────────────────
export function useLatestInvoice(gymId?: string | null) {
  return useQuery({
    queryKey: ['latest_invoice', gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('gym_id', gymId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ── GYM SUBSCRIPTION DATES ────────────────────────────────────────────
// Upsert a subscription record when invoice is generated
export function useUpsertGymSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      gym_id: string;
      start_date: string;
      end_date: string;
      amount: number;
      plan: string;
    }) => {
      const { data, error } = await supabase
        .from('gym_subscriptions')
        .upsert({
          gym_id: params.gym_id,
          plan: params.plan,
          amount: params.amount,
          status: 'active',
          start_date: params.start_date,
          end_date: params.end_date,
        }, { onConflict: 'gym_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gym_subscriptions'] }),
  });
}

// ── PROGRESS LOG (member transformation tracking) ─────────────────────
export function useProgressLog(memberId?: string | null) {
  return useQuery({
    queryKey: ['progress_log', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_log')
        .select('*')
        .eq('member_id', memberId!)
        .order('logged_at', { ascending: false });
      // Table may not exist yet - return empty array gracefully
      if (error) {
        console.warn('progress_log:', error.message);
        return [];
      }
      return data ?? [];
    },
  });
}

export function useInsertProgressLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: {
      member_id: string;
      weight_kg?: number;
      body_fat_pct?: number;
      chest_cm?: number;
      waist_cm?: number;
      hips_cm?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('progress_log')
        .insert({ ...log, logged_at: new Date().toISOString() })
        .select()
        .single();
      if (error) {
        // Table may not exist yet
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('progress_log table not found - run NEW_TABLES.sql in Supabase');
          throw new Error('Progress tracking tables not set up. Please run NEW_TABLES.sql in Supabase SQL Editor.');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['progress_log', vars.member_id] }),
  });
}

// ── TODAY'S GOALS ─────────────────────────────────────────────────────
export function useTodayGoals(memberId?: string | null) {
  return useQuery({
    queryKey: ['today_goals', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('member_id', memberId!)
        .eq('date', today)
        .maybeSingle();
      if (error) {
        console.warn('daily_goals:', error.message);
        return null;
      }
      return data;
    },
  });
}

export function useUpsertTodayGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goals: {
      member_id: string;
      workout_done: boolean;
      diet_followed: boolean;
      water_intake: boolean;
      sleep_ok: boolean;
      notes?: string;
    }) => {
      const today = new Date().toISOString().split('T')[0];

      // Check if record exists for today
      const { data: existing } = await supabase
        .from('daily_goals')
        .select('id')
        .eq('member_id', goals.member_id)
        .eq('date', today)
        .maybeSingle();

      if (existing?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('daily_goals')
          .update({
            workout_done: goals.workout_done,
            diet_followed: goals.diet_followed,
            water_intake: goals.water_intake,
            sleep_ok: goals.sleep_ok,
            notes: goals.notes || null,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) { console.warn('daily_goals update:', error.message); return null; }
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('daily_goals')
          .insert({ ...goals, date: today, notes: goals.notes || null })
          .select()
          .single();
        if (error) { console.warn('daily_goals insert:', error.message); return null; }
        return data;
      }
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['today_goals', vars.member_id] }),
  });
}

// ── BULK IMPORT ───────────────────────────────────────────────────────
export function useBulkImportMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      gym_id: string;
      rows: Array<{
        name: string;
        phone: string;
        plan?: string;
        joining_date?: string;
        expiry_date?: string;
        trainer_name?: string;
      }>;
      trainerList: any[];
    }) => {
      const PLAN_DAYS: Record<string, number> = { Monthly: 30, Quarterly: 90, 'Half-yearly': 180, Yearly: 365 };
      const results = { success: 0, failed: 0, errors: [] as string[], insertedMembers: [] as Array<{ id: string; name: string; phone: string }> };

      for (const row of params.rows) {
        try {
          if (!row.name || !row.phone) {
            results.failed++;
            results.errors.push(`Row skipped: missing name or phone`);
            continue;
          }
          // Find trainer by name
          let trainer_id = null;
          if (row.trainer_name) {
            const trainer = params.trainerList.find((t: any) =>
              t.name?.toLowerCase() === row.trainer_name!.toLowerCase()
            );
            if (trainer) trainer_id = trainer.id;
          }
          const joining_date = row.joining_date || new Date().toISOString().split('T')[0];
          const plan = row.plan || 'Monthly';
          let expiry_date = row.expiry_date;
          if (!expiry_date) {
            const d = new Date(joining_date);
            d.setDate(d.getDate() + (PLAN_DAYS[plan] || 30));
            expiry_date = d.toISOString().split('T')[0];
          }
          const { data: inserted, error } = await supabase
            .from('members')
            .insert({
              name: row.name.trim(),
              phone: row.phone.trim(),
              plan,
              joining_date,
              expiry_date,
              trainer_id,
              gym_id: params.gym_id,
              status: 'active',
            })
            .select('id, name, phone')
            .single();
          if (error) {
            results.failed++;
            results.errors.push(`${row.name}: ${error.message}`);
          } else {
            results.success++;
            if (inserted) results.insertedMembers.push(inserted);
          }
        } catch (e: any) {
          results.failed++;
          results.errors.push(`${row.name}: ${e.message}`);
        }
      }
      return results;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useBulkImportTrainers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      gym_id: string;
      rows: Array<{ name: string; phone: string; email?: string; specialization?: string }>;
    }) => {
      const results = { success: 0, failed: 0, errors: [] as string[], insertedTrainers: [] as Array<{ id: string; name: string; email: string }> };
      for (const row of params.rows) {
        try {
          if (!row.name || !row.phone) {
            results.failed++;
            results.errors.push(`Row skipped: missing name or phone`);
            continue;
          }
          const systemEmail = row.email || `trainer_${Date.now()}_${Math.random().toString(36).slice(2)}@gymapp.local`;
          const systemPassword = `sys_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const { data: { session: adminSession } } = await supabase.auth.getSession();
          const adminAccess = adminSession?.access_token;
          const adminRefresh = adminSession?.refresh_token;
          const { data: signUpData } = await supabase.auth.signUp({ email: systemEmail, password: systemPassword });
          if (adminAccess && adminRefresh) await supabase.auth.setSession({ access_token: adminAccess, refresh_token: adminRefresh });
          const userId = signUpData?.user?.id;
          if (userId) {
            await supabase.rpc('confirm_user_email' as any, { user_email: systemEmail });
            const { error } = await supabase.from('profiles').upsert({
              id: userId, name: row.name.trim(), email: systemEmail,
              role: 'trainer', gym_id: params.gym_id,
              phone: row.phone?.trim() || null,
              specialization: row.specialization?.trim() || null,
            });
            if (error) { results.failed++; results.errors.push(`${row.name}: ${error.message}`); }
            else {
              results.success++;
              results.insertedTrainers.push({ id: userId, name: row.name.trim(), email: systemEmail });
            }
          }
        } catch (e: any) {
          results.failed++;
          results.errors.push(`${row.name}: ${e.message}`);
        }
      }
      return results;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainers'] }),
  });
}

// ── UPDATE CREDENTIALS FOR AN ALREADY-IMPORTED TRAINER ──────────────────
// Bulk trainer import already creates a real auth user per row (with a
// system-generated placeholder email/password, e.g. trainer_173...@gymapp.local
// with a random password). This hook lets the admin replace that
// placeholder with the trainer's real email + a real password they can
// remember, on the SAME auth user (it does not create a second account).
export function useUpdateTrainerCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      profile_id: string;
      old_email: string;
      new_email: string;
      new_password: string;
    }) => {
      // 1. Set the new password while the account is still under old_email.
      const { data: pwResult, error: pwError } = await supabase
        .rpc('set_user_password' as any, { user_email: params.old_email, new_password: params.new_password });
      if (pwError) throw pwError;
      if (pwResult && (pwResult as any).success === false) {
        throw new Error((pwResult as any).error || 'Failed to set password');
      }

      // 2. Rename the auth account to the trainer's real email, if it changed.
      if (params.new_email && params.new_email !== params.old_email) {
        const { data: emailResult, error: emailError } = await supabase
          .rpc('update_user_email' as any, { old_email: params.old_email, new_email: params.new_email });
        if (emailError) throw emailError;
        if (emailResult && (emailResult as any).success === false) {
          throw new Error((emailResult as any).error || 'Failed to update email');
        }
      }

      // 3. Keep the profile row in sync with the new email.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: params.new_email })
        .eq('id', params.profile_id);
      if (profileError) throw profileError;

      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainers'] });
      qc.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

// ── INSERT CLIENT PROFILE (auto-create when trainer opens diet for a member) ─
export function useInsertClientProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: {
      gym_id?: string;
      member_id: string;
      trainer_id?: string;
      session_time?: string;
    }) => {
      const { data, error } = await supabase
        .from('client_profiles')
        .insert({ ...profile, session_time: profile.session_time ?? 'morning' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client_profiles'] });
      qc.invalidateQueries({ queryKey: ['diet_plans'] });
    },
  });
}
