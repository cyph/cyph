/// <reference path="config.ts" />
/// <reference path="../global/base.ts" />
/// <reference path="../../lib/typings/aws-sdk/aws-sdk.d.ts" />
/// <reference path="../../lib/typings/cryptojs/cryptojs.d.ts" />
/// <reference path="../../lib/typings/jquery/jquery.d.ts" />


module Cyph {
	export class AWSWrapper {
		public static base: any	= (() => {
			let AWS: any;
			AWS.config	= new AWS.Config(Config.awsConfig);
			return AWS;
		})();

		public static request (o: any, callback?: any) : void {
			let config	= {
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

			let date: Date				= new Date;
			let timestamp: string		= date.toISOString();
			let dateString: string		= timestamp.split('T')[0].replace(/-/g, '');

			let requestMethod: string	= 'GET';
			let algorithm: string		= 'AWS4-HMAC-SHA256';
			let hostHeader: string		= 'host';
			let terminator: string		= 'aws4_request';
			let host: string			= config.url.split('/')[2];
			let uri: string				= config.url.split(host)[1] || '/';

			let credential: string		=
				dateString + '/' +
				config.region + '/' +
				config.service + '/' +
				terminator
			;

			let params: {[k: string] : string}	= {};

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

			let query: string	= $.param(params).
				replace(/\+/g, '%20').
				replace(/\(/g, '%28').
				replace(/\)/g, '%29')
			;

			let canonicalRequest: string	=
				requestMethod + '\n' +
				uri + '\n' +
				query + '\n' +
				hostHeader + ':' + host + '\n\n' +
				hostHeader + '\n' +
				CryptoJS.SHA256('').toString()
			;

			let stringToSign: string	=
				algorithm + '\n' +
				timestamp.split('.')[0].match(/[0-9A-Za-z]/g).join('') + 'Z\n' +
				credential + '\n' +
				CryptoJS.SHA256(canonicalRequest).toString()
			;


			let signature: string	= CryptoJS.HmacSHA256(
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
}
