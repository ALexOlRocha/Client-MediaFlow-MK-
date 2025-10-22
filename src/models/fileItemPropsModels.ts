import FileItem from "./fileItemModels";

export default interface FileItemProps {
  file: FileItem;
  selectedItem: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  viewMode: "grid" | "list";
  isPending?: boolean;
}
