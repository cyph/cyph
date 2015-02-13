/* returns the path replacing the ~ if it appears at the start of the path
   with the home directory of the user */
function expandHomeDir(path) {
	if (typeof window !== 'undefined') return path;
	var USER_HOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
	if (path && path[0] === '~') {
		//expand home directory
		return path.replace("~", USER_HOME);
	}
	return path;
}

module.exports = expandHomeDir;
