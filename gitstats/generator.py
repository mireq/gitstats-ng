# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import shutil
import os
import json


class Generator(object):
	def __init__(self, repositories, out_path):
		self.repositories = repositories
		self.out_path = out_path

	@property
	def template_dir(self):
		return os.path.join(os.path.dirname(__file__), "template")

	def generate(self):
		try:
			shutil.copytree(self.template_dir, self.out_path)
		except OSError:
			if not os.path.exists(self.out_path):
				raise

		with open(os.path.join(self.out_path, "data.js"), "w") as f:
			f.write("data=[");
			for i, repo in enumerate(self.repositories):
				if i != 0:
					f.write(",")
				data = repo.collect_data()
				f.write(json.dumps(data))
			f.write("]")
