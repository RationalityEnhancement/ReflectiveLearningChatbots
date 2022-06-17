import json
import sys

fname = "./" + sys.argv[1]

with open(fname) as f:
	lines = f.readlines()
	words = [l.strip() for l in lines]

with open(fname, 'w') as f:
	json.dump(words, f)
