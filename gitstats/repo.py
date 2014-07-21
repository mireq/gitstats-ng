# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from .git import Git, GitError
from collections import namedtuple
from itertools import chain
import json


Commit = namedtuple("Commit", "time author stat")
Statistic = namedtuple("Statistic", "count lines added removed")
DEFAULT_STATISTIC = Statistic(0, 0, 0, 0)


class Repository(object):
	def __init__(self, path, first_commit="", last_commit="HEAD"):
		self.path = path
		self.git = Git(path, first_commit, last_commit)

	def check_gitdir(self):
		try:
			self.git.git("status")
		except GitError:
			return False
		return True

	def collect_commit(self, commit):
		stat = {}

		for blob in self.git.commit_blobs(commit.sha):
			ext = blob.extension

			stat.setdefault(ext, DEFAULT_STATISTIC)
			old = stat[ext]
			stat[ext] = old._replace(count=old.count + 1)

			file_data = self.git.file_data(blob.sha)
			if file_data.is_binary:
				continue

			old = stat[ext]
			stat[ext] = Statistic(
				old[0],
				old[1] + file_data.lines,
				old[2] + (blob.added or 0),
				old[3] + (blob.removed or 0),
			)

		return Commit(
			commit.time,
			commit.email,
			stat,
		)

	def collect_data(self):
		projectstats = {}

		authors = self.git.authors()
		commits = [self.collect_commit(c) for c in self.git.commits()]
		extensions = list(set(chain(*[c.stat.keys() for c in commits])))

		mail_to_id = {a.email: i for i, a in enumerate(authors)}

		commits = [c._replace(author=mail_to_id[c.author]) for c in commits]
		commits = [c._replace(stat=[c.stat.get(e, DEFAULT_STATISTIC) for e in extensions]) for c in commits]

		projectstats["authors"] = authors
		projectstats["commits"] = commits
		projectstats["extensions"] = extensions

		print("data="+json.dumps((("projekt", projectstats),)))
