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

export function useUpdateGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('gyms').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gyms'] }),
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

      if (existing?.id) {
        // Update
        const { data, error } = await supabase
          .from('diet_plans')
          .update({ items: plan.items })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('diet_plans')
          .insert(plan)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
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
export function useWhatsappLogs() {
  return useQuery({
    queryKey: ['whatsapp_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*, gym:gyms(id, name)')
        .order('created_at', { ascending: false })
        .limit(100);
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
        // Member: see their own notifications OR gym-wide (no member_id)
        q = q.or(`member_id.eq.${memberId},and(gym_id.eq.${gymId},member_id.is.null)`);
      } else if (profileId && gymId) {
        // Trainer: see notifications addressed to their profile OR gym-wide
        q = q.or(`member_id.eq.${profileId},and(gym_id.eq.${gymId},member_id.is.null)`);
      } else if (gymId) {
        // Owner/Admin: see all gym notifications
        q = q.eq('gym_id', gymId);
      } else if (memberId) {
        q = q.eq('member_id', memberId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
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
export function useBroadcastWhatsApp() {
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
      // Insert a pending log row — Railway automation server polls this
      // table and sends WhatsApp messages using the gym's stored credentials.
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .insert({
          gym_id,
          message,
          status: 'pending',
          recipient_type,
          sender_name,
          phone: null, // null = Railway sends to all active members of this gym
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp_logs'] });
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

      // Members — addressed by their member id
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
      // useNotifications for trainers queries by profileId so this matches
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

      if (notifRows.length > 0) {
        const { error } = await supabase.from('notifications').insert(notifRows);
        if (error) throw error;
      } else {
        // Fallback: gym-wide notification (visible to owner/admin)
        const { error } = await supabase.from('notifications').insert({
          gym_id, member_id: null, title, body: message, type: 'broadcast', is_read: false,
        });
        if (error) throw error;
      }

      return { delivered: notifRows.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ── BROADCAST (trainer sending to their own clients via WhatsApp) ──────
// Kept for backwards compatibility with clients.tsx
export function useBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gym_id,
      sender_name,
      message,
      recipient_type,
      trainer_id,
    }: {
      gym_id: string;
      sender_name: string;
      message: string;
      recipient_type: string;
      trainer_id?: string;
    }) => {
      // Insert pending log — Railway picks it up and sends via WhatsApp template
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .insert({
          gym_id,
          message,
          status: 'pending',
          recipient_type: 'clients',
          sender_name,
          phone: null,
          trainer_id: trainer_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const [{ count: trainerCount }, { count: memberCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('gym_id', gymId!).eq('role', 'trainer'),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gymId!),
      ]);
      return { trainerCount: trainerCount ?? 0, memberCount: memberCount ?? 0 };
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
      const names = new Set((data ?? []).map((gm: any) => gm.module?.name?.toLowerCase() ?? ''));
      return names;
    },
  });
}

// ── INSERT TRAINER WITH SIGNUP ─────────────────────────────────────────
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
      const results = { success: 0, failed: 0, errors: [] as string[] };

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
          const { error } = await supabase.from('members').insert({
            name: row.name.trim(),
            phone: row.phone.trim(),
            plan,
            joining_date,
            expiry_date,
            trainer_id,
            gym_id: params.gym_id,
            status: 'active',
          });
          if (error) {
            results.failed++;
            results.errors.push(`${row.name}: ${error.message}`);
          } else {
            results.success++;
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
      const results = { success: 0, failed: 0, errors: [] as string[] };
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
            });
            if (error) { results.failed++; results.errors.push(`${row.name}: ${error.message}`); }
            else results.success++;
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
