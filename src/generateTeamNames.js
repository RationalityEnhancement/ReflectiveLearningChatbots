require('dotenv').config();
const mongo = require('mongoose');
const fs = require('fs');
const path = require('node:path');

const ConfigReader = require('../src/configReader');
const config = ConfigReader.getExpConfig();
const DevConfig = ConfigReader.getDevConfig();

(() => {

    let dataPath = path.resolve('./data');
    try{
        if(!fs.existsSync(dataPath)){
            console.log('Creating directory data');
            fs.mkdirSync(dataPath);
        }
    } catch(error) {
        throw "ERROR: Unable to create data directory\n" + error;
    }

    let expPath = path.join(dataPath, config.experimentId);
    try{
        if(!fs.existsSync(expPath)){
            console.log('Creating directory ' + config.experimentId);
            fs.mkdirSync(expPath);
        }
    } catch(error) {
        throw "ERROR: Unable to create data directory for experiment\n" + error;
    }

    let adjectivesFile = path.join(path.resolve('.'), DevConfig.ADJECTIVES_PATH);

    let nounsFile = path.join(path.resolve('.'), DevConfig.NOUNS_PATH);

    let nounList, adjList;

    // Reading from JSON
    try{
        let adjStr = fs.readFileSync(adjectivesFile, 'utf8');
        adjList = JSON.parse(adjStr);

        let nounStr = fs.readFileSync(nounsFile, 'utf8');
        nounList = JSON.parse(nounStr);
    } catch(err) {
        throw "ERROR: Unable to read adjectives and nouns\n" + err;
    }

    // Generating the team names
    let numNames;
    try{
        numNames = process.argv[2];
    } catch(e){
        numNames = DevConfig.DEFAULT_NUM_TEAMS;
    }
    let teamNames = [];

    let usedAdjectives = [];
    let usedNouns = [];
    for(let i = 0; i < numNames; i++){
        if(adjList.length === 0){
            adjList = usedAdjectives.slice();
            usedAdjectives = []
        }
        if(nounList.length === 0){
            nounList = usedNouns.slice();
            usedNouns = []
        }

        let adjectiveIdx = Math.floor(Math.random() * adjList.length);
        let nounIdx = Math.floor(Math.random() * nounList.length);

        let adjective = adjList[adjectiveIdx];
        let noun = nounList[nounIdx];

        let adjectiveUpper = adjective.charAt(0).toUpperCase() + adjective.slice(1)
        let nounUpper = noun.charAt(0).toUpperCase() + noun.slice(1)

        let name = adjectiveUpper + '' + nounUpper;
        if(!teamNames.includes(name)){
            teamNames.push(name);
            usedAdjectives.push(adjective);
            usedNouns.push(noun);
            adjList.splice(adjectiveIdx, 1);
            nounList.splice(nounIdx, 1);
        } else {
            i--;
        }
    }

    teamNames.sort();

    let targetJSONPath = path.join(expPath, DevConfig.TEAM_NAMES_JSON_FILE);
    let targetTXTPath = path.join(expPath, DevConfig.TEAM_NAMES_TXT_FILE);

    // Write to JSON
    try{
        fs.writeFileSync(targetJSONPath, JSON.stringify(teamNames));
        console.log("Team names successfully written to " + targetJSONPath);

        fs.writeFileSync(targetTXTPath, teamNames.join('\n'));
        console.log("Team names successfully written to " + targetTXTPath);

    } catch(err) {
        throw "ERROR: Unable to write team names to JSON file\n" + err;
    }

})();