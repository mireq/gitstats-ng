# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import argparse
import gitstats


def main():
	parser = argparse.ArgumentParser(description='Generate statistics for repositories')
	parser.add_argument('repositories', metavar='repo', nargs='+', help='Path to repositories from which statistics should be generated (format directory[:first_commit_sha[:last_commit_sha]]).')
	parser.add_argument('-o', '--out_path', nargs=1, default='git_stats', help='Output path where statistics should be written.')
	args = parser.parse_args()

	repositories = []
	for repo in args.repositories:
		repo_split = repo.split(":")

		path = repo_split.pop(0)
		first_commit = repo_split.pop(0) if repo_split else ""
		last_commit = repo_split.pop(0) if repo_split else "HEAD"

		if repo_split:
			parser.error("Bad format for repository: %s" % repo)

		repository = gitstats.Repository(path=path, first_commit=first_commit, last_commit=last_commit)

		if not repository.check_gitdir():
			parser.error("Is not a git repository: %s" % path)

		repositories.append(repository)

	generator = gitstats.Generator(repositories=repositories, out_path=args.out_path[0])
	generator.generate()


if __name__ == '__main__':
	main()
