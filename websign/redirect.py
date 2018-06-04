import webapp2


class Redirect (webapp2.RequestHandler):
	def decorateHeaders (self, path):
		location = '/#' + path

		if 'X-Host' in self.request.headers:
			location = 'https://' + self.request.headers['X-Host'] + location

		self.response.headers.add_header('Location', location)
		self.response.status	= 301

	def get (self, path):
		self.decorateHeaders(path)
		self.response.write('')

	def head(self, path):
		self.decorateHeaders(path)

	def options(self, path):
		self.decorateHeaders(path)


app	= webapp2.WSGIApplication([
	('/(.*)', Redirect),
])
