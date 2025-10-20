// shared/types.ts - ATUALIZADO
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  children?: Folder[];
  files?: FileItem[];
  userId: string;
  createdAt: string;
  parent?: Folder;
  user?: User;
}

export interface FileItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  userId: string;
  createdAt: string;
  folder?: Folder;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}
