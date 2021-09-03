import childProcess from 'child_process';

export const decode = compressedData =>
	childProcess.spawnSync('brotli', ['-Zdc'], {input: compressedData}).stdout;

export const encode = originalData =>
	childProcess.spawnSync('brotli', ['-Zc'], {
		input:
			typeof originalData === 'string' ?
				Buffer.from(originalData) :
				originalData
	}).stdout;
