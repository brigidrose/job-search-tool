"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GeneratedDorks } from "@/lib/dorks";
import type { SearchProfile, SearchProfileInput } from "@/lib/search-profile";
import type {
  CompanyResearch,
  FitScore,
  FormDLead,
  FormDScanResult,
  NewOpportunity,
  Opportunity,
  Status,
  Template,
} from "@/lib/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

const OPPORTUNITIES_KEY = ["opportunities"];

export function useOpportunities() {
  return useQuery({
    queryKey: OPPORTUNITIES_KEY,
    queryFn: () => request<Opportunity[]>("/api/opportunities"),
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: [...OPPORTUNITIES_KEY, id],
    queryFn: () => request<Opportunity>(`/api/opportunities/${id}`),
  });
}

export function useFitScore(id: string) {
  return useQuery({
    queryKey: [...OPPORTUNITIES_KEY, id, "score"],
    queryFn: () => request<FitScore>(`/api/opportunities/${id}/score`),
  });
}

export function useUpdateOpportunity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: { location?: string | null; newsQuery?: string | null }) =>
      request<Opportunity>(`/api/opportunities/${id}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      }),
    // Prefix match also refreshes this opportunity's detail and score queries.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
}

export function useResearchOpportunity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      request<{ research: CompanyResearch; opportunity: Opportunity }>(
        "/api/company/research",
        { method: "POST", body: JSON.stringify({ opportunityId: id }) },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => request<Template[]>("/api/templates"),
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewOpportunity) =>
      request<Opportunity>("/api/opportunities", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) =>
      request<Opportunity>(`/api/opportunities/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    // Update the row immediately; roll back if the server rejects it.
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: OPPORTUNITIES_KEY });
      const previous = queryClient.getQueryData<Opportunity[]>(OPPORTUNITIES_KEY);
      queryClient.setQueryData<Opportunity[]>(OPPORTUNITIES_KEY, (old) =>
        old?.map((o) => (o.id === id ? { ...o, status } : o)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(OPPORTUNITIES_KEY, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
}

const FORM_D_KEY = ["form-d"];

/** All leads, or with `matchingProfile` only those that fit the search profile. */
export function useFormDLeads(matchingProfile = false) {
  return useQuery({
    queryKey: [...FORM_D_KEY, matchingProfile ? "matching" : "all"],
    queryFn: () =>
      request<{ leads: FormDLead[]; total: number; lastScannedAt: string | null }>(
        matchingProfile ? "/api/form-d?profileId=default" : "/api/form-d",
      ),
  });
}

const PROFILE_KEY = ["search-profile"];

export function useSearchProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => request<SearchProfile>("/api/search-profile"),
  });
}

export function useGeneratedDorks() {
  return useQuery({
    queryKey: [...PROFILE_KEY, "dorks"],
    queryFn: () => request<GeneratedDorks>("/api/search-profile/generated-dorks"),
  });
}

export function useSaveSearchProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SearchProfileInput) =>
      request<SearchProfile>("/api/search-profile", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    // The profile drives the generated searches, Form D matches, and fit scores.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
      queryClient.invalidateQueries({ queryKey: FORM_D_KEY });
      queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY });
    },
  });
}

export function useScanFormD() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (days: number) =>
      request<FormDScanResult>("/api/form-d/scan", {
        method: "POST",
        body: JSON.stringify({ days }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: FORM_D_KEY }),
  });
}

export function useSetRemoteFriendly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remoteFriendly }: { id: string; remoteFriendly: boolean }) =>
      request<FormDLead>(`/api/form-d/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ remoteFriendly }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: FORM_D_KEY }),
  });
}

export function useAddFormDLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<{ opportunity: Opportunity; alreadyTracked: boolean }>(
        `/api/form-d/${id}/add`,
        { method: "POST" },
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FORM_D_KEY });
      queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY });
    },
  });
}

export type Session = { isOwner: boolean; signInAvailable: boolean; demoResetMinutes: number };

const SESSION_KEY = ["session"];

export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: () => request<Session>("/api/auth/session"),
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) =>
      request<{ isOwner: boolean }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    // Signing in swaps demo data for real data, so drop everything cached.
    onSuccess: () => queryClient.resetQueries(),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => request<{ isOwner: boolean }>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => queryClient.resetQueries(),
  });
}
