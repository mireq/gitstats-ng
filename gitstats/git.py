# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import json
import os.path
import re
from collections import namedtuple
from subprocess import Popen, PIPE


AuthorData = namedtuple('AuthorData', 'name email')
BlobLstreeData = namedtuple('BlobLstreeData', 'sha filename')
BlobDiffData = namedtuple('BlobDiffData', 'filename added removed')
BlobData = namedtuple('BlobData', 'sha extension added removed')
CommitData = namedtuple('CommitData', 'sha time email')
FileData = namedtuple('FileData', 'sha lines is_binary')


class GitError(RuntimeError):
	pass


def sha_cache(func):
	def get_or_set_cache(self, sha):
		if self._cache is None:
			self._cache = {}
			try:
				with open(self._cache_file, "rb") as sha_cache_file:
					data = json.loads(sha_cache_file.read())
					for sha_hash, item in data.iteritems():
						is_bloblist = isinstance(item[0], list)
						if is_bloblist:
							self._cache[sha_hash] = [BlobData(*d) for d in item]
						else:
							self._cache[sha_hash] = FileData(*item)
			except Exception:
				pass

		if sha in self._cache:
			return self._cache[sha]
		else:
			val = func(self, sha)
			self._cache[sha] = val
			return val
	return get_or_set_cache


class Git(object):
	def __init__(self, gitdir, first_commit, last_commit):
		self.gitdir = gitdir
		self.tree_path = '.'
		self.commit_range = first_commit + '..' + last_commit if first_commit else last_commit
		self._cache = None
		self._git_dir = None

	def git(self, *args):
		proc = Popen(('git',) + args, cwd=self.gitdir, stdout=PIPE, stderr=PIPE)
		out, errors = proc.communicate()
		errors = errors.decode('utf-8')
		if proc.returncode != 0:
			raise GitError(errors)
		else:
			return out

	@property
	def git_dir(self):
		if self._git_dir is None:
			git_dir = self.git("rev-parse", "--git-dir").rstrip("\n")
			self._git_dir = os.path.abspath(os.path.join(self.gitdir, git_dir))
		return self._git_dir

	@property
	def _cache_file(self):
		return os.path.join(self.git_dir, "gitstats_cache")

	def rx_process(self, rx, value, fn):
		match = re.match(rx, value)
		if match:
			return fn(**match.groupdict())
		else:
			return None

	def run_and_parse(self, rx, cls, args):
		out = self.git(*args).decode('utf-8')
		objects = [self.rx_process(rx, line, cls) for line in out.split('\n') if line]
		return [o for o in objects if o is not None]

	def authors(self):
		rx = r'^.*\t(?P<name>.*) <(?P<email>.*)>$'
		args = ['shortlog', '-se', self.commit_range]
		return self.run_and_parse(rx, AuthorData, args=args)

	def commits(self):
		rx = r'^(?P<sha>[0-9a-f]{40})\|(?P<time>\d+)\|(?P<email>.*)$'
		args = ['rev-list', '--pretty=format:%H|%at|%aE', self.commit_range, self.tree_path]
		commits = self.run_and_parse(rx, CommitData, args=args)
		return [c._replace(time=int(c.time)) for c in commits]

	@sha_cache
	def commit_blobs(self, sha):
		rx = r'^\d{6} blob (?P<sha>[0-9a-f]{40})\t(?P<filename>.*)$'
		args = ['ls-tree', '-r', sha, '--', self.tree_path]
		trees = self.run_and_parse(rx, BlobLstreeData, args=args)
		rx = r'^(?P<added>\d+)\t(?P<removed>\d+)\t(?P<filename>.*)$'
		try:
			args = ['diff', '--numstat', '-w', sha + '^', sha, '--', self.tree_path]
			files = self.run_and_parse(rx, BlobDiffData, args=args)
		except GitError:
			# 4b825dc642cb6eb9a060e54bf8d69288fbee4904 == git hash-object -t tree /dev/null
			args = ['diff', '--numstat', '-w', '4b825dc642cb6eb9a060e54bf8d69288fbee4904', sha, '--', self.tree_path]
			files = self.run_and_parse(rx, BlobDiffData, args=args)

		files = {f.filename: (int(f.added), int(f.removed)) for f in files}
		blobs = [BlobData(t.sha, os.path.splitext(t.filename)[1], *files.get(t.filename, (None, None))) for t in trees]
		return blobs

	@sha_cache
	def file_data(self, sha):
		file_data = self.git('cat-file', 'blob', sha)
		try:
			file_data = file_data.decode("utf-8")
			lines = file_data.count("\n")
			is_binary = False
		except UnicodeDecodeError:
			lines = 0
			is_binary = True
		return FileData(sha, lines, is_binary=is_binary)

	def save_cache(self):
		if self._cache is not None:
			sha_cache_file = open(self._cache_file, "wb")
			sha_cache_file.write(json.dumps(self._cache))
