import {promisify} from 'util';
import {
	brotliCompress,
	brotliDecompress,
	constants,
	gunzip as gzipDecompress,
	gzip as gzipCompress
} from 'zlib';

const brotliCompressAsync = promisify(brotliCompress);
const brotliDecompressAsync = promisify(brotliDecompress);
const gzipCompressAsync = promisify(gzipCompress);
const gzipDecompressAsync = promisify(gzipDecompress);

export const brotli = {
	decode: async compressedData => brotliDecompressAsync(compressedData),
	encode: async originalData =>
		brotliCompressAsync(
			typeof originalData === 'string' ?
				Buffer.from(originalData) :
				originalData,
			{
				params: {
					[constants.BROTLI_PARAM_QUALITY]:
						constants.BROTLI_MAX_QUALITY
				}
			}
		)
};

export const gzip = {
	decode: async compressedData => gzipDecompressAsync(compressedData),
	encode: async originalData =>
		gzipCompressAsync(
			typeof originalData === 'string' ?
				Buffer.from(originalData) :
				originalData,
			{
				level: constants.Z_BEST_COMPRESSION
			}
		)
};
