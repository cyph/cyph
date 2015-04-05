function makeWorker (f, vars) {
	var s	= f.toString();
	s		= s.slice(s.indexOf('{') + 1, s.lastIndexOf('}'));

	if (vars) {
		s	= s.replace(new RegExp('this.vars', 'g'), JSON.stringify(vars));
	}

	var blob, worker;

	try {
		blob	= new Blob([s], {type: 'application/javascript'});
	}
	catch (e) {
		window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
		blob	= new BlobBuilder();
		blob.append(s);
		blob	= blob.getBlob();
	}

	try {
		worker	= new Worker(URL.createObjectURL(blob));
	}
	catch (e) {
		worker	= new Worker('/websign/js/workerHelper.js');
		worker.postMessage(s);
	}

	return worker;
}
