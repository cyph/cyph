import FileSystemItem from 'devextreme/file_management/file_system_item';
import {Observable} from 'rxjs';
import {MaybePromise} from '../../../maybe-promise-type';
import {IDataSourceFile} from './idata-source-file';

/** File manager event handlers. */
export interface IFileManagerHandlers {
	/** Change directory event. */
	changeDirectory: (directory: string) => MaybePromise<void>;

	/** Checks if a file has a link shared. */
	checkIfLinkShared: (downloadID: string) => Observable<boolean>;

	/** Create directory event. */
	createDirectory: (directory: string) => MaybePromise<void>;

	/** Download file event. */
	downloadAndSave: (file: FileSystemItem) => MaybePromise<void>;

	/** Download file event. */
	moveFile: (
		file: FileSystemItem,
		destinationPath: string,
		copy: boolean
	) => MaybePromise<void>;

	/** Remove directory event. */
	removeDirectory: (directory: string) => MaybePromise<void>;

	/** Remove file event. */
	removeFile: (id: string) => MaybePromise<void>;

	/** Revoke public link event. */
	revokeDownloadLink: (file: FileSystemItem) => MaybePromise<void>;

	/** Open selected file event. */
	selectedFileOpen: (file: FileSystemItem) => MaybePromise<void>;

	/** Change selection event. */
	selectionChange?: (items: FileSystemItem[]) => MaybePromise<void>;

	/** Share file as public link event. */
	shareDownloadLink: (file: FileSystemItem) => MaybePromise<void>;

	/** Share file event. */
	shareFile: (file: IDataSourceFile) => MaybePromise<void>;

	/** Upload file event. */
	uploadFile: (fileData: File) => MaybePromise<void>;
}
