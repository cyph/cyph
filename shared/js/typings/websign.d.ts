interface WebSign {
	bootstrapText: string;
	cdnUrl: string;
	continent: string;
	isOnion: boolean;

	config: {
		abortUrl: string;
		cdnUrlBase: string;
		continentUrl: string;
		defaultContinent: string;
		hashPath: string;
		packagePath: string;
		urlProtocol: string;
		files: string[];
		publicKeys: string[];
	};

	detectChange () : void;
	loadBootstrapText (callback: Function) : void;
	shouldRetry () : boolean;
	toString (shouldIncludeBootstrapText?: boolean) : string;
}
