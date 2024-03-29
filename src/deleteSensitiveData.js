require('dotenv').config();
const readline = require('readline');
const mongo = require('mongoose');
const idMaps = require('./apiControllers/idMapApiController');
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
    await idMaps.removeAllForExperiment(config.experimentId);
    console.log("\nDeletion Complete\n")
    await mongo.connection.close();
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n')
console.log('\x1b[41m\x1b[37m%s\x1b[0m', 'WARNING!');
console.log('This script deletes the sensitive identifying information of participants\' Telegram accounts. This ' +
    'data is essential to the continued functioning of the experiment - ' + config.experimentId)
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