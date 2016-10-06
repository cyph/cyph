/**
 * @global If applicable, identifier of this custom build.
 */
declare let customBuild: string;

/**
 * @global If applicable, favicon for this custom build.
 */
declare let customBuildFavicon: string;

/**
 * @ignore 
 */
declare let IS_WEB: boolean;

/**
 * @global Cross-browser container of values in self.location.
 */
declare let locationData: Location;

/**
 * @global Cross-browser container of values in self.navigator.
 */
declare let navigatorData: Navigator;

/**
 * @global Event handler for messages to the current thread.
 */
declare let onthreadmessage: (e: MessageEvent) => any;

/**
 * @global Object containing translations for English phrases
 * (only exists in main thread of production environments).
 */
declare let Translations: {[language: string] : {[text: string] : string}};
