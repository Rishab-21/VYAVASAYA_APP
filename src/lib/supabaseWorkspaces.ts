import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, BusinessWorkspace } from './types';

export async function readCloudWorkspaces(client: SupabaseClient, ownerId: string): Promise<BusinessWorkspace[]> {
  const { data: member } = await client.rpc('get_my_staff_access');
  if (member) {
    const { data, error } = await client.rpc('get_accessible_workspaces');
    if (error) throw error;
    return (data ?? []).map((row: { workspace_id: string; name: string; data: AppData }) => ({
      id: String(row.workspace_id), name: String(row.name), data: row.data,
    }));
  }
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
  const { data: member } = await client.rpc('get_my_staff_access');
  if (member) {
    for (const workspace of workspaces) {
      const { error } = await client.rpc('save_accessible_workspace', {
        p_workspace_id: workspace.id,
        p_name: workspace.name,
        p_data: workspace.data,
      });
      if (error) throw error;
    }
    return;
  }
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
