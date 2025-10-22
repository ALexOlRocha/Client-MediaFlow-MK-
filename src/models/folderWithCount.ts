import { Folder } from "@/shared/types";

export default interface FolderWithCount extends Folder {
  _count?: {
    children: number;
    files: number;
  };
}
