require('dotenv').config();
const mongo = require('mongoose');
const fs = require('fs');
const path = require('node:path');
const participants = require('./apiControllers/participantApiController');
const experiments = require('./apiControllers/experimentApiController');
const config = require('../json/config.json');

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

    // Reading experiment and participants

    let experiment = await experiments.get(config.experimentId);
    if (!experiment) {
        throw "ERROR: Experiment for ExperimentID " + config.experimentId + " not found!";
    }

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
    let dataObj = {experiment: experiment, participants: pList};
    let jsonFilePath = path.join(experimentPath, 'data.json');
    try{
        fs.writeFileSync(jsonFilePath, JSON.stringify(dataObj));
        console.log("Written to JSON!")
    } catch(err) {
        throw "ERROR: Unable to write to JSON file\n" + error;
    }

    await mongo.connection.close();

})();