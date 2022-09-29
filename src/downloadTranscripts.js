require('dotenv').config();
const mongo = require('mongoose');
const fs = require('fs');
const path = require('node:path');
const participants = require('./apiControllers/participantApiController');
const transcripts = require('./apiControllers/transcriptApiController');

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
    console.log("Downloading transcripts for experiment with id: " + config.experimentId);

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

    let transcriptsPath = path.join(experimentPath, "transcripts");
    try{
        if(!fs.existsSync(transcriptsPath)){
            console.log('Creating directory transcripts ' + config.experimentId);
            fs.mkdirSync(transcriptsPath);
        }
    } catch(error) {
        throw "ERROR: Unable to create transcripts directory\n" + error;
    }

    // Add the answers and ggf. debugInfo to the participant JSON objects
    let partTranscripts = []
    for(let i = 0; i < pList.length; i++){
        let pTranscriptObj = await transcripts.getSingleList(pList[i].uniqueId);
        let addObj = {}
        addObj[pList[i].uniqueId] = pTranscriptObj
        partTranscripts.push(addObj);
    }

    // Write to JSON
    let dataObj = {participants: partTranscripts};
    let jsonFilePath = path.join(experimentPath, 'data_transcripts.json');
    try{
        fs.writeFileSync(jsonFilePath, JSON.stringify(dataObj));
        console.log("Written to JSON!\n" + jsonFilePath)
    } catch(err) {
        throw "ERROR: Unable to write to JSON file\n" + err;
    }

    // Write each transcript to txt file:
    for(let i = 0; i < pList.length; i++){
        let partPath = path.join(transcriptsPath, pList[i].uniqueId + '.txt');
        console.log("\nWriting transcript to txt: " + pList[i].uniqueId);
        fs.writeFileSync(partPath, '')
        let pTranscriptObj = await transcripts.getSingleList(pList[i].uniqueId);
        for(let j = 0; j < pTranscriptObj.length; j++){
            let currentMessage = pTranscriptObj[j];
            let newData = currentMessage.timeStamp + " " + currentMessage.from + ": " + currentMessage.message + "\n";
            fs.appendFileSync(partPath, newData)
        }
        console.log(partPath);
    }


    await mongo.connection.close();

})().catch((err) => {
    mongo.connection.close().then( (res) =>{
        console.log(err);
    });

});