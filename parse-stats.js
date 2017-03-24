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

		let code = `
using System.Collections;

namespace BS {
	public class StatsAndAchievementsDefinitions {

		protected class Achievement_t {
			public Achievement m_eAchievementID;
			public string m_strName;
			public string m_strDescription;
			public bool m_bAchieved;

			/// <summary>
			/// Creates an Achievement. You must also mirror the data provided here in https://partner.steamgames.com/apps/achievements/yourappid
			/// </summary>
			/// <param name="achievement">The "API Name Progress Stat" used to uniquely identify the achievement.</param>
			/// <param name="name">The "Display Name" that will be shown to players in game and on the Steam Community.</param>
			/// <param name="desc">The "Description" that will be shown to players in game and on the Steam Community.</param>
			public Achievement_t(Achievement achievementID, string name, string desc) {
				m_eAchievementID = achievementID;
				m_strName = name;
				m_strDescription = desc;
				m_bAchieved = false;
			}
		}
		${this.generateAchievementsEnum(data)}
		${this.generateAchievementsDefinitions(data)}
		${this.generateStatsEnum(data)}
	}
}
`;
		return code;
	}

	generateAchievementsEnum(data) {

		let enumDef = `
		protected enum Achievement: int {`;
		_.forEach(data.achievements, function (ach) {
			enumDef += `
			${ach.id},`;
		});
		enumDef += `
		};
`;
		return enumDef;
	}

	generateAchievementsDefinitions(data) {
	
		let def = `
		protected Achievement_t[] m_Achievements = new Achievement_t[] {`;
		_.forEach(data.achievements, function (ach) {
			def += `
			new Achievement_t(Achievement.${ach.id}, "${ach.name}", "${ach.display}"),`;
		});
		def += `
		};
`;
		return def;
	}
	
	generateStatsEnum(data) {
		let enumDef = `
		protected enum Stat: int {`;
		_.forEach(data.stats, function (stat) {
			enumDef += `
			${stat.id},`;
		});
		enumDef += `
		};
`;
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
	outputText = generator.stringify(data, null, 4);

	// output the parsed data	
	console.log(outputText);
}
