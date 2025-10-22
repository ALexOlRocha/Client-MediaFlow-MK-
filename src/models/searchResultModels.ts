import FileItem from "./fileItemModels";
import FolderWithCount from "./folderWithCount";

export default interface SearchResult {
  files: FileItem[];
  folders: FolderWithCount[];
}
