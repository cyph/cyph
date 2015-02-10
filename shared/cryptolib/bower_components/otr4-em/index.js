/** @module otr */

/*
 *  Off-the-Record Messaging bindings for node/javascript
 *  Copyright (C) 2012  Mokhtar Naamani,
 *                      <mokhtar.naamani@gmail.com>
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of version 2 of the GNU General Public License as
 *  published by the Free Software Foundation.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

var libotr = require("./lib/bindings");

if (libotr.version() !== "4.1.0-emscripten") {
	console.error("Error. excpecting libotr4.1.0-emscripten! exiting..");
	throw ("Invalid libotr version returned");
}

/** @method
 *  @returns {String} libotr version information
 */
exports.version = libotr.version;

exports.User = require("./lib/User.js").User;
exports.Account = require("./lib/Account.js").Account;
exports.Session = require("./lib/Session.js").Session;
exports.Contact = require("./lib/Contact.js").Contact;
exports.POLICY = require("./lib/POLICY.js");
exports.MSGEVENT = require("./lib/MSGEVENT.js");
exports.Buffer = require("buffer").Buffer;
