/**
 * @global Event handler for messages to the current thread.
 */
declare let onthreadmessage: (e: MessageEvent) => any;

/**
 * @global String containing compiled contents of fonts.scss
 * (only exists in main thread of production environments).
 */
declare let FontsCSS: string;

/**
 * @global Object containing translations for English phrases
 * (only exists in main thread of production environments).
 */
declare let Translations: {[language: string] : {[text: string] : string}};

/**
 * @global WebSign object (only created in WebSigned environments).
 */
declare let WebSign: IWebSign;

/**
 * @global NTRU library.
 */
declare let Ntru: any;

/**
 * @global Sodium library.
 */
declare let Sodium: any;
