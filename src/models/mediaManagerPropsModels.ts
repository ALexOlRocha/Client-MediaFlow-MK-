import { Folder } from "@/shared/types";

export default interface MediaManagerProps {
  onFolderChange?: (folder: Folder | null) => void;
}
