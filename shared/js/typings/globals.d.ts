/**
 * @global
 * @deprecated
 * Object containing Cyph namespace.
 */
declare let cyph: any;

/**
 * @global
 * If applicable, identifier of this custom build.
 */
declare let customBuild: string;

/**
 * @global
 * If applicable, favicon for this custom build.
 */
declare let customBuildFavicon: string;

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
declare let onthreadmessage: (e: MessageEvent) => any;

/**
 * @global
 * Mapping of language codes to translations of English phrases
 * (populated during build process).
 */
declare let translations: {[language: string]: {[text: string]: string}};

/**
 * @global
 * @deprecated
 * Current UI object.
 */
declare let ui: any;
