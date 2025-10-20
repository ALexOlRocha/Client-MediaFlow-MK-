"use client";

import { Folder } from "@/shared/types";
import { LucideHome, Sparkles, Search, Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState, useCallback, useMemo, useRef } from "react";
import { GoFileDirectory } from "react-icons/go";
import {
  LuFilePenLine,
  LuFolderPlus,
  LuFolderOpen,
  LuList,
  LuGrid2X2,
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

// TIPAGEM PARA O INFINITE QUERY
interface InfiniteQueryData {
  pages: FolderContentResponse[];
  pageParams: number[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// HOOKS PERSONALIZADOS
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
    onSuccess: (data, variables) => {
      if (variables.parentId) {
        queryClient.invalidateQueries({
          queryKey: ["folders", variables.parentId, "content"],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["folders", "root"] });
      }
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
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ["folders", variables.id, "light"],
        (old: FolderWithCount | null) =>
          old ? { ...old, name: variables.name } : old
      );
      queryClient.invalidateQueries({ queryKey: ["folders"] });
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
    onSuccess: (data, variables) => {
      queryClient.removeQueries({ queryKey: ["folders", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({
        queryKey: ["folders", variables.id, "content"],
      });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
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
    },
  });
};

// 🔥 COMPONENTE PRINCIPAL MELHORADO
export default function MediaManager({ onFolderChange }: MediaManagerProps) {
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // CONSULTAS
  const { data: rootFolders, isLoading: loadingRoot } = useRootFolders();
  const { data: currentFolderData } = useFolder(currentFolder?.id);
  const {
    data: folderContent,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingContent,
  } = useFolderContent(currentFolder?.id);

  // MUTAÇÕES
  const createFolderMutation = useCreateFolder();
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const updateFileMutation = useUpdateFile();
  const deleteFileMutation = useDeleteFile();

  // DADOS CONSOLIDADOS
  const folders = useMemo(
    () =>
      currentFolder
        ? folderContent?.pages[0]?.children || []
        : rootFolders || [],
    [currentFolder, folderContent, rootFolders]
  );

  const files = useMemo(
    () =>
      folderContent?.pages.flatMap(
        (page: FolderContentResponse) => page.files || []
      ) || [],
    [folderContent]
  );

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

    let filtered = allItems.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
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

    return filtered;
  }, [folders, files, searchTerm, sortBy]);

  const handleUploadComplete = useCallback(() => {
    setIsUploadModalOpen(false);
  }, []);

  // NAVEGAÇÃO
  const navigateToFolder = useCallback(
    (folder: Folder) => {
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
    setCurrentFolder(null);
    setBreadcrumbs([]);
    if (onFolderChange) {
      onFolderChange(null);
    }
  }, [onFolderChange]);

  const navigateUp = useCallback(() => {
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

  const handleItemClick = (type: "folder" | "file", item: any) => {
    setSelectedItem(item.id);
    setTimeout(() => setSelectedItem(null), 300);

    if (type === "folder") {
      navigateToFolder(item);
    } else {
      window.open(`${API_BASE_URL}/api/files/${item.id}`, "_blank");
    }
  };

  // INFINITE SCROLL
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (
        scrollTop + clientHeight >= scrollHeight - 400 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  const isLoading = loadingRoot || loadingContent;
  const error =
    createFolderMutation.error ||
    updateFolderMutation.error ||
    deleteFolderMutation.error ||
    updateFileMutation.error ||
    deleteFileMutation.error;

  // LOADING STATE
  if (isLoading && !isFetchingNextPage) {
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
    <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-700 via-[#0a3057] to-orange-500 border-b border-white/20 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3">
            <Image
              src={"/MediaFlow2.png"}
              alt="logo"
              width={100}
              height={100}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Gerenciador de Mídia
              </h2>
              <p className="text-blue-100 mt-1 text-sm flex items-center">
                <Sparkles className="w-4 h-4 mr-1" />
                {currentFolder
                  ? `Em "${currentFolder.name}" • ${pagination.totalFiles} arquivos, ${pagination.totalChildren} pastas`
                  : "Navegue pelas suas pastas"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex cursor-pointer rounded-2xl md:rounded-full items-center space-x-2 px-2 md:px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl border border-white/50 hover:scale-105 group"
              >
                <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Upload</span>
              </button>

              <button
                onClick={handleAddFolder}
                disabled={createFolderMutation.isPending || isCreatingFolder}
                className="flex items-center cursor-pointer rounded-md md:rounded-full space-x-2 px-2  md:px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl border border-white/50 disabled:opacity-50 hover:scale-105"
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

              {breadcrumbs.length > 0 && (
                <button
                  onClick={navigateUp}
                  className="flex items-center cursor-pointer space-x-2 max-md:px-2 md:px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white md:rounded-full rounded-md hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl border border-white/50 hover:scale-105"
                >
                  <MdDriveFileMoveRtl className="w-5 h-5" />
                  <span className="font-medium">Voltar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-4 flex-wrap relative z-10">
          <button
            onClick={handleBackToRoot}
            className="flex cursor-pointer items-center space-x-2 px-3 py-2.5 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-all duration-300 shadow-sm border border-white/10 hover:scale-105"
          >
            <LucideHome className="w-4 h-4" />
            <span className="font-medium">Início</span>
          </button>

          {breadcrumbs.map((folder: Folder) => (
            <div key={folder.id} className="flex items-center">
              <span className="mx-2 text-white/50">/</span>
              <button
                onClick={() => navigateToFolder(folder)}
                className="flex cursor-pointer items-center border-white/50 space-x-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-all duration-300 shadow-sm border max-w-32 "
              >
                <GoFileDirectory className="w-4 h-4 flex-shrink-0" />
                <span className="truncate font-medium group-hover:whitespace-normal group-hover:break-words">
                  {folder.name}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="border-b border-gray-200/50 bg-white/50 backdrop-blur-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute  left-3 top-1/2 transform -translate-y-1/2 text-black w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar arquivos ou pastas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 outline-none  py-2.5 bg-white/80 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300 placeholder-gray-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform cursor-pointer -translate-y-1/2 text-black hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white/80 border cursor-pointer outline-none  border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
            >
              <option value="name">Ordenar por Nome</option>
              <option value="date">Ordenar por Data</option>
              <option value="size">Ordenar por Tamanho</option>
            </select>

            <div className="flex gap-2 bg-white/80 border border-gray-300 rounded-xl p-1 px-2 backdrop-blur-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg cursor-pointer transition-all duration-300 ${
                  viewMode === "grid"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                }`}
              >
                <LuGrid2X2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg cursor-pointer transition-all duration-300 ${
                  viewMode === "list"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                }`}
              >
                <LuList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo com Melhor Layout */}
      <div
        ref={scrollContainerRef}
        className="p-6 bg-gradient-to-br from-gray-50/50 to-white/30"
        style={{ maxHeight: "70vh", overflowY: "auto" }}
        onScroll={handleScroll}
      >
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-medium">{(error as Error).message}</span>
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
                  viewMode={viewMode}
                  isPending={updateFolderMutation.isPending}
                />
              ) : (
                <FileItem
                  key={`file-${item.id}`}
                  file={item}
                  selectedItem={selectedItem}
                  onEdit={() => handleEditItem("file", item.id, item.name)}
                  onDelete={() => handleDeleteItem("file", item.id, item.name)}
                  onClick={() => handleItemClick("file", item)}
                  viewMode={viewMode}
                  isPending={updateFileMutation.isPending}
                />
              )
            )}
          </div>
        ) : searchTerm ? (
          <div className="text-center py-16">
            <div className="flex flex-col items-center space-y-4">
              <Search className="w-16 h-16 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-600">
                Nenhum resultado encontrado
              </h3>
              <p className="text-gray-500">
                Não encontramos resultados para "{searchTerm}"
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Limpar busca
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            currentFolder={currentFolder}
            onAddFolder={handleAddFolder}
            onUpload={() => setIsUploadModalOpen(true)}
          />
        )}

        {isFetchingNextPage && (
          <div className="col-span-full flex justify-center py-8">
            <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg border border-gray-200/50">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 text-sm font-medium">
                Carregando mais conteúdo...
              </span>
            </div>
          </div>
        )}

        {!hasNextPage && filteredAndSortedItems.length > 0 && (
          <div className="col-span-full text-center py-8">
            <div className="text-gray-400 text-sm">
              {filteredAndSortedItems.length === 1
                ? "1 item encontrado"
                : `${filteredAndSortedItems.length} itens encontrados`}
            </div>
          </div>
        )}
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        currentFolder={currentFolder}
      />
    </div>
  );
}

// MODAL DE UPLOAD MELHORADO
const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  currentFolder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-200/80 w-full max-w-2xl max-h-[80vh] overflow-hidden transform animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 relative">
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
              className="p-2 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-full transition-all duration-300 hover:scale-110"
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

// COMPONENTE FOLDER ITEM
const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  selectedItem,
  onEdit,
  onDelete,
  onClick,
  viewMode,
  isPending,
}) => (
  <div
    className={`group relative bg-gradient-to-br from-white to-gray-50/80 border-3 border-gray-200/80 rounded-2xl shadow-xl hover:border-blue-400/60 transition-all duration-300 backdrop-blur-sm ${
      selectedItem === folder.id ? "ring-4 ring-blue-600 " : ""
    } ${
      viewMode === "grid"
        ? "p-5 hover:-translate-y-0.5"
        : "p-4 flex items-center space-x-4 hover:bg-gray-50/50"
    } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <div
      className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 ${
        viewMode === "list" ? "flex space-x-1" : ""
      }`}
    >
      <div className="flex space-x-2 bg-white/95 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-gray-200/50">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 cursor-pointer text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110"
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
          title="Deletar"
          disabled={isPending}
        >
          <RiDeleteBin6Line className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div
      onClick={isPending ? undefined : onClick}
      className={`flex items-center w-full ${
        isPending ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <div
        className={`
        flex items-center justify-center
        ${
          viewMode === "grid"
            ? "w-16 h-16 mb-3 mx-auto"
            : "w-12 h-12 flex-shrink-0"
        } ${isPending ? "animate-pulse" : ""}
      `}
      >
        {isPending ? (
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        ) : (
          <LuFolderOpen
            className={`text-blue-600 ${
              viewMode === "grid" ? "w-8 h-8" : "w-6 h-6"
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
          ${isPending ? "text-gray-800" : ""}
          break-words line-clamp-2
        `}
          title={folder.name}
        >
          {folder.name}
          {isPending && " (Atualizando...)"}
        </div>
        <div
          className={`
          text-gray-600 text-xs
          ${viewMode === "grid" ? "inline-block px-2 py-1" : ""} 
          
        `}
        >
          {folder._count?.children || 0} subpastas • {folder._count?.files || 0}{" "}
          arquivos
        </div>
      </div>
    </div>
  </div>
);

// COMPONENTE FILE
const FileItem: React.FC<FileItemProps> = ({
  file,
  selectedItem,
  onEdit,
  onDelete,
  onClick,
  viewMode,
  isPending,
}) => (
  <div
    className={`group relative bg-gradient-to-br from-white to-gray-50/80 border-2 border-gray-200/80 rounded-2xl hover:shadow-xl hover:border-blue-400/60 transition-all duration-300 backdrop-blur-sm ${
      selectedItem === file.id ? "ring-4 ring-blue-600 scale-105" : ""
    } ${
      viewMode === "grid"
        ? "p-4 hover:-translate-y-1"
        : "p-4 flex items-center space-x-4 hover:bg-gray-50/50"
    } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <div
      className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 ${
        viewMode === "list" ? "flex space-x-1" : ""
      }`}
    >
      <div className="flex space-x-1 bg-white/95 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-gray-200/50">
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
          title="Deletar"
          disabled={isPending}
        >
          <RiDeleteBin6Line className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div
      onClick={isPending ? undefined : onClick}
      className={`items-center w-full ${
        isPending ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {file.mimeType.startsWith("image/") ? (
        <div
          className={`
          relative overflow-hidden rounded-xl border border-gray-300/50 bg-gray-100
          ${viewMode === "grid" ? "h-32 mb-3" : "w-16 h-16 flex-shrink-0"}
          ${isPending ? "animate-pulse" : ""}
        `}
        >
          <Image
            src={`${API_BASE_URL}/api/files/${file.id}`}
            alt={file.name}
            width={viewMode === "grid" ? 200 : 64}
            height={viewMode === "grid" ? 200 : 64}
            className={`object-cover transition-transform duration-300 group-hover:scale-110 ${
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
          flex items-center justify-center bg-gradient-to-br from-gray-100/80 to-gray-200/80 rounded-xl border border-gray-300/50
          ${
            viewMode === "grid" ? "w-full h-32 mb-3" : "w-16 h-16 flex-shrink-0"
          } ${isPending ? "animate-pulse" : ""}
        `}
        >
          {isPending ? (
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          ) : (
            <div
              className={`transform group-hover:scale-110 transition-transform duration-300 ${
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
          text-gray-600 text-xs
          ${viewMode === "grid" ? "inline-block px-2 py-1" : ""} 
          bg-gray-100/70 rounded-full px-2 py-1
        `}
        >
          {formatFileSize(file.size)}
        </div>
      </div>
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
      <div className="w-20 h-20 bg-gradient-to-br from-gray-200/80 to-gray-300/80 rounded-2xl flex items-center justify-center border border-gray-300/50 backdrop-blur-sm shadow-lg">
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
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-sm"
        >
          Criar Pasta
        </button>
        <button
          onClick={onUpload}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-sm"
        >
          Fazer Upload
        </button>
      </div>
    </div>
  </div>
);

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
