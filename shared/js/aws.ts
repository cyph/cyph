/// <reference path="globals.ts" />
/// <reference path="config.ts" />
/// <reference path="../lib/typings/aws-sdk/aws-sdk.d.ts" />
/// <reference path="../lib/typings/cryptojs/cryptojs.d.ts" />
/// <reference path="../lib/typings/jquery/jquery.d.ts" />


class Aws {
	public static base: any	= (() => {
		var AWS: any;
		AWS.config	= new AWS.Config(Config.awsConfig);
		return AWS;
	})();

	public static request (o: any, callback?: any) : void {
		var config	= {
			url: o.url,
			action: o.action,
			isSynchronous: !!o.isSynchronous,
			service: o.service,
			region: o.region || Config.awsConfig.region,
			apiVersion: o.apiVersion || Config.awsConfig.apiVersions[o.service],
			accessKeyId: o.accessKeyId || Config.awsConfig.accessKeyId,
			secretAccessKey: o.secretAccessKey || Config.awsConfig.secretAccessKey,
			params: o.params || {}
		};

		var date: Date				= new Date;
		var timestamp: string		= date.toISOString();
		var dateString: string		= timestamp.split('T')[0].replace(/-/g, '');

		var requestMethod: string	= 'GET';
		var algorithm: string		= 'AWS4-HMAC-SHA256';
		var hostHeader: string		= 'host';
		var terminator: string		= 'aws4_request';
		var host: string			= config.url.split('/')[2];
		var uri: string				= config.url.split(host)[1] || '/';

		var credential: string		=
			dateString + '/' +
			config.region + '/' +
			config.service + '/' +
			terminator
		;

		var params: {[k: string] : string}	= {};

		params['Action']	= config.action;

		Object.keys(config.params).forEach(k =>
			params[k]	= config.params[k]
		);

		params['Timestamp']				= timestamp;
		params['Version']				= config.apiVersion;
		params['X-Amz-Algorithm']		= algorithm;
		params['X-Amz-Credential']		= config.accessKeyId + '/' + credential;
		params['X-Amz-Date']			= timestamp;
		params['X-Amz-SignedHeaders']	= hostHeader;

		var query: string	= $.param(params).
			replace(/\+/g, '%20').
			replace(/\(/g, '%28').
			replace(/\)/g, '%29')
		;

		var canonicalRequest: string	=
			requestMethod + '\n' +
			uri + '\n' +
			query + '\n' +
			hostHeader + ':' + host + '\n\n' +
			hostHeader + '\n' +
			CryptoJS.SHA256('').toString()
		;

		var stringToSign: string	=
			algorithm + '\n' +
			timestamp.split('.')[0].match(/[0-9A-Za-z]/g).join('') + 'Z\n' +
			credential + '\n' +
			CryptoJS.SHA256(canonicalRequest).toString()
		;


		var signature: string	= CryptoJS.HmacSHA256(
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
			success: config.isSynchronous ? null : callback,
			error: config.isSynchronous ? null : callback
		});

		if (config.isSynchronous && callback) {
			callback();
		}
	}
}
