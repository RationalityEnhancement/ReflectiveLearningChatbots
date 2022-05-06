require('dotenv').config();
const readline = require('readline');
const mongo = require('mongoose');
const fs = require('fs');
const path = require('node:path');
const idMaps = require('./apiControllers/idMapApiController');
const config = require('../json/config.json');

const DISCLAIMER_STRING = "I understand and I wish to continue";

//----------------------
//--- database setup ---
//----------------------

(async () => {

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\x1b[41m\x1b[30m%s\x1b[0m', 'WARNING!');
    console.log('Run this script only when your experiment is no longer running!')
    console.log('If you delete this information, the chatbot will have to be restarted on every device that it is ' +
        'currently running on.')
    console.log('In order to continue with this step, type out \"' + DISCLAIMER_STRING + '\" (without quotes)' +
        ' and press enter. If you type anything else, deletion will be aborted.')

    rl.question("Type in the statement below, exactly as presented: ", (typed) => {
        if(typed === DISCLAIMER_STRING){
            console.log("Deletion in progress");
        } else {
            console.log("Deletion aborted.")
        }
    })

    rl.on('close', function () {
        console.log('\nBYE BYE !!!');
        process.exit(0);
    });
    //
    // await mongo.connect(process.env.DB_CONNECTION_STRING, {useNewUrlParser: true, useUnifiedTopology: true}, err => {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         console.log('\x1b[42m\x1b[30m%s\x1b[0m', `Connected to the database`);
    //     }
    // });



    // await mongo.connection.close();

})();