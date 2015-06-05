all:
	rm -rf dist NTRUEncrypt 2> /dev/null
	mkdir dist
	git clone https://github.com/NTRUOpenSourceProject/NTRUEncrypt.git
	emcc -O3 --llvm-opts 0 --memory-init-file 0 \
		-Dparams=NTRU_EES439EP1 \
		-INTRUEncrypt/include -INTRUEncrypt/src \
		NTRUEncrypt/src/*.c ntru.c \
		-s EXPORTED_FUNCTIONS="['_keypair', '_encrypt', '_decrypt', '_init', '_publen', '_privlen', '_enclen', '_declen']" \
		--pre-js pre.js --post-js post.js \
		-o dist/ntru.js
	rm -rf NTRUEncrypt

clean:
	rm -rf dist NTRUEncrypt
