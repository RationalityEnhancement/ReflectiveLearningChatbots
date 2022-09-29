require('dotenv').config();
const readline = require('readline');
const mongo = require('mongoose');
const idMaps = require('./apiControllers/idMapApiController');
const experiments = require('./apiControllers/experimentApiController');
const participants = require('./apiControllers/participantApiController');
const answers = require('./apiControllers/answerApiController');
const transcripts = require('./apiControllers/transcriptApiController');
const debugs = require('./apiControllers/debugInfoApiController');
const ConfigReader = require('../src/configReader');
const config = ConfigReader.getExpConfig();

const DISCLAIMER_STRING = "I understand and I wish to continue";

//----------------------
//--- database setup ---
//----------------------

let deleteSensitiveData = async () => {

    await mongo.connect(process.env.DB_CONNECTION_STRING, {useNewUrlParser: true, useUnifiedTopology: true}, err => {
        if (err) {
            console.log(err);
        } else {
            console.log('\x1b[42m\x1b[30m%s\x1b[0m', `Connected to the database`);
        }
    });
    console.log("\nDeleting Sensitive Data for Experiment with ID: " + config.experimentId);
    await idMaps.remove(config.experimentId);
    console.log("\nDeleting Participant Data for Experiment with ID: " + config.experimentId);
    await participants.removeAllForExperiment(config.experimentId);
    console.log("\nDeleting Answer Data for Experiment with ID: " + config.experimentId);
    await answers.removeAllForExperiment(config.experimentId);
    console.log("\nDeleting Transcript Data for Experiment with ID: " + config.experimentId);
    await transcripts.removeAllForExperiment(config.experimentId);
    console.log("\nDeleting Debug Data for Experiment with ID: " + config.experimentId);
    await debugs.removeAllForExperiment(config.experimentId);
    console.log("\nDeleting Experiment Data for Experiment with ID: " + config.experimentId);
    await experiments.remove(config.experimentId);
    console.log("\nDeletion Complete\n")
    await mongo.connection.close();
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n')
console.log('\x1b[41m\x1b[37m%s\x1b[0m', 'WARNING!');
console.log('This script deletes ALL the collected data for your experiment entitled - ' + config.experimentId);
console.log('Run this script only when your experiment is no longer running!')
console.log('If you delete this information, the chatbot will have to be restarted on every device that it is ' +
    'currently running on. Deletion cannot be undone!')
console.log('In order to continue with this step, type out the following highlighted statement' +
    ' and press enter. If you type anything else, deletion will be aborted.\n')
console.log('\x1b[43m\x1b[30m%s\x1b[0m', DISCLAIMER_STRING)

rl.question("\nType in the statement below, exactly as presented: \n", (typed) => {
    typed = typed.trim();
    if(typed === DISCLAIMER_STRING){
        console.log("\nDeletion beginning");
        deleteSensitiveData();
    } else {
        console.log("Deletion aborted.\n")
    }
    rl.close();
})