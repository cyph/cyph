/**
 * @global
 * The root route of accounts.
 */
declare let accountRoot: string;

/**
 * @global
 * Message to return for beforeunload event.
 */
declare let beforeUnloadMessage: string|undefined;

/**
 * @global
 * Base64-encoded custom build object.
 */
declare let customBuildBase64: string|undefined;

/**
 * @global
 * WorkerGlobalScope API to load JavaScript file.
 * Reduced to accept just one script rather than
 * an array to accommodate WebSign packing.
 */
declare let importScripts : (script: string) => void;

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
 * Event handler for messages to the current thread.
 */
declare let onthreadmessage: ((e: MessageEvent) => any)|undefined;

/**
 * @global
 * Used in test environments for some setup.
 */
declare let testEnvironmentSetup: undefined|(
	(databaseService: any, localStorageService: any) => Promise<void>
);

/**
 * @global
 * Mapping of language codes to translations of English phrases
 * (populated during build process).
 */
declare let translations: {[language: string]: {[text: string]: string}};
