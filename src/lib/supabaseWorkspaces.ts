import type { SupabaseClient } from '@supabase/supabase-js';
import type { BusinessWorkspace } from './types';

export async function readCloudWorkspaces(client: SupabaseClient, ownerId: string): Promise<BusinessWorkspace[]> {
  const { data, error } = await client
    .from('business_workspaces')
    .select('workspace_id, name, data')
    .eq('owner_id', ownerId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.workspace_id),
    name: String(row.name),
    data: row.data as BusinessWorkspace['data'],
  }));
}

export async function writeCloudWorkspaces(
  client: SupabaseClient,
  ownerId: string,
  workspaces: BusinessWorkspace[],
): Promise<void> {
  if (!workspaces.length) return;
  const { error } = await client.from('business_workspaces').upsert(
    workspaces.map((workspace) => ({
      owner_id: ownerId,
      workspace_id: workspace.id,
      name: workspace.name,
      data: workspace.data,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'owner_id,workspace_id' },
  );
  if (error) throw error;
}
