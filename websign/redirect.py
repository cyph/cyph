import webapp2


class Redirect (webapp2.RequestHandler):
	def decorateHeaders (self, path):
		location = '/#' + path

		# Workaround for Tor server configuration
		if 'Host' in self.request.headers and self.request.headers['Host'].endswith(':8081'):
			location = 'https://' + self.request.headers['Host'].split(':')[0] + location

		self.response.headers.add_header('Location', location)
		self.response.status	= 301

	def get (self, path):
		self.decorateHeaders(path)
		self.response.write('')

	def head (self, path):
		self.decorateHeaders(path)

	def options (self, path):
		self.decorateHeaders(path)


app	= webapp2.WSGIApplication([
	('/(.*)', Redirect),
])
