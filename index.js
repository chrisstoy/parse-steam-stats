#!/usr/bin/env node
'use strict';

const program = require('commander');
const _ = require('lodash');
const fs = require('fs');

const rxName = /"name"\s".*"$/;
const rxEnglish = /"english"\s".*"$/;
const rxArchievement = /ach_.*/;
const rxStat = /stat_.*"/;

program
	.version('0.0.1')
//	.option('-p, --peppers', 'Add peppers')
//	.description('Parse Steam Raw Stats and achievements into C#')
	.parse(process.argv); // end with arse to parse through the input

let filename = program.args[0];
let achievements = [];
let stats = [];

console.log(`File to parse: ${filename}`);

let statsText = fs.readFileSync(filename, 'utf8');
let lines = _.chain(statsText)
	.split('\n')
	.map(_.trim)
	.value();

parseLines(lines);

console.log(achievements);
console.log(stats);


//////////////////////

function parseLines(lines) {

	if (_.size(lines) > 0) {
		let item = parseUntil(rxName, lines);
		if (_.isString(item)) {
			if (item.match(rxArchievement)) {
				// achievement
				let ach = parseAchievment(item, lines);
				achievements.push(ach);
			} else if (item.match(rxStat)) {
				// stat
				let stat = parseStat(item, lines);
				stats.push(stat);
			}
			else {
				console.log(item);
			}
		}
		parseLines(lines);
	}
}


function parseUntil(rxp, lines) {

	if (_.size(lines) > 0) {
		let line = lines.shift();
		if (line.match(rxp)) {
			return _.trim(_.split(line, '\t')[1], '"');
		} else {
			return parseUntil(rxp, lines);
		}
	}
	return null;
}

function parseAchievment(id, lines) {
	let ach = {
		id: id,
	};

	ach.name = parseUntil(rxName, lines);
	ach.display = parseUntil(rxEnglish, lines);

	return ach;	
}

function parseStat(id, lines) {
	let stat = {
		id: id,
	};
	stat.display = parseUntil(rxName, lines);
	return stat;
}

