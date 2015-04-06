interface WebSign {
	continent: string;
	detectChange () : void;
	getBootstrapText () : void;
	toString (shouldIncludeBootstrapText?: boolean) : string;
}
