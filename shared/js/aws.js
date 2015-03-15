AWS.config	= new AWS.Config({
	region: 'us-east-1',
	accessKeyId: 'AKIAIN2DSULSB77U4S2A',
	secretAccessKey: '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',
	apiVersions: {
		ses: '2010-12-01',
		sqs: '2012-11-05'
	}
});



function makeAwsRequest (o, callback) {
	var config	= {
		url: o.url,
		action: o.action,
		isSynchronous: o.isSynchronous,
		service: o.service,
		region: o.region || AWS.config.region,
		apiVersion: o.apiVersion || AWS.config.apiVersions[o.service],
		accessKeyId: o.accessKeyId || AWS.config.credentials.accessKeyId,
		secretAccessKey: o.secretAccessKey || AWS.config.credentials.secretAccessKey,
		params: o.params || {}
	};

	var date		= new Date;
	var timestamp	= date.toISOString();
	var dateString	= timestamp.split('T')[0].replace(/-/g, '');

	var requestMethod	= 'GET';
	var algorithm		= 'AWS4-HMAC-SHA256';
	var hostHeader		= 'host';
	var terminator		= 'aws4_request';
	var host			= config.url.split('/')[2];
	var uri				= config.url.split(host)[1] || '/';

	var credential		=
		dateString + '/' +
		config.region + '/' +
		config.service + '/' +
		terminator
	;

	var params	= {};

	params.Action	= config.action;

	Object.keys(config.params).forEach(function (k) {
		params[k]	= config.params[k];
	});

	params.Timestamp				= timestamp;
	params.Version					= config.apiVersion;
	params['X-Amz-Algorithm']		= algorithm;
	params['X-Amz-Credential']		= config.accessKeyId + '/' + credential;
	params['X-Amz-Date']			= timestamp;
	params['X-Amz-SignedHeaders']	= hostHeader;

	var query	= $.param(params).replace(/\+/g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');

	var canonicalRequest	=
		requestMethod + '\n' +
		uri + '\n' +
		query + '\n' +
		hostHeader + ':' + host + '\n\n' +
		hostHeader + '\n' +
		CryptoJS.SHA256('').toString()
	;

	var stringToSign	=
		algorithm + '\n' +
		timestamp.split('.')[0].match(/[0-9A-Za-z]/g).join('') + 'Z\n' +
		credential + '\n' +
		CryptoJS.SHA256(canonicalRequest).toString()
	;


	var signature	= CryptoJS.HmacSHA256(
		stringToSign,
		CryptoJS.HmacSHA256(
			terminator,
			CryptoJS.HmacSHA256(
				config.service,
				CryptoJS.HmacSHA256(
					config.region,
					CryptoJS.HmacSHA256(
						dateString,
						'AWS4' + config.secretAccessKey
					)
				)
			)
		)
	).toString();


	$.ajax({
		async: !config.isSynchronous,
		timeout: 30000,
		type: requestMethod,
		url: config.url,
		data: query + '&X-Amz-Signature=' + signature,
		success: config.isSynchronous && callback,
		error: config.isSynchronous && callback
	});

	if (!config.isSynchronous && callback) {
		callback();
	}
}
