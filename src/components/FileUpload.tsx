"use client";

import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Interfaces para tipagem
interface Folder {
  id: string;
  name: string;
}

interface FolderUploadProps {
  parentFolderId?: string;
  onUploadComplete: () => void;
  currentFolder?: Folder | null;
}

interface UploadErrorResponse {
  error?: string;
  code?: string;
}

const MAX_ZIP_SIZE = 1024 * 1024 * 1024; // 1GB
const MAX_TOTAL_SIZE = 1024 * 1024 * 1024; // 1GB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB por arquivo

export default function FolderUpload({
  parentFolderId,
  onUploadComplete,
  currentFolder,
}: FolderUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<"zip" | "structure">("zip");
  const [uploadProgress, setUploadProgress] = useState(0);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleZipUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const file = files[0];

      // Verificar tamanho do arquivo
      if (file.size > MAX_ZIP_SIZE) {
        throw new Error(
          `Arquivo muito grande. Tamanho máximo: ${formatFileSize(
            MAX_ZIP_SIZE
          )}`
        );
      }

      const formData = new FormData();
      formData.append("zipFile", file);

      const targetFolderId = parentFolderId || currentFolder?.id;
      if (targetFolderId) {
        formData.append("parentFolderId", targetFolderId);
      }

      const folderName = file.name.replace(/\.zip$/i, "");
      formData.append("folderName", folderName);

      console.log(
        "📦 Enviando ZIP:",
        file.name,
        "Tamanho:",
        formatFileSize(file.size)
      );

      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 300);

      const response = await fetch(`${API_BASE_URL}/api/folders/upload-zip`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log(
        "📨 Resposta do servidor:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        let errorMessage = `Upload falhou: ${response.status}`;
        try {
          const errorData: UploadErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;

          // Tratamento específico para erro de tamanho
          if (errorData.code === "LIMIT_FILE_SIZE") {
            errorMessage = `Arquivo muito grande. Tamanho máximo: ${formatFileSize(
              MAX_ZIP_SIZE
            )}`;
          }
        } catch {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Pasta uploadada com sucesso:", result);

      // Pequeno delay para mostrar 100% completo
      setTimeout(() => {
        onUploadComplete();
        event.target.value = "";
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error("❌ Erro no upload de pasta:", error);
      setUploadError(
        error instanceof Error ? error.message : "Erro desconhecido no upload"
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMultipleFilesUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      const fileList = Array.from(files);

      // Verificar tamanho total
      const totalSize = fileList.reduce((acc, file) => acc + file.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error(
          `Arquivos muito grandes. Tamanho total máximo: ${formatFileSize(
            MAX_TOTAL_SIZE
          )}`
        );
      }

      // Verificar arquivos individuais
      for (const file of fileList) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(
            `Arquivo "${file.name}" muito grande. Máximo: ${formatFileSize(
              MAX_FILE_SIZE
            )} por arquivo`
          );
        }
      }

      // Adicionar todos os arquivos
      fileList.forEach((file) => {
        formData.append("files", file);
        console.log(
          "📎 Adicionando arquivo:",
          file.name,
          formatFileSize(file.size)
        );
      });

      // CORREÇÃO: Usar folderId em vez de parentFolderId
      const targetFolderId = parentFolderId || currentFolder?.id;
      if (targetFolderId) {
        formData.append("folderId", targetFolderId); // CORRIGIDO
        console.log("📁 Pasta destino:", targetFolderId);
      }

      console.log(
        "📤 Enviando múltiplos arquivos:",
        fileList.length,
        "arquivos, Total:",
        formatFileSize(totalSize)
      );

      // DEBUG: Mostrar dados do FormData
      console.log("📦 Conteúdo do FormData:");
      for (const pair of formData.entries()) {
        console.log(
          `  ${pair[0]}:`,
          pair[1] instanceof File ? `File: ${(pair[1] as File).name}` : pair[1]
        );
      }

      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 300);

      // CORREÇÃO: Tentar ambas as rotas sequencialmente
      let response;
      let usedAltRoute = false;

      // Primeiro tenta a rota principal
      try {
        response = await fetch(`${API_BASE_URL}/api/files/upload-multiple`, {
          method: "POST",
          body: formData,
        });
        console.log("🔄 Usando rota principal: /api/files/upload-multiple");
      } catch (routeError) {
        console.warn(
          "⚠️ Rota principal falhou, tentando alternativa...",
          routeError
        );

        // Se a rota principal falhar, tenta a alternativa
        response = await fetch(
          `${API_BASE_URL}/api/files/upload-multiple-alt`,
          {
            method: "POST",
            body: formData,
          }
        );
        usedAltRoute = true;
        console.log(
          "🔄 Usando rota alternativa: /api/files/upload-multiple-alt"
        );
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log("📨 Resposta do servidor:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        rota: usedAltRoute ? "alternativa" : "principal",
      });

      if (!response.ok) {
        let errorMessage = `Upload falhou: ${response.status} ${response.statusText}`;
        try {
          const errorData: UploadErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error("❌ Erro detalhado:", errorData);
        } catch {
          const text = await response.text();
          errorMessage = text || errorMessage;
          console.error("❌ Erro texto:", text);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Upload múltiplo bem-sucedido:", result);

      // Mostrar estatísticas do upload
      if (result.failed > 0) {
        console.warn("⚠️ Alguns arquivos falharam:", result.details?.failed);
      }

      setTimeout(() => {
        onUploadComplete();
        event.target.value = "";
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error("❌ Erro completo no upload múltiplo:", error);
      setUploadError(
        error instanceof Error ? error.message : "Erro desconhecido no upload"
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // // Função para testar as rotas (debug)
  // const testRoutes = async () => {
  //   console.log("🧪 Testando rotas disponíveis...");
  //   try {
  //     const response = await fetch(`${API_BASE_URL}/api/debug/routes`);
  //     if (response.ok) {
  //       const routes = await response.json();
  //       console.log("🛣️ Rotas disponíveis:", routes);
  //     } else {
  //       console.warn("⚠️ Rota de debug não disponível");
  //     }
  //   } catch (error) {
  //     console.error("❌ Erro ao testar rotas:", error);
  //   }
  // };

  const handleCloseError = (): void => {
    setUploadError(null);
  };

  const handleUploadTypeChange = (type: "zip" | "structure"): void => {
    setUploadType(type);
  };

  return (
    <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          📁 Upload de Pastas
        </h3>

        <div className="flex space-x-2 mb-3">
          <button
            onClick={() => handleUploadTypeChange("zip")}
            className={`px-3 py-2 rounded-sm cursor-pointer text-sm ${
              uploadType === "zip"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Via ZIP
          </button>
          <button
            onClick={() => handleUploadTypeChange("structure")}
            className={`px-3 py-2 rounded-sm cursor-pointer text-sm ${
              uploadType === "structure"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Múltiplos Arquivos
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-2">
          {currentFolder
            ? `Upload em: ${currentFolder.name}`
            : "Upload na pasta raiz"}
        </div>

        <div className="text-xs text-gray-500 mb-2">
          💡 <strong>Limites aumentados!</strong>
          <br />• ZIPs: até <strong>1GB</strong>
          <br />• Arquivos individuais: até <strong>100MB</strong>
          <br />• Total múltiplos: até <strong>1GB</strong>
        </div>

        {/* Botão de debug (opcional)
        <button
          onClick={testRoutes}
          className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 mb-2"
        >
          Testar Rotas
        </button> */}
      </div>

      {uploadType === "zip" ? (
        <div>
          <input
            type="file"
            accept=".zip,.ZIP"
            onChange={handleZipUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Faça upload de um arquivo ZIP contendo pastas e arquivos (até 1GB)
          </p>
        </div>
      ) : (
        <div>
          <input
            type="file"
            multiple
            onChange={handleMultipleFilesUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Selecione múltiplos arquivos (até 1GB no total, 100MB por arquivo)
          </p>
        </div>
      )}

      {isUploading && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progresso:</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="flex items-center mt-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-gray-600">
              {uploadType === "zip"
                ? "Processando ZIP..."
                : "Processando arquivos..."}
            </span>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          <div className="font-semibold">❌ Erro no Upload</div>
          <div className="mt-1">{uploadError}</div>
          <button
            onClick={handleCloseError}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            Fechar
          </button>
        </div>
      )}

      {uploadProgress === 100 && !isUploading && !uploadError && (
        <div className="mt-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
          <div className="font-semibold">✅ Upload concluído com sucesso!</div>
          <div className="text-xs mt-1">
            {uploadType === "zip"
              ? "A pasta foi importada com toda a estrutura."
              : "Os arquivos foram uploadados com sucesso."}
          </div>
        </div>
      )}
    </div>
  );
}
