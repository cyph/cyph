var Module = require("../../build/libotr4.js");

var fs = (typeof window === 'undefined') ? require("fs") : undefined;
var path = require("path");
var fs_existsSync = fs ? fs.existsSync || path.existsSync : undefined;
if (!path.sep) {
	path.sep = (process.platform.indexOf("win") === 0) ? "\\" : "/";
}

module.exports.VirtualFileSystem = VirtualFileSystem;

function VirtualFileSystem() {

	function path_real(p) {
		return p.replace(new RegExp('/', 'g'), path.sep);
	}

	function path_vfs(p) {
		return p.replace(new RegExp(/\\/g), '/');
	}

	this.nextFileName = (function () {
		var FILE_COUNTER = 0;
		return (function () {
			FILE_COUNTER = FILE_COUNTER + 1;
			return "/auto-file-" + FILE_COUNTER;
		});
	})();

	//cp a file from real file system to virtual file system - full paths must be specified.
	this.importFile = function (source, destination, transform) {
		if (!fs) {
			throw new Error("node filesystem not available.");
		}
		if (typeof source !== 'string') {
			throw new TypeError("first argument must be a string.");
		}
		if (typeof destination !== 'string') {
			throw new TypeError("second argument must be a string.");
		}
		if (transform && typeof transform !== 'function') {
			throw new TypeError("third argument must be a function.");
		}

		destination = path_vfs(destination);
		source = path_real(source);
		var target_folder, data, virtual_file;
		var filename = destination.split('/').reverse()[0];
		if (filename) {
			target_folder = Module.FS_findObject(path_vfs(path.dirname(destination)));
			if (!target_folder) {
				target_folder = Module.FS_createPath("/", path_vfs(path.dirname(destination)),
					true,
					true);
			}
			if (target_folder) {
				if (fs_existsSync(source)) {
					data = fs.readFileSync(source);
					data = transform ? transform(data) : data;
					virtual_file = Module.FS_findObject(path_vfs(destination));
					if (virtual_file) {
						//delete existing vfs file
						Module.FS_destroyNode(virtual_file);
					}
					virtual_file = Module.FS_createDataFile(target_folder, filename, data, true,
						true);
				} else throw new Error("No such file or directory '" + source + "'");
			}
		}
	};

	//cp a file from virtual file system to real file system
	this.exportFile = function (source, destination, transform) {
		if (!fs) {
			throw new Error("node filesystem not available.");
		}
		if (typeof source !== 'string') {
			throw new TypeError("first argument must be a string.");
		}
		if (typeof destination !== 'string') {
			throw new TypeError("second argument must be a string.");
		}
		if (transform && typeof transform !== 'function') {
			throw new TypeError("third argument must be a function.");
		}

		var data, fd;
		destination = path_real(destination);
		source = path_vfs(source);
		//TODO preserve same file permissions (mode) - make sure files only readable by user
		data = Module.FS_readDataFile(source);
		if (data) {
			data = transform ? transform(data) : data;
			if (!fs_existsSync(path_real(path.dirname(destination)))) {
				fs.mkdirSync(path_real(path.dirname(destination)));
			}
			fd = fs.openSync(destination, "w");
			fs.writeSync(fd, data, 0, data.length, 0);
			fs.closeSync(fd);
		} else throw new Error("virtual file not found '" + source + "'");
	};

	this.readFileData = function (source) {
		if (typeof source !== "string") {
			throw new TypeError("first argument must be a string.");
		}
		source = path_vfs(source);
		var virtual_file = Module.FS_findObject(path_vfs(source));
		if (virtual_file) {
			return Module.FS_readDataFile(source);
		} else {
			throw new Error("virtual file not found '" + source + "'");
		}
	};

	this.makeFile = function (destination, data) {
		if (typeof destination !== 'string') {
			throw new TypeError('first argument must be a string.');
		}
		if (!(data instanceof Buffer)) {
			throw new TypeError("second argument must be a Buffer.");
		}
		destination = path_vfs(destination);
		var target_folder, virtual_file;
		var filename = destination.split('/').reverse()[0];
		if (filename) {
			target_folder = Module.FS_findObject(path_vfs(path.dirname(destination)));
			if (!target_folder) {
				target_folder = Module.FS_createPath("/", path_vfs(path.dirname(destination)),
					true,
					true);
			}

			if (target_folder && data) {
				virtual_file = Module.FS_findObject(path_vfs(destination));
				if (virtual_file) {
					//delete existing vfs file
					Module.FS_destroyNode(virtual_file);
				}
				Module.FS_createDataFile(target_folder, filename, data, true, true);
			}
		}
	};

	this.deleteFile = function (destination) {
		var virtual_file = Module.FS_findObject(path_vfs(destination));
		if (virtual_file) Module.FS_destroyNode(virtual_file);
	};
}
