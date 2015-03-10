import webapp2
import datetime

import sys
sys.path.insert(0, 'lib')

import boto.sqs


class CleanUpChannels(webapp2.RequestHandler):
	def get(self):
		sqsManager	= boto.sqs.connect_to_region('eu-central-1')

		# Get all channel queues
		queues	= sqsManager.get_all_queues(prefix='channels-')

		for queue in queues:
			attributes	= sqsManager.get_queue_attributes(queue)

			# Get last modified timestamp
			timestamp	= datetime.datetime.fromtimestamp(long(attributes['LastModifiedTimestamp']))
			ageMinutes	= (datetime.datetime.now() - timestamp).seconds / 60.0

			# If hasn't been touched recently, assume it's inactive and delete it
			if ageMinutes > 30:
				sqsManager.delete_queue(queue)


		self.response.headers['Content-Type'] = 'text/plain'
		self.response.write('')


application = webapp2.WSGIApplication([
	('/cleanupchannels', CleanUpChannels),
], debug=True)
