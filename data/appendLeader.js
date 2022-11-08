const ConfigReader = require('../src/configReader');
const fs = require('fs')

let teamName = process.argv[2]
let teamNameJSONFileName = __dirname + "/" + teamName + "/teamnames.json";
let teamNameTXTFileName = __dirname + "/" + teamName + "/teamnames.txt";
let condMapFileName = __dirname + "/" + teamName + "/condmap.json";

let teamNames = require(teamNameJSONFileName)
let condMap = require(condMapFileName)

let newTeamNames = []
let newCondMap = {}
teamNames.forEach(name => {
    newTeamNames.push(...[name, name + "-Leader"])
    newCondMap[name] = condMap[name] + 3;
    newCondMap[name + "-Leader"] = condMap[name]
})

try{
    fs.writeFileSync(teamNameJSONFileName, JSON.stringify(newTeamNames))
    console.log("\nWrote new team names to JSON file!\n" + teamNameJSONFileName)
} catch(e){
    console.log("\nCould not write team names to JSON file!")
    console.log(e)
}

try{
    fs.writeFileSync(teamNameTXTFileName, newTeamNames.join("\n"))
    console.log("\nWrote new team names to TXT file!\n" + teamNameTXTFileName)
} catch(e){
    console.log("\nCould not write team names to TXT file!")
    console.log(e)
}

try{
    fs.writeFileSync(condMapFileName, JSON.stringify(newCondMap))
    console.log("\nWrote new cond map to JSON file!\n" + condMapFileName)
} catch(e){
    console.log("\nCould not write cond map to JSON file!")
    console.log(e)
}
