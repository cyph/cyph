module Cyph {
	export module Channel {
		export class AWS {
			public static base	= self['AWS'];

			public static request (o: any, callback: any = () => {}) : void {
				const config	= {
					url: o.url,
					action: o.action,
					isSynchronous: !!o.isSynchronous,
					service: o.service,
					region: Util.getValue(o, 'region', Config.awsConfig.region),
					apiVersion: Util.getValue(o, 'apiVersion', Config.awsConfig.apiVersions[o.service]),
					accessKeyId: Util.getValue(o, 'accessKeyId', Config.awsConfig.accessKeyId),
					secretAccessKey: Util.getValue(o, 'secretAccessKey', Config.awsConfig.secretAccessKey),
					params: Util.getValue(o, 'params', {})
				};

				const date: Date			= new Date;
				const timestamp: string		= date.toISOString();
				const dateString: string	= timestamp.split('T')[0].replace(/-/g, '');

				const requestMethod: string	= 'GET';
				const algorithm: string		= 'AWS4-HMAC-SHA256';
				const hostHeader: string	= 'host';
				const terminator: string	= 'aws4_request';
				const host: string			= config.url.split('/')[2];
				const uri: string			= config.url.split(host)[1] || '/';

				const credential: string	=
					dateString + '/' +
					config.region + '/' +
					config.service + '/' +
					terminator
				;

				const params: {[k: string] : string}	= {};

				params['Action']	= config.action;

				for (const k of Object.keys(config.params)) {
					params[k]	= config.params[k];
				}

				params['Timestamp']				= timestamp;
				params['Version']				= config.apiVersion;
				params['X-Amz-Algorithm']		= algorithm;
				params['X-Amz-Credential']		= config.accessKeyId + '/' + credential;
				params['X-Amz-Date']			= timestamp;
				params['X-Amz-SignedHeaders']	= hostHeader;

				const query: string	= Util.toQueryString(params).
					replace(/\+/g, '%20').
					replace(/\(/g, '%28').
					replace(/\)/g, '%29')
				;

				const canonicalRequest: string	=
					requestMethod + '\n' +
					uri + '\n' +
					query + '\n' +
					hostHeader + ':' + host + '\n\n' +
					hostHeader + '\n' +
					CryptoJS.SHA256('').toString()
				;

				const stringToSign: string	=
					algorithm + '\n' +
					timestamp.split('.')[0].match(/[0-9A-Za-z]/g).join('') + 'Z\n' +
					credential + '\n' +
					CryptoJS.SHA256(canonicalRequest).toString()
				;


				const signature: string	= CryptoJS.HmacSHA256(
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


				Util.request({
					async: !config.isSynchronous,
					method: requestMethod,
					url: config.url,
					data: query + '&X-Amz-Signature=' + signature,
					success: callback,
					error: callback
				});
			}

			private static _	= (() => {
				AWS.base.config	= new AWS.base.Config(Config.awsConfig);
			})();
		}
	}
}
