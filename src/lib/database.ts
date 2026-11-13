import type { AppData, BusinessWorkspace } from './types';

const DB_NAME = 'vyavasya-database';
const DB_VERSION = 1;
const STORE_NAME = 'workspaces';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readWorkspaces(scope: string): Promise<BusinessWorkspace[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result as Array<BusinessWorkspace & { workspaceId?: string }>)
        .filter((workspace) => workspace.id.startsWith(`${scope}::`))
        .map((workspace) => ({ ...workspace, id: workspace.workspaceId || workspace.id.split('::').slice(1).join('::') })));
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function writeWorkspace(scope: string, id: string, name: string, data: AppData): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME)
        .put({ id: `${scope}::${id}`, workspaceId: id, name, data });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function replaceWorkspaces(scope: string, workspaces: BusinessWorkspace[]): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        (request.result as Array<{ id: string }>).forEach((workspace) => {
          if (workspace.id.startsWith(`${scope}::`)) store.delete(workspace.id);
        });
        workspaces.forEach((workspace) => store.put({
          ...workspace,
          id: `${scope}::${workspace.id}`,
          workspaceId: workspace.id,
        }));
      };
      request.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
