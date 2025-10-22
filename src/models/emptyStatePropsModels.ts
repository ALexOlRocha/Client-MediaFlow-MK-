import { Folder } from "@/shared/types";

export default interface EmptyStateProps {
  currentFolder: Folder | null;
  onAddFolder: () => void;
  onUpload: () => void;
}
