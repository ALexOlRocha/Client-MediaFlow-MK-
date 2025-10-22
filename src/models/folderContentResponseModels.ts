import FileItem from "./fileItemModels";
import FolderWithCount from "./folderWithCount";
import PaginationInfo from "./paginationInfoModels";

export default interface FolderContentResponse {
  files: FileItem[];
  children: FolderWithCount[];
  pagination: PaginationInfo;
}
