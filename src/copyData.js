require('dotenv').config();
const mongo = require('mongoose');
const fs = require('fs');
const path = require('node:path');
const participants = require('./apiControllers/participantApiController');
const {Participant} = require('./models/Participant')
const {Answers} = require('./models/Answers')
const {DebugInfo} = require('./models/DebugInfo')
const experiments = require('./apiControllers/experimentApiController');
const debugs = require('./apiControllers/debugInfoApiController')
const idMaps = require('./apiControllers/idMapApiController')
const {IDMap} = require('./models/IDMap')

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
    console.log("Editing data for experiment with id: " + config.experimentId);

    let IDMaps = await idMaps.getExperiment(config.experimentId);
    let pList = await participants.getByExperimentId(config.experimentId);

    for(let i = 0; i < pList.length; i++){
        let uniqueId = pList[i].uniqueId;
        let scheduledOperations = pList[i].scheduledOperations;
        let scheduledQuestions = scheduledOperations["questions"];
        for(let i = 0; i < scheduledQuestions.length; i++){
            let curQ = scheduledQuestions[i];
            console.log(curQ.jobId)
            // curQ.jobId = (curQ.jobId.substring(0,9) + "q_" + curQ.jobId.substring(9))
        }
        let scheduledActions = scheduledOperations["actions"];
        for(let i = 0; i < scheduledActions.length; i++){
            let curQ = scheduledActions[i];
            console.log(curQ.jobId)
            // curQ.jobId = (curQ.jobId.substring(0,9) + "a_" + curQ.jobId.substring(9))
        }

    }
    await mongo.connection.close();

})().catch((err) => {
    mongo.connection.close().then( (res) =>{
        console.log(err);
    });

});