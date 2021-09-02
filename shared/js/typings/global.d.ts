/**
 * @global
 * If true, primary accounts theme will be applied.
 */
declare let accountPrimaryTheme: boolean;

/**
 * @global
 * If applicable, resolves when the all global async imports are complete.
 */
declare let asyncImportsComplete: Promise<void>;

/**
 * @global
 * Message to return for beforeunload event.
 */
declare let beforeUnloadMessage: string | undefined;

/**
 * @global
 * The root route of Burner.
 */
declare let burnerRoot: string;

/**
 * @global
 * Run-time `require` function specific to Cordova environments.
 */
declare let cordovaRequire: NodeRequire | undefined;

/**
 * @global
 * Base64-encoded custom build object.
 */
declare let customBuildBase64: string | undefined;

/**
 * @global
 * WorkerGlobalScope API to load JavaScript file.
 * Reduced to accept just one script rather than
 * an array to accommodate WebSign packing.
 */
declare let importScripts: (script: string) => void;

/**
 * @ignore
 */
declare let IS_WEB: boolean;

/**
 * @global
 * Cross-browser container of values in self.location.
 */
declare let locationData: Location;

/**
 * @global
 * Cross-browser container of values in self.navigator.
 */
declare let navigatorData: Navigator;

/**
 * @global
 * Used in test environments for some setup.
 */
declare let testEnvironmentSetup:
	| undefined
	| ((databaseService: any, localStorageService: any) => Promise<void>);

/**
 * @global
 * Mapping of language codes to translations of English phrases
 * (populated during build process).
 */
declare let translations: {[language: string]: {[text: string]: string}};
