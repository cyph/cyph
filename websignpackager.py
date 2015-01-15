#!/usr/bin/env python
# -*- coding: utf-8 -*-

import glob
import json
import re
import time
from bs4 import BeautifulSoup


f		= open('index.html', 'r')
html	= BeautifulSoup(f.read(), 'html5lib')
f.close()


for elem in html.select('script[src]'):
	path		= unicode(elem.get('src'))
	if path[0] == '/':
		path	= path[1:]
	path		= unicode.split(path, '?')[0]

	f			= open(path, 'r')
	elem.string	= re.sub('//# sourceMappingURL=.*?\.map', '', f.read())
	f.close()

	del elem['src']

for elem in html.select('link[rel="stylesheet"]'):
	path		= unicode(elem.get('href'))
	if path[0] == '/':
		path	= path[1:]
	path		= unicode.split(path, '?')[0]

	f			= open(path, 'r')
	elem.string	= f.read()
	f.close()

	del elem['rel']
	del elem['href']

	elem.name	= 'style'


f	= open('index.html', 'w')
f.write(unicode(html).encode('utf8'))
f.close()
