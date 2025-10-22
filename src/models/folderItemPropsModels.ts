import FolderWithCount from "./folderWithCount";

export default interface FolderItemProps {
  folder: FolderWithCount;
  selectedItem: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  viewMode: "grid" | "list";
  isPending?: boolean;
}
