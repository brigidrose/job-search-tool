"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NewOpportunity, Opportunity, Status, Template } from "@/lib/types";

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
