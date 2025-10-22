"use client";

import { Folder } from "@/shared/types";
import {
  LucideHome,
  Sparkles,
  Search,
  Upload,
  X,
  Loader2,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import Image from "next/image";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { GoFileDirectory } from "react-icons/go";
import {
  LuFilePenLine,
  LuFolderPlus,
  LuFolderOpen,
  LuList,
  LuGrid2X2,
  LuDownload,
  LuShare2,
} from "react-icons/lu";
import { MdDriveFileMoveRtl } from "react-icons/md";
import { RiDeleteBin6Line } from "react-icons/ri";
import FileUpload from "./FileUpload";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  InfiniteData,
} from "@tanstack/react-query";

// INTERFACES TIPADAS
interface MediaManagerProps {
  onFolderChange?: (folder: Folder | null) => void;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  currentFolder: Folder | null;
}

interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
}

interface FolderWithCount extends Folder {
  _count?: {
    children: number;
    files: number;
  };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalFiles: number;
  totalChildren: number;
  totalPages: number;
}

interface FolderContentResponse {
  files: FileItem[];
  children: FolderWithCount[];
  pagination: PaginationInfo;
}

interface FolderItemProps {
  folder: FolderWithCount;
  selectedItem: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  viewMode: "grid" | "list";
  isPending?: boolean;
}

interface FileItemProps {
  file: FileItem;
  selectedItem: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  viewMode: "grid" | "list";
  isPending?: boolean;
}

interface EmptyStateProps {
  currentFolder: Folder | null;
  onAddFolder: () => void;
  onUpload: () => void;
}

interface SearchResult {
  files: FileItem[];
  folders: FolderWithCount[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// HOOKS PERSONALIZADOS (mantidos iguais)
const useRootFolders = () => {
  return useQuery<FolderWithCount[]>({
    queryKey: ["folders", "root"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/folders/root`);
      if (!response.ok) throw new Error("Erro ao carregar pastas");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};

const useFolder = (folderId?: string) => {
  return useQuery<FolderWithCount | null>({
    queryKey: ["folders", folderId, "light"],
    queryFn: async () => {
      if (!folderId) return null;
      const response = await fetch(
        `${API_BASE_URL}/api/folders/${folderId}/light`
      );
      if (!response.ok) throw new Error("Erro ao carregar pasta");
      return response.json();
    },
    enabled: !!folderId,
  });
};

const useFolderContent = (folderId?: string, pageSize: number = 20) => {
  return useInfiniteQuery<
    FolderContentResponse,
    Error,
    InfiniteData<FolderContentResponse>,
    [string, string | undefined, string],
    number
  >({
    queryKey: ["folders", folderId, "content"],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      if (!folderId) {
        return {
          files: [],
          children: [],
          pagination: {
            page: 1,
            pageSize,
            totalFiles: 0,
            totalChildren: 0,
            totalPages: 0,
          },
        };
      }

      const response = await fetch(
        `${API_BASE_URL}/api/folders/${folderId}/content-paginated?` +
          new URLSearchParams({
            page: pageParam.toString(),
            pageSize: pageSize.toString(),
            includeFiles: "true",
            includeChildren: "true",
          })
      );
      if (!response.ok) throw new Error("Erro ao carregar conteúdo");
      return response.json();
    },
    getNextPageParam: (lastPage: FolderContentResponse) => {
      return lastPage.pagination?.page < lastPage.pagination?.totalPages
        ? lastPage.pagination.page + 1
        : undefined;
    },
    initialPageParam: 1,
    enabled: !!folderId,
  });
};

const useGlobalSearch = (searchTerm: string, enabled: boolean) => {
  return useQuery<SearchResult>({
    queryKey: ["globalSearch", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) {
        return { files: [], folders: [] };
      }

      const response = await fetch(
        `${API_BASE_URL}/api/search?` +
          new URLSearchParams({
            q: searchTerm,
            includeFiles: "true",
            includeFolders: "true",
          })
      );
      if (!response.ok) throw new Error("Erro na busca");
      return response.json();
    },
    enabled: enabled && searchTerm.trim().length > 0,
    staleTime: 1 * 60 * 1000,
  });
};

const useCreateFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      parentId,
    }: {
      name: string;
      parentId?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/api/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId }),
      });
      if (!response.ok) throw new Error("Erro ao criar pasta");
      return response.json();
    },
    onSuccess: (_data, variables) => {
      if (variables.parentId) {
        queryClient.invalidateQueries({
          queryKey: ["folders", variables.parentId, "content"],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["folders", "root"] });
      }
      queryClient.invalidateQueries({ queryKey: ["globalSearch"] });
    },
  });
};

const useUpdateFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await fetch(`${API_BASE_URL}/api/folders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar pasta");
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(
        ["folders", variables.id, "light"],
        (old: FolderWithCount | null) =>
          old ? { ...old, name: variables.name } : old
      );
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["globalSearch"] });
    },
  });
};

const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      recursive,
    }: {
      id: string;
      recursive?: boolean;
    }) => {
      const endpoint = recursive
        ? `${API_BASE_URL}/api/folders/${id}/recursive`
        : `${API_BASE_URL}/api/folders/${id}`;

      const response = await fetch(endpoint, { method: "DELETE" });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Erro na resposta:", response.status, errorData);
        throw new Error(
          `Erro ao deletar pasta: ${response.status} ${response.statusText}`
        );
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      } else {
        return { success: true };
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({ queryKey: ["folders", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({
        queryKey: ["folders", variables.id, "content"],
      });
      queryClient.invalidateQueries({ queryKey: ["globalSearch"] });
    },
    onError: (error: Error) => {
      console.error("Erro na mutação deleteFolder:", error);
    },
  });
};

const useUpdateFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await fetch(`${API_BASE_URL}/api/files/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar arquivo");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["globalSearch"] });
    },
  });
};

const useDeleteFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/api/files/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar arquivo");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["globalSearch"] });
    },
  });
};

export default function MediaManager({ onFolderChange }: MediaManagerProps) {
  const queryClient = useQueryClient();
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    type: string;
    x: number;
    y: number;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsGlobalSearch(searchTerm.trim().length > 0);
  }, [searchTerm]);

  const handleUploadComplete = useCallback(() => {
    setIsUploadModalOpen(false);
    console.log("🔄 Invalidando cache do React Query...");

    if (currentFolder?.id) {
      queryClient.invalidateQueries({
        queryKey: ["folders", currentFolder.id, "content"],
      });
      queryClient.invalidateQueries({
        queryKey: ["folders", currentFolder.id, "light"],
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: ["folders", "root"],
      });
    }

    queryClient.invalidateQueries({
      queryKey: ["folders"],
    });

    if (isGlobalSearch) {
      queryClient.invalidateQueries({
        queryKey: ["globalSearch"],
      });
    }
  }, [currentFolder?.id, queryClient, isGlobalSearch]);

  // CONSULTAS
  const { data: rootFolders, isLoading: loadingRoot } = useRootFolders();
  const { data: _currentFolderData } = useFolder(currentFolder?.id);
  const {
    data: folderContent,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingContent,
  } = useFolderContent(currentFolder?.id);

  const {
    data: searchResults,
    isLoading: loadingSearch,
    isError: searchError,
  } = useGlobalSearch(searchTerm, isGlobalSearch);

  // MUTAÇÕES
  const createFolderMutation = useCreateFolder();
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const updateFileMutation = useUpdateFile();
  const deleteFileMutation = useDeleteFile();

  // DADOS CONSOLIDADOS
  const folders = useMemo(() => {
    if (isGlobalSearch && searchResults) {
      return searchResults.folders || [];
    }
    return currentFolder
      ? folderContent?.pages[0]?.children || []
      : rootFolders || [];
  }, [
    currentFolder,
    folderContent,
    rootFolders,
    isGlobalSearch,
    searchResults,
  ]);

  const files = useMemo(() => {
    if (isGlobalSearch && searchResults) {
      return searchResults.files || [];
    }
    return (
      folderContent?.pages.flatMap(
        (page: FolderContentResponse) => page.files || []
      ) || []
    );
  }, [folderContent, isGlobalSearch, searchResults]);

  const pagination = folderContent?.pages[0]?.pagination || {
    totalFiles: 0,
    totalChildren: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  };

  // FILTRAGEM E ORDENAÇÃO
  const filteredAndSortedItems = useMemo(() => {
    const allItems = [
      ...folders.map((folder) => ({ ...folder, type: "folder" as const })),
      ...files.map((file) => ({ ...file, type: "file" as const })),
    ];

    const sortedItems = [...allItems];

    sortedItems.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name, "pt-BR");
        case "date":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "size":
          if (a.type === "folder" && b.type === "folder") return 0;
          if (a.type === "folder") return -1;
          if (b.type === "folder") return 1;
          return (b as FileItem).size - (a as FileItem).size;
        default:
          return 0;
      }
    });

    return sortedItems;
  }, [folders, files, sortBy]);

  // NAVEGAÇÃO
  const navigateToFolder = useCallback(
    (folder: Folder) => {
      setSearchTerm("");
      setIsGlobalSearch(false);
      setCurrentFolder(folder);
      setBreadcrumbs((prev) => {
        const alreadyExists = prev.some((f: Folder) => f.id === folder.id);
        if (alreadyExists) {
          const folderIndex = prev.findIndex((f: Folder) => f.id === folder.id);
          return prev.slice(0, folderIndex + 1);
        } else {
          return [...prev, folder];
        }
      });

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      if (onFolderChange) {
        onFolderChange(folder);
      }
    },
    [onFolderChange]
  );

  const handleBackToRoot = useCallback(() => {
    setSearchTerm("");
    setIsGlobalSearch(false);
    setCurrentFolder(null);
    setBreadcrumbs([]);
    if (onFolderChange) {
      onFolderChange(null);
    }
  }, [onFolderChange]);

  const navigateUp = useCallback(() => {
    setSearchTerm("");
    setIsGlobalSearch(false);
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      const parentFolder = newBreadcrumbs[newBreadcrumbs.length - 1];
      if (parentFolder) {
        navigateToFolder(parentFolder);
      } else {
        handleBackToRoot();
      }
    } else {
      handleBackToRoot();
    }
  }, [breadcrumbs, navigateToFolder, handleBackToRoot]);

  // HANDLERS
  const handleAddFolder = async () => {
    setIsCreatingFolder(true);
    const name = prompt("Nome da nova pasta:");
    if (name && name.trim()) {
      try {
        await createFolderMutation.mutateAsync({
          name: name.trim(),
          parentId: currentFolder?.id,
        });
      } catch (error) {
        console.error("Erro ao criar pasta:", error);
      }
    }
    setIsCreatingFolder(false);
  };

  const handleEditItem = async (
    type: "folder" | "file",
    id: string,
    currentName: string
  ) => {
    const newName = prompt(
      `Novo nome para ${type === "folder" ? "pasta" : "arquivo"}:`,
      currentName
    );
    if (newName && newName.trim() && newName !== currentName) {
      try {
        if (type === "folder") {
          await updateFolderMutation.mutateAsync({ id, name: newName.trim() });
        } else {
          await updateFileMutation.mutateAsync({ id, name: newName.trim() });
        }
      } catch (error) {
        console.error(`Erro ao atualizar ${type}:`, error);
      }
    }
  };

  const handleDeleteItem = async (
    type: "folder" | "file",
    id: string,
    name: string
  ) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja deletar ${
        type === "folder" ? "a pasta" : "o arquivo"
      } "${name}"?`
    );

    if (confirmDelete) {
      try {
        if (type === "folder") {
          const folder = folders.find((f: FolderWithCount) => f.id === id);
          if (
            folder &&
            ((folder._count?.children ?? 0) > 0 ||
              (folder._count?.files ?? 0) > 0)
          ) {
            const confirmRecursive = window.confirm(
              "Esta pasta contém arquivos ou subpastas. Deseja deletar tudo permanentemente?"
            );
            if (confirmRecursive) {
              await deleteFolderMutation.mutateAsync({ id, recursive: true });
            }
          } else {
            await deleteFolderMutation.mutateAsync({ id });
          }
        } else {
          await deleteFileMutation.mutateAsync(id);
        }
      } catch (error) {
        console.error(`Erro ao deletar ${type}:`, error);
      }
    }
  };

  const handleItemClick = (
    type: "folder" | "file",
    item: FolderWithCount | FileItem
  ) => {
    setSelectedItem(item.id);
    setTimeout(() => setSelectedItem(null), 300);

    if (type === "folder") {
      navigateToFolder(item as Folder);
    } else {
      window.open(`${API_BASE_URL}/api/files/${item.id}`, "_blank");
    }
  };

  // CONTEXT MENU HANDLERS
  const handleContextMenu = (
    e: React.MouseEvent,
    item: { id: string; type: string }
  ) => {
    e.preventDefault();
    setContextMenu({
      id: item.id,
      type: item.type,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleContextMenuAction = (
    action: string,
    item: { id: string; type: string; name: string }
  ) => {
    setContextMenu(null);

    switch (action) {
      case "rename":
        handleEditItem(item.type as "folder" | "file", item.id, item.name);
        break;
      case "delete":
        handleDeleteItem(item.type as "folder" | "file", item.id, item.name);
        break;
      case "download":
        if (item.type === "file") {
          window.open(`${API_BASE_URL}/api/files/${item.id}`, "_blank");
        }
        break;
      case "share":
        // Implementar compartilhamento
        console.log("Compartilhar:", item);
        break;
    }
  };

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isGlobalSearch) return;

      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (
        scrollTop + clientHeight >= scrollHeight - 400 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage, isGlobalSearch]
  );

  const isLoading = loadingRoot || loadingContent || loadingSearch;
  const error =
    createFolderMutation.error ||
    updateFolderMutation.error ||
    deleteFolderMutation.error ||
    updateFileMutation.error ||
    deleteFileMutation.error ||
    searchError;

  // LOADING STATE
  if (isLoading && !isFetchingNextPage && !isGlobalSearch) {
    return (
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8">
        <div className="flex flex-col items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <span className="text-gray-600 font-medium">
            Carregando seu conteúdo...
          </span>
          <p className="text-gray-500 text-sm mt-2">
            Isso pode levar alguns segundos
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
        {/* HEADER MELHORADO */}
        <div className="bg-gradient-to-r from-blue-700 via-[#0a3057] to-orange-500 border-b border-white/20 px-6 py-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
            <div className="flex items-center space-x-4">
              <Image
                src={"/MediaFlow2.png"}
                alt="logo"
                width={48}
                height={48}
                className="w-12 h-12 rounded-xl shadow-lg"
              />
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Gerenciador de Mídia
                </h2>
                <p className="text-blue-100 mt-1 text-sm flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGlobalSearch
                    ? `Buscando: "${searchTerm}" • ${filteredAndSortedItems.length} resultados`
                    : currentFolder
                    ? `Em "${currentFolder.name}" • ${pagination.totalFiles} arquivos, ${pagination.totalChildren} pastas`
                    : "Navegue pelas suas pastas"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center cursor-pointer space-x-2 px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl border border-white/50 hover:scale-105 group"
              >
                <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Upload</span>
              </button>

              <button
                onClick={handleAddFolder}
                disabled={
                  createFolderMutation.isPending ||
                  isCreatingFolder ||
                  isGlobalSearch
                }
                className="flex items-center cursor-pointer space-x-2 px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl border border-white/50 disabled:opacity-50 hover:scale-105"
              >
                {createFolderMutation.isPending || isCreatingFolder ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LuFolderPlus className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {createFolderMutation.isPending || isCreatingFolder
                    ? "Criando..."
                    : "Nova Pasta"}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4 flex-wrap relative z-10">
            <button
              onClick={handleBackToRoot}
              className="flex items-center cursor-pointer space-x-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-all duration-300 shadow-sm border border-white/10 hover:scale-105"
            >
              <LucideHome className="w-4 h-4" />
              <span className="font-medium">Início</span>
            </button>

            {!isGlobalSearch &&
              breadcrumbs.map((folder: Folder) => (
                <div key={folder.id} className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-white/50 mx-2" />
                  <button
                    onClick={() => navigateToFolder(folder)}
                    className="flex items-center cursor-pointer space-x-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-all duration-300 shadow-sm border border-white/10 max-w-32"
                  >
                    <GoFileDirectory className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate font-medium">{folder.name}</span>
                  </button>
                </div>
              ))}

            {isGlobalSearch && (
              <div className="flex items-center">
                <ChevronRight className="w-4 h-4 text-white/50 mx-2" />
                <div className="flex items-center space-x-2 px-3 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-white border border-white/50">
                  <Search className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate font-medium">
                    Busca: &quot;{searchTerm}&quot;
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BARRA DE FERRAMENTAS PROFISSIONAL */}
        <div className="border-b border-gray-200/50 bg-white/50 backdrop-blur-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4 flex-1 w-full md:max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar em cursor-pointer todos os arquivos e pastas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border outline-none border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-gray-500 shadow-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 cursor-pointer top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "name" | "date" | "size")
                }
                className="bg-white border outline-none cursor-pointer border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              >
                <option value="name">Ordenar por Nome</option>
                <option value="date">Ordenar por Data</option>
                <option value="size">Ordenar por Tamanho</option>
              </select>

              <div className="flex bg-white border border-gray-300 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all cursor-pointer duration-300 ${
                    viewMode === "grid"
                      ? "bg-blue-500 text-white shadow-md"
                      : "text-gray-600 hover:text-blue-600  hover:bg-gray-100"
                  }`}
                >
                  <LuGrid2X2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all cursor-pointer duration-300 ${
                    viewMode === "list"
                      ? "bg-blue-500 text-white shadow-md"
                      : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  <LuList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div
          ref={scrollContainerRef}
          className="p-6 bg-gradient-to-br from-gray-50 to-white/50"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
          onScroll={handleScroll}
        >
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 backdrop-blur-sm shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">
                    {(error as Error).message}
                  </span>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Recarregar
                </button>
              </div>
            </div>
          )}

          {/* INDICADOR DE BUSCA */}
          {isGlobalSearch && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl backdrop-blur-sm shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Search className="w-4 h-4" />
                  <span className="font-medium">
                    Buscando em todas as pastas: &quot;{searchTerm}&quot;
                  </span>
                </div>
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                >
                  Limpar busca
                </button>
              </div>
            </div>
          )}

          {/* GRADE DE ITENS */}
          {filteredAndSortedItems.length > 0 ? (
            <div
              className={`
                ${
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-3"
                }
              `}
            >
              {filteredAndSortedItems.map((item) =>
                item.type === "folder" ? (
                  <FolderItem
                    key={`folder-${item.id}`}
                    folder={item}
                    selectedItem={selectedItem}
                    onEdit={() => handleEditItem("folder", item.id, item.name)}
                    onDelete={() =>
                      handleDeleteItem("folder", item.id, item.name)
                    }
                    onClick={() => handleItemClick("folder", item)}
                    onContextMenu={(e) =>
                      handleContextMenu(e, { id: item.id, type: "folder" })
                    }
                    viewMode={viewMode}
                    isPending={updateFolderMutation.isPending}
                  />
                ) : (
                  <FileItem
                    key={`file-${item.id}`}
                    file={item}
                    selectedItem={selectedItem}
                    onEdit={() => handleEditItem("file", item.id, item.name)}
                    onDelete={() =>
                      handleDeleteItem("file", item.id, item.name)
                    }
                    onClick={() => handleItemClick("file", item)}
                    onContextMenu={(e) =>
                      handleContextMenu(e, { id: item.id, type: "file" })
                    }
                    viewMode={viewMode}
                    isPending={updateFileMutation.isPending}
                  />
                )
              )}
            </div>
          ) : searchTerm ? (
            <EmptySearchState
              searchTerm={searchTerm}
              onClearSearch={() => setSearchTerm("")}
            />
          ) : (
            <EmptyState
              currentFolder={currentFolder}
              onAddFolder={handleAddFolder}
              onUpload={() => setIsUploadModalOpen(true)}
            />
          )}

          {/* LOADING STATES */}
          {loadingSearch && (
            <LoadingState message="Buscando em todas as pastas..." />
          )}

          {!hasNextPage &&
            filteredAndSortedItems.length > 0 &&
            !isGlobalSearch && (
              <div className="col-span-full text-center py-8">
                <div className="text-gray-400 text-sm">
                  {filteredAndSortedItems.length === 1
                    ? "1 item encontrado"
                    : `${filteredAndSortedItems.length} itens encontrados`}
                </div>
              </div>
            )}

          {isGlobalSearch && filteredAndSortedItems.length > 0 && (
            <div className="col-span-full text-center py-8">
              <div className="text-gray-400 text-sm">
                {filteredAndSortedItems.length === 1
                  ? "1 resultado encontrado"
                  : `${filteredAndSortedItems.length} resultados encontrados`}
              </div>
            </div>
          )}

          {isFetchingNextPage && !isGlobalSearch && (
            <LoadingState message="Carregando mais conteúdo..." />
          )}
        </div>
      </div>
      {/* MODAL DE UPLOAD */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        currentFolder={currentFolder}
      />
      {/* CONTEXT MENU */}

      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200/80 backdrop-blur-sm py-2 min-w-48"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu(null)}
        >
          {/* Encontrar o item real para obter o nome */}
          {(() => {
            const item = filteredAndSortedItems.find(
              (i) => i.id === contextMenu.id
            );
            if (!item) return null;

            return (
              <>
                {contextMenu.type === "file" && (
                  <>
                    <button
                      onClick={() =>
                        handleContextMenuAction("download", {
                          id: contextMenu.id,
                          type: contextMenu.type,
                          name: item.name,
                        })
                      }
                      className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <LuDownload className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                  </>
                )}
                <button
                  onClick={() =>
                    handleContextMenuAction("rename", {
                      id: contextMenu.id,
                      type: contextMenu.type,
                      name: item.name,
                    })
                  }
                  className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LuFilePenLine className="w-4 h-4" />
                  <span>Renomear</span>
                </button>
                <button
                  onClick={() =>
                    handleContextMenuAction("delete", {
                      id: contextMenu.id,
                      type: contextMenu.type,
                      name: item.name,
                    })
                  }
                  className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <RiDeleteBin6Line className="w-4 h-4" />
                  <span>Excluir</span>
                </button>
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}

const FolderItem: React.FC<
  FolderItemProps & { onContextMenu: (e: React.MouseEvent) => void }
> = ({
  folder,
  selectedItem,
  onEdit,
  onDelete,
  onClick,
  onContextMenu,
  viewMode,
  isPending,
}) => (
  <div
    className={`group relative bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm ${
      selectedItem === folder.id ? "ring-2 ring-blue-500 border-blue-300" : ""
    } ${
      viewMode === "grid"
        ? "p-5 hover:-translate-y-0.5"
        : "p-4 flex items-center space-x-4 hover:bg-gray-50"
    } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    onClick={isPending ? undefined : onClick}
    onContextMenu={onContextMenu}
  >
    {/* BOTÕES DE AÇÃO VISÍVEIS */}
    <div
      className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 ${
        viewMode === "list" ? "flex space-x-1" : ""
      }`}
    >
      <div className="flex space-x-1 bg-white/95 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 text-blue-600 cursor-pointer hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110"
          title="Renomear"
          disabled={isPending}
        >
          <LuFilePenLine className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-red-600 cursor-pointer hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
          title="Excluir"
          disabled={isPending}
        >
          <RiDeleteBin6Line className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div
      className={`flex items-center w-full ${
        isPending ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <div
        className={`
        flex items-center justify-center  rounded-md m-4 
        ${viewMode === "grid" ? "w-16 h-16 mb-3 " : "w-14 h-14 "} ${
          isPending ? "animate-pulse" : ""
        }
      `}
      >
        {isPending ? (
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        ) : (
          <LuFolderOpen
            className={`text-blue-600 ${
              viewMode === "grid" ? "w-12 h-12 p-1" : "w-10 h-10"
            }`}
          />
        )}
      </div>

      <div
        className={viewMode === "grid" ? "text-center" : "ml-4 flex-1 min-w-0"}
      >
        <div
          className={`
          font-semibold text-gray-900 group-hover:text-blue-700 transition-colors
          ${viewMode === "grid" ? "text-sm mb-2 px-1" : "text-base"} 
          ${isPending ? "text-gray-500" : ""}
          break-words line-clamp-2
        `}
          title={folder.name}
        >
          {folder.name}
          {isPending && " (Atualizando...)"}
        </div>
        <div
          className={`
          text-gray-500 text-xs
          ${
            viewMode === "grid"
              ? "inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full"
              : ""
          } 
        `}
        >
          <span>{folder._count?.children || 0} subpastas</span>
          <span>•</span>
          <span>{folder._count?.files || 0} arquivos</span>
        </div>
      </div>
    </div>
  </div>
);

// COMPONENTE FILE ITEM ATUALIZADO
const FileItem: React.FC<
  FileItemProps & { onContextMenu: (e: React.MouseEvent) => void }
> = ({
  file,
  selectedItem,
  onEdit,
  onDelete,
  onClick,
  onContextMenu,
  viewMode,
  isPending,
}) => (
  <div
    className={`group relative bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm ${
      selectedItem === file.id ? "ring-2 ring-blue-500 border-blue-300" : ""
    } ${
      viewMode === "grid"
        ? "p-4 hover:-translate-y-0.5"
        : "p-4 flex items-center space-x-4 hover:bg-gray-50"
    } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    onClick={isPending ? undefined : onClick}
    onContextMenu={onContextMenu}
  >
    {/* BOTÕES DE AÇÃO VISÍVEIS */}
    <div
      className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 ${
        viewMode === "list" ? "flex space-x-1" : ""
      }`}
    >
      <div className="flex space-x-1 bg-white/95 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(`${API_BASE_URL}/api/files/${file.id}`, "_blank");
          }}
          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-110"
          title="Download"
          disabled={isPending}
        >
          <LuDownload className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110"
          title="Renomear"
          disabled={isPending}
        >
          <LuFilePenLine className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
          title="Excluir"
          disabled={isPending}
        >
          <RiDeleteBin6Line className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div
      className={`items-center w-full ${
        isPending ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {file.mimeType.startsWith("image/") ? (
        <div
          className={`
          relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100
          ${viewMode === "grid" ? "h-32 mb-3" : "w-16 h-16 flex-shrink-0"}
          ${isPending ? "animate-pulse" : ""}
        `}
        >
          <Image
            src={`${API_BASE_URL}/api/images/${file.id}`}
            alt={file.name}
            width={viewMode === "grid" ? 500 : 100}
            height={viewMode === "grid" ? 500 : 100}
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              viewMode === "grid" ? "w-full h-full" : "w-16 h-16"
            }`}
            onError={(e) => {
              console.error("Erro ao carregar imagem:", file.name);
              e.currentTarget.style.display = "none";
            }}
          />
          {viewMode === "grid" && (
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm font-medium">
              IMG
            </div>
          )}
          {isPending && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          className={`
          flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200
          ${
            viewMode === "grid" ? "w-full h-32 mb-3" : "w-16 h-16 flex-shrink-0"
          } ${isPending ? "animate-pulse" : ""}
        `}
        >
          {isPending ? (
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          ) : (
            <div
              className={`text-gray-600 group-hover:scale-110 transition-transform duration-300 ${
                viewMode === "grid" ? "text-3xl" : "text-2xl"
              }`}
            >
              {getFileIcon(file.mimeType)}
            </div>
          )}
        </div>
      )}

      <div
        className={viewMode === "grid" ? "text-center" : "ml-4 flex-1 min-w-0"}
      >
        <div
          className={`
          font-semibold text-gray-900 group-hover:text-blue-700 transition-colors
          ${viewMode === "grid" ? "text-sm mb-1 px-1" : "text-base"} 
          ${isPending ? "text-gray-500" : ""}
          break-words line-clamp-2
        `}
          title={file.name}
        >
          {file.name}
          {isPending && " (Atualizando...)"}
        </div>
        <div
          className={`
          text-gray-500 text-xs
          ${
            viewMode === "grid"
              ? "inline-block px-2 py-1 bg-gray-100 rounded-full"
              : ""
          } 
        `}
        >
          {formatFileSize(file.size)} •{" "}
          {new Date(file.createdAt).toLocaleDateString("pt-BR")}
        </div>
      </div>
    </div>
  </div>
);

// NOVO COMPONENTE PARA ESTADO DE BUSCA VAZIA
const EmptySearchState: React.FC<{
  searchTerm: string;
  onClearSearch: () => void;
}> = ({ searchTerm, onClearSearch }) => (
  <div className="text-center py-16">
    <div className="flex flex-col items-center space-y-4">
      <Search className="w-16 h-16 text-gray-300" />
      <h3 className="text-xl font-bold text-gray-600">
        Nenhum resultado encontrado
      </h3>
      <p className="text-gray-500">
        Não encontramos resultados para &quot;{searchTerm}&quot; em todas as
        pastas
      </p>
      <button
        onClick={onClearSearch}
        className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm font-semibold"
      >
        Limpar busca
      </button>
    </div>
  </div>
);

// COMPONENTE DE LOADING REUTILIZÁVEL
const LoadingState: React.FC<{ message: string }> = ({ message }) => (
  <div className="col-span-full flex justify-center py-8">
    <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg border border-gray-200">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      <span className="text-gray-600 text-sm font-medium">{message}</span>
    </div>
  </div>
);

const EmptyState: React.FC<EmptyStateProps> = ({
  currentFolder,
  onAddFolder,
  onUpload,
}) => (
  <div className="col-span-full text-center py-16">
    <div className="flex flex-col items-center space-y-6 max-w-md mx-auto">
      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center border border-gray-300 shadow-sm">
        <LuFolderOpen className="w-10 h-10 text-gray-500" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {currentFolder ? "Pasta vazia" : "Nenhuma pasta encontrada"}
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {currentFolder
            ? "Adicione arquivos ou crie subpastas para começar."
            : "Crie sua primeira pasta para organizar seus arquivos."}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onAddFolder}
          className="px-6 py-3 bg-blue-500 cursor-pointer text-white rounded-xl hover:bg-blue-600 transition-all duration-300 shadow-sm hover:shadow-md font-semibold text-sm"
        >
          Criar Pasta
        </button>
        <button
          onClick={onUpload}
          className="px-6 py-3 bg-orange-500 text-white rounded-xl cursor-pointer hover:bg-orange-600 transition-all duration-300 shadow-sm hover:shadow-md font-semibold text-sm"
        >
          Fazer Upload
        </button>
      </div>
    </div>
  </div>
);

// MODAL DE UPLOAD (mantido similar)
const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  currentFolder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-300">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] overflow-hidden transform animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-700 via-[#0a3057] to-orange-500 p-5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Upload de Arquivos
                </h3>
                <p className="text-blue-100 text-sm">
                  {currentFolder
                    ? `Enviando para: ${currentFolder.name}`
                    : "Enviando para pasta raiz"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 cursor-pointer hover:text-white bg-white/20 hover:bg-white/30 rounded-full transition-all duration-300 hover:scale-110"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <FileUpload
            onUploadComplete={onUploadComplete}
            currentFolder={currentFolder}
          />
        </div>
      </div>
    </div>
  );
};

function getFileIcon(mimeType: string): string {
  const icons: { [key: string]: string } = {
    "image/": "🖼️",
    "video/": "🎥",
    "audio/": "🎵",
    "application/pdf": "📕",
    "application/msword": "📄",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "📄",
    "application/vnd.ms-excel": "📊",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
    "text/": "📝",
    "application/zip": "📦",
    "application/x-rar-compressed": "📦",
    default: "📄",
  };

  for (const [key, icon] of Object.entries(icons)) {
    if (mimeType.includes(key)) return icon;
  }
  return icons.default;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
