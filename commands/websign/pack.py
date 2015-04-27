#!/usr/bin/env python
# -*- coding: utf-8 -*-

import glob
import json
import re
import sys
import time
from bs4 import BeautifulSoup


fileIn	= sys.argv[1]
fileOut	= sys.argv[2]


f		= open(fileIn, 'r')
html	= BeautifulSoup(f.read(), 'html5lib')
f.close()


for elem in html.select('script[src]'):
	path		= unicode(elem.get('src'))
	if path[0] == '/':
		path	= path[1:]
	path		= unicode.split(path, '?')[0]

	f			= open(path, 'r')
	elem.string	= re.sub('</script>', '<\\/script>', re.sub('//# sourceMappingURL=.*?\.map', '', f.read()))
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


f	= open(fileOut, 'w')
f.write(unicode(html).encode('utf8'))
f.close()
