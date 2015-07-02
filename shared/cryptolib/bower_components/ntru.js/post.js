;

function dataAllocate (n) {
	var data		= new Uint8Array(n);
	var nDataBytes	= data.length * data.BYTES_PER_ELEMENT;
	var dataHeap	= new Uint8Array(Module.HEAPU8.buffer, Module._malloc(nDataBytes), nDataBytes);
	dataHeap.set(new Uint8Array(data.buffer));
	return {data: data, dataHeap: dataHeap};
}

function dataArgument (o) {
    return o.dataHeap.byteOffset;
}

function dataReturn (returnValue, result) {
	if (returnValue === 0) {
		return result;
	}
	else {
		throw new Error('NTRU error: ' + returnValue);
	}
}

function dataResult (o) {
	var result	= new Uint8Array(o.dataHeap);
	Module._free(o.dataHeap.byteOffset);
	return result;
}


var seedlength	= 512;
var seed		= dataAllocate(crypto.getRandomValues(new Uint8Array(seedlength)));
Module.ccall('init', 'number', ['number', 'number'], [dataArgument(seed), seedlength]);
dataResult(seed);


var keypair	= Module.cwrap('keypair', 'number', ['number', 'number']);
var encrypt	= Module.cwrap('encrypt', 'number', ['number', 'number', 'number', 'number', 'number']);
var decrypt	= Module.cwrap('decrypt', 'number', ['number', 'number', 'number', 'number', 'number']);


var ntru	= {
	publicKeyLength: Module.ccall('publen', 'number'),
	privateKeyLength: Module.ccall('privlen', 'number'),
	encryptedDataLength: Module.ccall('enclen', 'number'),
	decryptedDataLength: Module.ccall('declen', 'number'),

	keyPair: function () {
		var pub		= dataAllocate(ntru.publicKeyLength);
		var priv	= dataAllocate(ntru.privateKeyLength);

		var returnValue	= keypair(
			dataArgument(pub),
			dataArgument(priv)
		);

		return dataReturn(returnValue, {
			publicKey: dataResult(pub),
			privateKey: dataResult(priv)
		});
	},
	encrypt: function (message, publicKey) {
		var msg	= dataAllocate(message);
		var pub	= dataAllocate(publicKey);
		var enc	= dataAllocate(ntru.encryptedDataLength);

		var returnValue	= encrypt(
			dataArgument(msg),
			msg.data.length,
			dataArgument(pub),
			pub.data.length,
			dataArgument(enc)
		);

		dataResult(msg);
		dataResult(pub);

		return dataReturn(returnValue, dataResult(enc));
	},
	decrypt: function (message, privateKey) {
		var enc		= dataAllocate(message);
		var priv	= dataAllocate(privateKey);
		var dec		= dataAllocate(ntru.decryptedDataLength);

		var returnValue	= decrypt(
			dataArgument(enc),
			enc.data.length,
			dataArgument(priv),
			priv.data.length,
			dataArgument(dec)
		);

		dataResult(enc);
		dataResult(priv);

		if (returnValue >= 0) {
			return new Uint8Array(
				dataResult(dec).buffer,
				0,
				returnValue
			);
		}
		else {
			dataReturn(-returnValue);
		}
	}
};



return ntru;

}());

self.ntru	= ntru;
