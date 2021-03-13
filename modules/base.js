import {createRequire} from 'module';
import path from 'path';
import {fileURLToPath} from 'url';

export const getMeta = o => {
	const __filename = fileURLToPath(o.url);
	const __dirname = path.dirname(__filename);
	const isCLI = process.argv[1] === __filename;
	const require = createRequire(o.url);

	return {__dirname, __filename, isCLI, require};
};
