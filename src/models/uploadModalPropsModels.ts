import { Folder } from "@/shared/types";

export default interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  currentFolder: Folder | null;
}
