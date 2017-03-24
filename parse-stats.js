#!/usr/bin/env node
'use strict';

const program = require('commander');
const _ = require('lodash');
const fs = require('fs');

const rxName = /"name"\s".*"$/;
const rxEnglish = /"english"\s".*"$/;
const rxArchievement = /ach_.*/;
const rxStat = /stat_.*/;

//////////////////////
class Parser {

	constructor() {
		this.data = {
			achievements: [],
			stats: [],
		};
	}

	// initiate parsing	
	parse(text) {
		let lines = _.chain(text)
			.split('\n')
			.map(_.trim)
			.value();
		this.parseLines(lines);
		return this.data;
	}

	// Recursively parse lines	
	parseLines(lines) {

		if (_.size(lines) > 0) {
			let item = this.parseUntil(rxName, lines);
			if (_.isString(item)) {
				if (item.match(rxArchievement)) {
					// achievement
					let ach = this.parseAchievment(item, lines);
					this.data.achievements.push(ach);
				} else if (item.match(rxStat)) {
					// stat
					let stat = this.parseStat(item, lines);
					this.data.stats.push(stat);
				}
				else {
					console.log(item);
				}
			}
			this.parseLines(lines);
		}
	}

	// Parse lines until the regex succeeds or we reach end of lines
	parseUntil(rxp, lines) {

		if (_.size(lines) > 0) {
			let line = lines.shift();
			if (line.match(rxp)) {
				return _.trim(_.split(line, '\t')[1], '"');
			} else {
				return this.parseUntil(rxp, lines);
			}
		}
		return null;
	}

	// Parse lines belonging to an Achievement	
	parseAchievment(id, lines) {
		let ach = {
			id: id,
		};

		ach.name = this.parseUntil(rxEnglish, lines);
		ach.display = this.parseUntil(rxEnglish, lines);

		return ach;
	}

	// Parse lines belonging to a Stat	
	parseStat(id, lines) {
		let stat = {
			id: id,
		};
		stat.display = this.parseUntil(rxName, lines);
		return stat;
	}
}

// Generate C# to represent the achievements and stats
class CSharpGenerator {

	constructor() {
	}

	stringify(data) {

		let achievmentDefs = this.generateAchievements(data);
		let statDefs = this.generateStats(data);
		let code = `
using System.Collections;

namespace BS {
	public class StatsAndAchievementsDefinitions {
			${achievmentDefs}
			${statDefs}
	}
}
		`;
		return code;
	}

	generateAchievements(data) {

		let enumDef = `\n\tprivate enum Achievement: int {\n`;
		_.forEach(data.achievements, function (ach) {
			enumDef += `\t\t${ach.id},\n`;
		});
		enumDef += '\t};\n\n';

		return enumDef;
	}

	generateStats(data) {
		let enumDef = `\n\tprivate enum Stats: int {\n`;
		_.forEach(data.stats, function (stat) {
			enumDef += `\t\t${stat.id},\n`;
		});
		enumDef += '\t};\n\n';
		return enumDef;
	}

}

////////////////////////////
// Handle command parsing
program
	.version('0.0.1')
	.usage('[options] <input file>')
	.option('-c, --csharp', 'Write output as C#')
	.description(`Parse Steam Raw Stats and achievements into JSON or C#`)
	.parse(process.argv); // end with arse to parse through the input

let inputFile = program.args[0];
if (!_.isString(inputFile)) {
	// invalid args
	program.help();
}
else {

	let statsText = fs.readFileSync(inputFile, 'utf8');

	let parser = new Parser();
	let data = parser.parse(statsText);

	// generate the output	
	let outputText;
	let generator = (program.csharp ? new CSharpGenerator : JSON);
	outputText = generator.stringify(data);

	// output the parsed data	
	console.log(outputText);
}
