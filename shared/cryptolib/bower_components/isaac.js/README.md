# isaac.js
*isaac.js* is a JavaScript implementation of the [ISAAC](http://www.burtleburtle.net/bob/rand/isaac.html) random number generator.

ISAAC is a [CSPRNG](http://en.wikipedia.org/wiki/CSPRNG) designed by [Robert J. Jenkins Jr.](http://burtleburtle.net/bob/) in 1996 and based on RC4. It is designed to be fast and secure. *isaac.js* is fully compatible with the original *32-bit integer arithmetic* implementations of ISAAC.

ISAAC can generate cryptographically secure pseudorandom numbers from an input but do not provide any entropy source. It's the responsability of the user to seed ISAAC with a strong entropy source.

##Use
Include isaac.js into your html file, and seed it using `isaac.seed(s)` then call `isaac.random()` to get a random real number between 0.0 and 1.0 :

  `var random_number = isaac.random();`

If you want a little more control over the PRNG you can reset isaac (all internals to zero) using `isaac.reset()` or use a new seed using `isaac.seed(s)` (*s* can be a string, a number or an array of number). You can also run the PRNG an arbitrary number of time before querying a new random output using `isaac.prng(n)`, where *n* (optional) is the number of run. `isaac.rand()` allow you to get a random 32-bit integer between -2147483648 (0x00000000) and 2147483647 (0xFFFFFFFF).

##Licence
###isaac.js is released under the [MIT Licence](http://www.opensource.org/licenses/MIT):
Copyright (c) 2012 Yves-Marie K. Rinquin

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
