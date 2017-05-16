/* tslint:disable:no-import-side-effect */

/**
 * @file
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes Safari >= 10, Chrome >= 55 (including Opera),
 * Edge >= 13 on the desktop, and iOS 10 and Chrome on mobile.
 *
 * Learn more in https://angular.io/docs/ts/latest/guide/browser-support.html
 */


/***************************************************************************************************
 * BROWSER POLYFILLS
 */

import 'core-js/client/shim';
import 'webrtc-adapter';
import 'whatwg-fetch';
import 'zone.js/dist/zone';


/***************************************************************************************************
 * APPLICATION IMPORTS
 */

import './sham';

import '../standalone/capabilities';
import '../standalone/unsupported-browsers';
