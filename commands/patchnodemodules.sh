#!/bin/bash


source ~/.bashrc


for arr in \
	'localforage https://github.com/buu700/localforage-tmp'
do
	read -ra arr <<< "${arr}"
	mv "${arr[0]}" ".${arr[0]}.old"
	git clone --depth 1 "${arr[1]}" "${arr[0]}"
	mv ".${arr[0]}.old/node_modules" "${arr[0]}/" 2> /dev/null
	rm -rf ".${arr[0]}.old"
done

mkdir -p @types/libsodium
cat > @types/libsodium/index.d.ts << EOM
declare module 'libsodium' {
	interface ISodium {
		crypto_aead_xchacha20poly1305_ietf_ABYTES: number;
		crypto_aead_xchacha20poly1305_ietf_KEYBYTES: number;
		crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: number;
		crypto_box_curve25519xchacha20poly1305_NONCEBYTES: number;
		crypto_box_curve25519xchacha20poly1305_PUBLICKEYBYTES: number;
		crypto_box_curve25519xchacha20poly1305_SECRETKEYBYTES: number;
		crypto_onetimeauth_BYTES: number;
		crypto_onetimeauth_KEYBYTES: number;
		crypto_pwhash_ALG_ARGON2ID13: number;
		crypto_pwhash_BYTES_MAX: number;
		crypto_pwhash_BYTES_MIN: number;
		crypto_pwhash_MEMLIMIT_INTERACTIVE: number;
		crypto_pwhash_MEMLIMIT_MAX: number;
		crypto_pwhash_MEMLIMIT_MIN: number;
		crypto_pwhash_MEMLIMIT_MODERATE: number;
		crypto_pwhash_MEMLIMIT_SENSITIVE: number;
		crypto_pwhash_OPSLIMIT_INTERACTIVE: number;
		crypto_pwhash_OPSLIMIT_MAX: number;
		crypto_pwhash_OPSLIMIT_MIN: number;
		crypto_pwhash_OPSLIMIT_MODERATE: number;
		crypto_pwhash_OPSLIMIT_SENSITIVE: number;
		crypto_pwhash_PASSWD_MAX: number;
		crypto_pwhash_PASSWD_MIN: number;
		crypto_pwhash_SALTBYTES: number;
		crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE: number;
		crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE: number;
		crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE: number;
		crypto_pwhash_scryptsalsa208sha256_SALTBYTES: number;
		crypto_scalarmult_BYTES: number;
		crypto_scalarmult_SCALARBYTES: number;
		ready: Promise<void>;

		crypto_aead_xchacha20poly1305_ietf_decrypt (
			secretNonce: Uint8Array|undefined,
			cyphertext: Uint8Array,
			additionalData: Uint8Array|undefined,
			publicNonce: Uint8Array,
			key: Uint8Array
		) : Uint8Array;
		crypto_aead_xchacha20poly1305_ietf_encrypt (
			plaintext: Uint8Array,
			additionalData: Uint8Array|undefined,
			secretNonce: Uint8Array|undefined,
			publicNonce: Uint8Array,
			key: Uint8Array
		) : Uint8Array;
		crypto_box_curve25519xchacha20poly1305_keypair () : {
			privateKey: Uint8Array;
			publicKey: Uint8Array;
		};
		crypto_box_curve25519xchacha20poly1305_seal (
			plaintext: Uint8Array,
			publicKey: Uint8Array
		) : Uint8Array;
		crypto_box_curve25519xchacha20poly1305_seal_open (
			cyphertext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Uint8Array;
		crypto_generichash (
			outputBytes: number,
			plaintext: Uint8Array,
			key?: Uint8Array
		) : Uint8Array;
		crypto_onetimeauth (
			message: Uint8Array,
			key: Uint8Array
		) : Uint8Array;
		crypto_onetimeauth_verify (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) : boolean;
		crypto_pwhash (
			keyBytes: number,
			password: Uint8Array,
			salt: Uint8Array,
			opsLimit: number,
			memLimit: number,
			algorithm: number
		) : Uint8Array;
		crypto_pwhash_scryptsalsa208sha256 (
			keyBytes: number,
			password: Uint8Array,
			salt: Uint8Array,
			opsLimit: number,
			memLimit: number
		) : Uint8Array;
		crypto_scalarmult (privateKey: Uint8Array, publicKey: Uint8Array) : Uint8Array;
		crypto_scalarmult_base (privateKey: Uint8Array) : Uint8Array;
		crypto_stream_chacha20 (
			outLength: number,
			key: Uint8Array,
			nonce: Uint8Array
		) : Uint8Array;
		from_base64 (s: string) : Uint8Array;
		from_hex (s: string) : Uint8Array;
		from_string (s: string) : Uint8Array;
		memcmp (a: Uint8Array, b: Uint8Array) : boolean;
		memzero (a: Uint8Array) : void;
		to_base64 (a: Uint8Array) : string;
		to_hex (a: Uint8Array) : string;
		to_string (a: Uint8Array) : string;
	}

	const sodium: ISodium;
}
EOM

mkdir -p @types/lz4
cat > @types/lz4/index.d.ts << EOM
declare module 'lz4' {
	const decode: (a: Uint8Array) => Uint8Array;
	const encode: (a: Uint8Array, opts?: {streamChecksum: boolean}) => Uint8Array;
}
EOM

for anyType in \
	@ignatiusmb/scramble \
	bitauth \
	bitpay-rest \
	braintree-web-drop-in \
	cornerstone-core \
	granim \
	konami \
	lamejs \
	libvorbis.js \
	markdown-it-emoji \
	markdown-it-sup \
	mergebounce \
	opus-recorder \
	recorder.js \
	recordrtc \
	tab-indent \
	u2f-api-polyfill \
	watermarkjs \
	wowjs
do
	anyTypePackage="$(echo "${anyType}" | sed 's|/|__|g')"
	mkdir -p "@types/${anyTypePackage}"
	echo "
		declare module '${anyType}' {
			const balls: any;
			export = balls;
		}
	" > "@types/${anyTypePackage}/index.d.ts"
done

for anyType in \
	assert-browserify \
	crypto-browserify \
	https-browserify \
	readable-stream \
	stream-browserify \
	stream-http
do
	anyTypePackage="$(echo "${anyType}" | sed 's|/|__|g')"
	mkdir -p "@types/${anyTypePackage}"
	echo "
		declare module '${anyType}' {
			const balls: any;
			export default balls;
		}
	" > "@types/${anyTypePackage}/index.d.ts"
done

for m in \
	simple-peer
do
	rg -l 'module.exports = ' ${m} |
		grep -v node_modules |
		xargs sed -i 's|module.exports = |export default |g'
done

mkdir -p @types/fg-loadcss
echo "
	declare module 'fg-loadcss' {
		const loadCSS: (stylesheet: string) => void;
	}
" > @types/fg-loadcss/index.d.ts

for arr in \
	'konami/konami.js Konami' \
	'tab-indent/js/tabIndent.js tabIndent' \
	'wowjs/dist/wow.js this.WOW'
do
	read -ra arr <<< "${arr}"
	echo "module.exports = ${arr[1]};" >> "${arr[0]}"
done

sed -i 's/||!e.sender.track/||!e.sender||!e.sender.track/g' simple-peer/simplepeer.min.js
sed -i \
	's/\&\& transceiver.sender.track/\&\& transceiver.sender \&\& transceiver.sender.track/g' \
	simple-peer/index.js

cat wowjs/dist/wow.js | perl -pe 's/this\.([A-Z][a-z])/self.\1/g' > wowjs/dist/wow.js.new
mv wowjs/dist/wow.js.new wowjs/dist/wow.js

# Temporary workaround pending https://github.com/indutny/brorand/pull/11
sed -i "s|require|eval('require')|g" brorand/index.js

# Temporary workaround for https://github.com/werk85/node-html-to-text/issues/151
for f in $(grep -rl lodash html-to-text) ; do
	cat ${f} | perl -pe "s/(require\(['\"])lodash(\/.*?['\"]\))/\1lodash-es\2.default/g" > ${f}.new
	mv ${f}.new ${f}
done

# Temporary workaround for broken dependency
rm -rf google-auth-library/node_modules/fast-text-encoding &> /dev/null

# Temporary workaround pending https://github.com/ashi009/node-fast-crc32c/pull/28
echo 'Y29uc3Qge2NyYzMyY30gPSByZXF1aXJlKCdAbm9kZS1ycy9jcmMzMicpOwoKbW9kdWxlLmV4cG9ydHMgPSB7CiAgY2FsY3VsYXRlOiBjcmMzMmMsCn07Cg==' | base64 --decode > fast-crc32c/impls/rs_crc32c.js
echo 'MWEyLDMKPiAgIGNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKTsKPiAgIGNvbnN0IGlzWDg2ID0gbmV3IFNldChbJ2lhMzInLCAneDMyJywgJ3g2NCddKS5oYXMob3MuYXJjaCgpKTsKM2M1LDYKPCAgICAgJy4vaW1wbHMvc3NlNF9jcmMzMmMnLAotLS0KPiAgICAgLi4uKGlzWDg2ID8gWycuL2ltcGxzL3NzZTRfY3JjMzJjJ10gOiBbXSksCj4gICAgICcuL2ltcGxzL3JzX2NyYzMyYycsCg==' | base64 --decode | patch fast-crc32c/loader.js

# Workaround for https://github.com/angular/angular-cli/issues/22137
echo 'MTcwYTE3MSwxNzUKPiAgICAgICAgIF0sIFsKPiAgICAgICAgICAgICByZXF1aXJlKCdAYmFiZWwvcGx1Z2luLWV4dGVybmFsLWhlbHBlcnMnKS5kZWZhdWx0LAo+ICAgICAgICAgICAgIHsKPiAgICAgICAgICAgICAgICAgaGVscGVyVmVyc2lvbjogcmVxdWlyZSgnQGJhYmVsL2hlbHBlcnMvcGFja2FnZS5qc29uJykudmVyc2lvbiwKPiAgICAgICAgICAgICB9LAo=' | base64 --decode | patch @angular-devkit/build-angular/src/babel/presets/application.js
rm -rf @angular-devkit/build-angular/node_modules/@babel &> /dev/null

# Temporary workaround for unwanted font import
for f in $(rg -l '@import' @syncfusion | rg '\.s?css$') ; do
	cat ${f} |
		perl -pe "s/\@import url\(.*?\);//g" |
		perl -pe 's/\@import ?".*?";//g' |
		perl -pe "s/\@import ?'.*?';//g" \
	> ${f}.new
	mv ${f}.new ${f}
done

# Temporary workaround pending https://github.com/syncfusion/ej2-javascript-ui-controls/pull/86
echo 'NSw2YzUsMjAKPCBleHBvcnQgaW50ZXJmYWNlIEFuZ3VsYXJFdmVudEVtaXR0ZXIgewo8ICAgICBzdWJzY3JpYmU/OiAoZ2VuZXJhdG9yT3JOZXh0PzogYW55LCBlcnJvcj86IGFueSwgY29tcGxldGU/OiBhbnkpID0+IGFueTsKLS0tCj4gZXhwb3J0IGludGVyZmFjZSBBbmd1bGFyRXZlbnRFbWl0dGVyPFQ+IHsKPiAgICAgY2xvc2VkOiBib29sZWFuOwo+ICAgICBoYXNFcnJvcjogYm9vbGVhbjsKPiAgICAgaXNTdG9wcGVkOiBib29sZWFuOwo+ICAgICBvYnNlcnZlcnM6IGFueVtdOwo+ICAgICB0aHJvd25FcnJvcjogYW55Owo+ICAgICBfc3Vic2NyaWJlKHN1YnNjcmliZXI6IGFueSk6IGFueTsKPiAgICAgX3RyeVN1YnNjcmliZShzdWJzY3JpYmVyOiBhbnkpOiBhbnk7Cj4gICAgIGFzT2JzZXJ2YWJsZSgpOiBhbnk7Cj4gICAgIGNvbXBsZXRlKCk6IHZvaWQ7Cj4gICAgIGVtaXQodmFsdWU/OiBUKTogdm9pZDsKPiAgICAgZXJyb3IoZXJyOiBhbnkpOiB2b2lkOwo+ICAgICBsaWZ0PF9SPihvcGVyYXRvcjogYW55KTogYW55Owo+ICAgICBuZXh0KHZhbHVlPzogVCk6IHZvaWQ7Cj4gICAgIHN1YnNjcmliZShnZW5lcmF0b3JPck5leHQ/OiBhbnksIGVycm9yPzogYW55LCBjb21wbGV0ZT86IGFueSk6IGFueTsKPiAgICAgdW5zdWJzY3JpYmUoKTogdm9pZDsKOGMyMgo8IGV4cG9ydCBkZWNsYXJlIHR5cGUgRW1pdFR5cGU8VD4gPSBBbmd1bGFyRXZlbnRFbWl0dGVyICYgKChhcmc/OiBhbnksIC4uLnJlc3Q6IGFueVtdKSA9PiB2b2lkKTsKLS0tCj4gZXhwb3J0IGRlY2xhcmUgdHlwZSBFbWl0VHlwZTxUPiA9IEFuZ3VsYXJFdmVudEVtaXR0ZXI8VD4gJiAoKGFyZz86IGFueSwgLi4ucmVzdDogYW55W10pID0+IHZvaWQpOwo=' | base64 --decode | patch @syncfusion/ej2-base/src/base.d.ts

# Temporary workaround pending Quill 2.0 (https://github.com/quilljs/quill/pull/2238)
echo 'MTIzYTEyNAo+ICAgICAgICAgICAgIGNvbnN0IGFjY2VwdCA9ICdpbWFnZS9wbmcsIGltYWdlL2dpZiwgaW1hZ2UvanBlZywgaW1hZ2UvYm1wLCBpbWFnZS94LWljb24nOwoxMjZjMTI3CjwgICAgICAgICAgICAgZmlsZUlucHV0LnNldEF0dHJpYnV0ZSgnYWNjZXB0JywgJ2ltYWdlL3BuZywgaW1hZ2UvZ2lmLCBpbWFnZS9qcGVnLCBpbWFnZS9ibXAsIGltYWdlL3gtaWNvbicpOwotLS0KPiAgICAgICAgICAgICBmaWxlSW5wdXQuc2V0QXR0cmlidXRlKCdhY2NlcHQnLCBhY2NlcHQpOwoxMjgsMTM5YzEyOSwxNTkKPCAgICAgICAgICAgICBmaWxlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4gewo8ICAgICAgICAgICAgICAgaWYgKGZpbGVJbnB1dC5maWxlcyAhPSBudWxsICYmIGZpbGVJbnB1dC5maWxlc1swXSAhPSBudWxsKSB7CjwgICAgICAgICAgICAgICAgIGxldCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpOwo8ICAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gKGUpID0+IHsKPCAgICAgICAgICAgICAgICAgICBsZXQgcmFuZ2UgPSB0aGlzLnF1aWxsLmdldFNlbGVjdGlvbih0cnVlKTsKPCAgICAgICAgICAgICAgICAgICB0aGlzLnF1aWxsLnVwZGF0ZUNvbnRlbnRzKG5ldyBEZWx0YSgpCjwgICAgICAgICAgICAgICAgICAgICAucmV0YWluKHJhbmdlLmluZGV4KQo8ICAgICAgICAgICAgICAgICAgICAgLmRlbGV0ZShyYW5nZS5sZW5ndGgpCjwgICAgICAgICAgICAgICAgICAgICAuaW5zZXJ0KHsgaW1hZ2U6IGUudGFyZ2V0LnJlc3VsdCB9KQo8ICAgICAgICAgICAgICAgICAgICwgRW1pdHRlci5zb3VyY2VzLlVTRVIpOwo8ICAgICAgICAgICAgICAgICAgIHRoaXMucXVpbGwuc2V0U2VsZWN0aW9uKHJhbmdlLmluZGV4ICsgMSwgRW1pdHRlci5zb3VyY2VzLlNJTEVOVCk7CjwgICAgICAgICAgICAgICAgICAgZmlsZUlucHV0LnZhbHVlID0gIiI7Ci0tLQo+ICAgICAgICAgICAgIGNvbnN0IHVwbG9hZEltYWdlID0gKGRhdGFVUkkpID0+IHsKPiAgICAgICAgICAgICAgIGxldCByYW5nZSA9IHRoaXMucXVpbGwuZ2V0U2VsZWN0aW9uKHRydWUpOwo+ICAgICAgICAgICAgICAgdGhpcy5xdWlsbC51cGRhdGVDb250ZW50cyhuZXcgRGVsdGEoKQo+ICAgICAgICAgICAgICAgICAucmV0YWluKHJhbmdlLmluZGV4KQo+ICAgICAgICAgICAgICAgICAuZGVsZXRlKHJhbmdlLmxlbmd0aCkKPiAgICAgICAgICAgICAgICAgLmluc2VydCh7IGltYWdlOiBkYXRhVVJJIH0pCj4gICAgICAgICAgICAgICAsIEVtaXR0ZXIuc291cmNlcy5VU0VSKTsKPiAgICAgICAgICAgICAgIHRoaXMucXVpbGwuc2V0U2VsZWN0aW9uKHJhbmdlLmluZGV4ICsgMSwgRW1pdHRlci5zb3VyY2VzLlNJTEVOVCk7Cj4gICAgICAgICAgICAgfTsKPiAgICAgICAgICAgICBpZiAoCj4gICAgICAgICAgICAgICB0eXBlb2Ygd2luZG93LmNvcmRvdmEgPT09ICdvYmplY3QnICYmCj4gICAgICAgICAgICAgICB0eXBlb2Ygd2luZG93LmNob29zZXIgPT09ICdvYmplY3QnICYmCj4gICAgICAgICAgICAgICB0eXBlb2Ygd2luZG93LmNob29zZXIuZ2V0RmlsZSA9PT0gJ2Z1bmN0aW9uJwo+ICAgICAgICAgICAgICkgewo+ICAgICAgICAgICAgICAgZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHsKPiAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOwo+ICAgICAgICAgICAgICAgICB3aW5kb3cuY2hvb3Nlci5nZXRGaWxlKGFjY2VwdCkudGhlbigoZmlsZSkgPT4gewo+ICAgICAgICAgICAgICAgICAgIGlmIChmaWxlKSB7Cj4gICAgICAgICAgICAgICAgICAgICB1cGxvYWRJbWFnZShmaWxlLmRhdGFVUkkpOwo+ICAgICAgICAgICAgICAgICAgIH0KPiAgICAgICAgICAgICAgICAgfSk7Cj4gICAgICAgICAgICAgICB9KTsKPiAgICAgICAgICAgICB9IGVsc2Ugewo+ICAgICAgICAgICAgICAgZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHsKPiAgICAgICAgICAgICAgICAgaWYgKGZpbGVJbnB1dC5maWxlcyAhPSBudWxsICYmIGZpbGVJbnB1dC5maWxlc1swXSAhPSBudWxsKSB7Cj4gICAgICAgICAgICAgICAgICAgbGV0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7Cj4gICAgICAgICAgICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IChlKSA9PiB7Cj4gICAgICAgICAgICAgICAgICAgICB1cGxvYWRJbWFnZShlLnRhcmdldC5yZXN1bHQpOwo+ICAgICAgICAgICAgICAgICAgICAgZmlsZUlucHV0LnZhbHVlID0gIiI7Cj4gICAgICAgICAgICAgICAgICAgfQo+ICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGVJbnB1dC5maWxlc1swXSk7CjE0MSwxNDNjMTYxLDE2Mgo8ICAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzRGF0YVVSTChmaWxlSW5wdXQuZmlsZXNbMF0pOwo8ICAgICAgICAgICAgICAgfQo8ICAgICAgICAgICAgIH0pOwotLS0KPiAgICAgICAgICAgICAgIH0pOwo+ICAgICAgICAgICAgIH0K' | base64 --decode | patch quill/themes/base.js

# Workaround for https://github.com/DevExpress/DevExtreme/issues/15570
for f in devextreme/dist/css/*.css ; do
	node -e "fs.writeFileSync('${f}', fs.readFileSync('${f}').toString().
		replace(/^@charset .UTF-8.;\n/, '').
		replace(/[^\\x00-\\x7F]/g, c => \`\\\\\${c.codePointAt(0).toString(16)}\`)
	)"
done

# Temporary workaround for unwanted font imports
for f in devextreme/dist/css/*.css ; do
	cat "${f}" |
		tr '\n' '☁' |
		perl -pe 's/\@import url\(.*?\);//g' |
		perl -pe 's/\@font-face \{.*?\}//g' |
		tr '☁' '\n' \
	> "${f}.new"
	mv "${f}.new" "${f}"
done

# Temporary workaround for https://github.com/pierrec/node-lz4/pull/64#issuecomment-416119077
cp -f lz4/lib/utils-js.js lz4/lib/utils.js

./.bin/pbjs --help &> /dev/null
./.bin/pbts --help &> /dev/null

cd @types
for d in * ; do if [ ! -f ${d}/package.json ] ; then
cat > ${d}/package.json << EOM
{
	"name": "@types/${d}",
	"version": "1.0.0",
	"license": "Cyph-RSL"
}
EOM
fi ; done
cd ..

# Workarounds for tslint completed-docs bugs
sed -i \
	's|PropertySignature|PropertyDeclaration|g' \
	tslint/lib/rules/completedDocsRule.js
sed -i \
	's| this.contentTags| this.contentTags \&\& this.contentTags|g' \
	tslint/lib/rules/completed-docs/tagExclusion.js

# for d in @google-cloud/* firebase-admin firebase-tools nativescript ; do
# 	cd ${d}
# 	for i in {1..10} ; do npm install && break ; done || exit 1
# 	cd ..
# done

find . -type d \( \
	-path '*/node_modules/@angular' -o \
	-path '*/node_modules/@angular-devkit' -o \
	-path '*/node_modules/@ngtools' \
\) \
	-exec rm -rf {} \; \
2> /dev/null
