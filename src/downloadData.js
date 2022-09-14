require('dotenv').config();
const mongo = require('mongoose');
const fs = require('fs');
const path = require('node:path');
const participants = require('./apiControllers/participantApiController');
const answers = require('./apiControllers/answerApiController');
const debugs = require('./apiControllers/debugInfoApiController');
const experiments = require('./apiControllers/experimentApiController');

const ConfigReader = require('../src/configReader');
const config = ConfigReader.getExpConfig();

//----------------------
//--- database setup ---
//----------------------

(async () => {

    await mongo.connect(process.env.DB_CONNECTION_STRING, {useNewUrlParser: true, useUnifiedTopology: true}, err => {
        if (err) {
            console.log(err);
        } else {
            console.log('\x1b[42m\x1b[30m%s\x1b[0m', `Connected to the database`);
        }
    });
    console.log("Downloading data for experiment with id: " + config.experimentId);

    // Reading experiment and participants
    let experiment = await experiments.get(config.experimentId);
    if (!experiment) {
        throw "ERROR: Experiment for ExperimentID " + config.experimentId + " not found!";
    }

    let debug = (process.argv[2] === "include-debug");
    console.log(process.argv)
    console.log(process.argv[2])
    console.log(debug);

    let pList = await participants.getByExperimentId(config.experimentId)
    let currentPath = path.resolve('.');
    let resultsPath = path.join(currentPath, 'results');
    try{
        if(!fs.existsSync(resultsPath)){
            console.log('Creating directory results');
            fs.mkdirSync(resultsPath);
        }
    } catch(error) {
        throw "ERROR: Unable to create results directory\n" + error;
    }

    let experimentPath = path.join(resultsPath, config.experimentId);
    try{
        if(!fs.existsSync(experimentPath)){
            console.log('Creating directory' + config.experimentId);
            fs.mkdirSync(experimentPath);
        }
    } catch(error) {
        throw "ERROR: Unable to create experiment directory\n" + error;
    }

    // Add the answers and ggf. debugInfo to the participant JSON objects
    for(let i = 0; i < pList.length; i++){
        let pAnswerObj = await answers.get(pList[i].uniqueId);
        pList[i].answers = pAnswerObj.answers;
        if(debug){
            let pDebugObj = await debugs.get(pList[i].uniqueId);
            pList[i].debugInfo = pDebugObj.debugInfo;
        }
    }

    // Write to JSON
    let dataObj = {experiment: experiment, participants: pList};
    let jsonFilePath = path.join(experimentPath, 'data.json');
    try{
        fs.writeFileSync(jsonFilePath, JSON.stringify(dataObj));
        console.log("Written to JSON!\n" + jsonFilePath)
    } catch(err) {
        throw "ERROR: Unable to write to JSON file\n" + err;
    }

    // Write to CSV
    let experimentCSVPath = path.join(experimentPath, 'experiment_data.csv');
    let participantCSVPath = path.join(experimentPath, 'participant_data.csv');
    try{
        let experimentHeaders = ["experimentId", "experimentName", "experimentConditions", "conditionRatios", "currentlyAssigned"];
        let experimentList = [];
        experimentList.push(experiment.experimentId);
        experimentList.push(experiment.experimentName);
        experimentList.push(experiment.experimentConditions.join('-'));
        experimentList.push(experiment.conditionAssignments.join('-'));
        experimentList.push(experiment.currentlyAssignedToCondition.join(''));
        let CSVString = experimentHeaders.join(',') + '\n' + experimentList.join(',');
        fs.writeFileSync(experimentCSVPath, CSVString);
        console.log("\nWritten experiment to CSV!\n" + experimentCSVPath)
    } catch(err) {
        throw "ERROR: Unable to write experiment to CSV file\n" + err;
    }
    try{
        let participantHeaders = ["uniqueId", "experimentId", "conditionName", "currentState"];
        // for(const [key, value] of Object.entries(pList[0].parameters)){
        //     participantHeaders.push("parameters/"+key);
        // }
        participantHeaders.push("parameters");
        participantHeaders.push("stages");
        participantHeaders.push("scheduledQuestions");
        participantHeaders.push("answers");
        let CSVString = participantHeaders.join(',');
        for(let i = 0; i < pList.length; i++){
            let curPart = pList[i];
            let participantValues = [curPart.uniqueId, curPart.experimentId, curPart.conditionName, curPart.currentState];
            // for(const [key, value] of Object.entries(participant.parameters)){
            //     if(Array.isArray(value)){
            //         participantValues.push(value.join('|'))
            //     } else {
            //         participantValues.push(value);
            //     }
            // }
            participantValues.push(JSON.stringify(curPart.parameters).replace(/,/g,"|"));
            participantValues.push(JSON.stringify(curPart.stages).replace(/,/g,"|"));
            participantValues.push(JSON.stringify(curPart.scheduledOperations["questions"]).replace(/,/g,'|'))
            participantValues.push(JSON.stringify(curPart.answers).replace(/,/g,'|'))
            CSVString += '\n' + participantValues.join(',')
            fs.writeFileSync(participantCSVPath, CSVString);
            console.log("\nWritten participants to CSV!\n" + participantCSVPath)
        }
    } catch(error){
        throw "ERROR: Unable to write participants to CSV file\n" + error;
    }

    await mongo.connection.close();

})().catch((err) => {
    mongo.connection.close().then( (res) =>{
        console.log(err);
    });

});