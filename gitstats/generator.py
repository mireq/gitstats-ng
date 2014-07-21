# -*- coding: utf-8 -*-
from __future__ import unicode_literals


class Generator(object):
	def __init__(self, repositories, out_path):
		self.repositories = repositories
		self.out_path = out_path

	def generate(self):
		for repo in self.repositories:
			repo.collect_data()
