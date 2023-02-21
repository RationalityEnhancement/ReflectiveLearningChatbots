/**
 *
 * This is a script to send custom messages at any point in time to any of the participants
 *
 * The custom messages for the given experiment are defined in the JSON file json/essentials/customMessages.json
 * This JSON file is a list of JSON objects. Each JSON object must contain the following two properties:
 *
 * text - list of strings with the text of the message(s) to be sent. Each string is sent in a separate message
 * uniqueIds - list of string uniqueIDs to which the above exact message(s) should be sent
 *
 * It is possible to have many different JSON objects in the main list to send different messages to different
 * participants
 *
 *
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);
const Communicator = require('./communicator')
const idMaps = require('./apiControllers/idMapApiController');
const participants = require('./apiControllers/participantApiController');
const ConfigReader = require('./configReader');
const experiments = require("./apiControllers/experimentApiController");
const mongo = require('mongoose');
const config = ConfigReader.getExpConfig();
const DevConfig = ConfigReader.getDevConfig()
const customMessages = ConfigReader.getCustomMessages();
const ReturnMethods = require('./returnMethods');


// Fetch the participant with error handling
let getParticipant = async (uniqueId) => {
    let participant;
    try{
        participant = await participants.get(uniqueId);
        return participant;
    } catch(err){
        console.log('Failed to get participant info from DB');
        console.error(err);
    }
}

// Get the secret ID map using the unique ID
let getByUniqueId = async (experimentId, uniqueId) => {
    try{
        let foundMap = await idMaps.getByUniqueId(experimentId, uniqueId);
        return foundMap;
    } catch(err){
        console.log("Failed to get secret mapping")
        console.error(err);
    }

}

/**
 *
 * Validate custom messages JSON to ensure it has the correct format
 *
 * @param messages
 * @returns {{returnCode: number, data: *}}
 */
let validateCustomMessages = (messages) => {
    if(!Array.isArray(messages)){
        return ReturnMethods.returnFailure("Custom messages file must be JSON list at top level")
    }
    for(let i = 0; i < messages.length; i++){
        try{
            if(!Array.isArray(messages[i].text)){
                return ReturnMethods.returnFailure("Text property of message must be a list")
            }
            if(!Array.isArray(messages[i].uniqueIds)){
                return ReturnMethods.returnFailure("UniqueIds property of message must be a list")
            }
        } catch(e){
            return ReturnMethods.returnFailure("Each custom message has to be an object with a list of _text_ messages and a list of _uniqueIds_")
        }
    }
    return ReturnMethods.returnSuccess(messages);
}

//----------------------
//--- database setup ---
//----------------------

mongo.connect(process.env.DB_CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true }, err => {
    if (err) {
        console.log(err);
    } else {
        console.log('\x1b[42m\x1b[30m%s\x1b[0m', `Connected to the database`);
    }
});

/**
 *
 * Loop through all the objects in customMessages.json and send each of the messages to each of the participants
 * in the list for that message
 *
 * @returns {Promise<void>}
 */
let sendCustomMessage = async () => {
    let validateMessages = validateCustomMessages(customMessages)
    if(validateMessages.returnCode === DevConfig.FAILURE_CODE){
        console.error(validateMessages.data)
        return
    }
    for(let i = 0; i < customMessages.length; i++){
        let currentMessage = customMessages[i];
        let text = currentMessage.text;
        let uniqueIds = currentMessage.uniqueIds;
        for(let j = 0; j < uniqueIds.length; j++){
            let participant, secretMap;
            try {
                participant = await getParticipant(""+uniqueIds[j]);
                secretMap = await getByUniqueId(config.experimentId, ""+uniqueIds[j]);
                if (!secretMap) {
                    throw { "message": "Unable to get participant unique id" } ;
                }
            } catch(e){
                console.log("Unable to get participant or chatId for "
                    + uniqueIds[j] + "\n" + e.message + "\n" + e.stack);
                continue
            }

            await Communicator.sendReplies(bot, participant, secretMap.chatId, text, !config.debug.messageDelay)
            console.log("Sent message to " + uniqueIds[j]);
        }
    }
}

sendCustomMessage().then((res, err) => {
    return new Promise(res => {
        setTimeout(res, 5000)
    });
}).then(res => {
    mongo.connection.close()
})

