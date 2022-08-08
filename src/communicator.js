const ConfigReader = require('../src/configReader');
const config = ConfigReader.getExpConfig();
const DevConfig = ConfigReader.getDevConfig();
const InputOptions = require('./inputOptions');
const ConfigParser = require('./configParser');
const ExperimentUtils = require('./experimentUtils');
const emoji = require('node-emoji');

const msPerCharacter = config.msPerCharDelay || DevConfig.MS_PER_CHARACTER_DELAY;
/**
 * This class deals with all of the direct communication with
 * the user. Mainly sends questions and messages.
 *
 */

/**
 *  Substitute variables for a given string with error handling
 *  if error occurs, return original string without replacing any variables
 *
 * @param participant
 * @param text
 * @param sensitiveDataAlso
 * @returns {*}
 */
let substituteVariables = (participant, text, sensitiveDataAlso) => {
    let newText = text;
    let varReplaceObj = ConfigParser.replaceVariablesInString(participant, text, sensitiveDataAlso);
    if(varReplaceObj.returnCode === DevConfig.SUCCESS_CODE) newText = varReplaceObj.data;
    newText = emoji.emojify(newText);
    return newText;
}

/**
 * Sends a question to the bot user based on the type of question
 * and the text as specified in the question object (see questionHandler.js)
 *
 * Also sends prompt messages as required for the question type, after a delay
 *
 * @param bot current telegram bot instance
 * @param participant object of current participant
 * @param chatId telegram chatId of user to send message to
 * @param question question object
 * @param noDelay
 * @returns {Promise<void>}
 */
module.exports.sendQuestion = async (bot, participant, chatId, question, noDelay = false) => {

    let language = participant.parameters.language;
    let delayMs = 500;

    if(!("firstName" in participant) || !participant["firstName"]){
        let userInfo = await bot.telegram.getChat(chatId);
        participant["firstName"] = userInfo.first_name;
    }

    question.text = substituteVariables(participant, question.text, false);

    // Attempt to send an image
    if(question.image && question.image.sourceType){
        let imageValidationObj = await ExperimentUtils.validateImageSource(question.image);
        if(imageValidationObj.returnCode === DevConfig.FAILURE_CODE){
            console.log(imageValidationObj.data);
        } else {
            let imageSendObj = {}
            switch(question.image.sourceType){
                case "local":
                    imageSendObj["source"] = question.image.source;
                    break;
                case "url":
                    imageSendObj["url"] = question.image.source;
                    break;
                default:
                    console.log("Communicator: Could not process image source type!")
            }
            await bot.telegram.sendPhoto(chatId, imageSendObj)
        }
    }

    let qLength = question.text.length;
    let qDelayMs = qLength * msPerCharacter;

    // Simulate typing by adding delay and sending chat action
    if(!noDelay){

        bot.telegram.sendChatAction(chatId, "typing").catch((reason) => {
            console.log("Unable to send chat action for chatId " + chatId+ ": \n" + reason)
        });

        await new Promise(res => {
            setTimeout(res, qDelayMs)
        });
    }

    let inputPrompt;

    // Default keyboard
    let keyboard = InputOptions.removeKeyboard().reply_markup;

    // Overwrite input prompt
    if(!!question.inputPrompt){
        inputPrompt = question.inputPrompt;
    }
    switch(question.qType){
        case 'singleChoice':

            try{
                await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                    parse_mode: "HTML",
                    reply_markup: InputOptions.removeKeyboard().reply_markup
                });
            } catch(e) {
                console.log("Error sending message: \n" + e.message + "\n" + e.stack);
                return;
            }


            // Use default input prompt if no overwrite
            if(!inputPrompt) inputPrompt = config.phrases.keyboards.singleChoice[language];
            keyboard = InputOptions.singleChoice(question.options, question.buttonLayoutCols).reply_markup;
            break;

        case 'multiChoice':
            try{
                await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                    parse_mode: "HTML",
                    reply_markup: InputOptions.removeKeyboard().reply_markup
                });
            } catch(e) {
                console.log("Error sending message: \n" + e.message + "\n" + e.stack);
                return;
            }

            if(!inputPrompt) inputPrompt = config.phrases.keyboards.multiChoice[language];
            keyboard = InputOptions.multiChoice(question.options, participant.parameters.language, question.buttonLayoutCols).reply_markup;

            break;
        case 'number':
            try{
                await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                    parse_mode: "HTML",
                    reply_markup: InputOptions.removeKeyboard().reply_markup
                });
            } catch(e) {
                console.log("Error sending message: \n" + e.message + "\n" + e.stack);
                return;
            }


            break;
        case 'freeform':
            try{
                await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                    parse_mode: "HTML",
                    reply_markup: InputOptions.removeKeyboard().reply_markup
                });
            } catch(e) {
                console.log("Error sending message: \n" + e.message + "\n" + e.stack);
                return;
            }

            if(!inputPrompt) inputPrompt = config.phrases.keyboards.freeformSinglePrompt[language];
            break;
        case 'freeformMulti':
            try{
                await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                    parse_mode: "HTML",
                    reply_markup: InputOptions.removeKeyboard().reply_markup
                });
            } catch(e) {
                console.log("Error sending message: \n" + e.message + "\n" + e.stack);
                return;
            }


            if(!inputPrompt) inputPrompt = config.phrases.keyboards.freeformMultiPrompt[language];

            break;
        case 'qualtrics' :
            let link = question.qualtricsLink;

            try{
                // Send the question text
                await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                    parse_mode: "HTML",
                    reply_markup: InputOptions.removeKeyboard().reply_markup
                });
            } catch(e) {
                console.log("Error sending message: \n" + e.message + "\n" + e.stack);
                return;
            }


            // Send the prompt to fill the link
            await new Promise(res => {
                setTimeout(res, delayMs * 2)
            });
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, config.phrases.keyboards.qualtricsFillPrompt[language], true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });

            // Send the link
            let linkRef = "\<a href='" + substituteVariables(participant, link, true) + "'\> " +
                config.phrases.keyboards.linkToSurvey[language] + " </a>";
            await new Promise(res => {
                setTimeout(res, delayMs * 2)
            });
            await bot.telegram.sendMessage(chatId, linkRef, {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });

            // Send the instruction on how to continue
            // Send default message of "Done" if not overwritten
            if(!inputPrompt) inputPrompt = config.phrases.keyboards.qualtricsDonePrompt[language];

            break;

        default:
            throw "Communicator: Question type not recognized: " + question.qId
    }

    // Send the input prompt if it exists (i.e., for any type except number)
    if(inputPrompt){
        await new Promise(res => {
            setTimeout(res, delayMs)
        });

        try{
            // Send the question text
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, inputPrompt, true), {
                parse_mode: "HTML",
                reply_markup: keyboard
            });
        } catch(e) {
            console.log("Error sending message: \n" + e.message + "\n" + e.stack);
            return;
        }
    }
}

/**
 * Sends list of replies from question.replyMessages, with delay in between
 * each message
 *
 * @param bot current telegram bot instance
 * @param participant
 * @param chatId chatId of user to send message to
 * @param replyMessages array of reply messages
 * @param noDelay
 * @returns {Promise<*>}
 */
module.exports.sendReplies = async (bot, participant, chatId, replyMessages, noDelay = false) => {

    if(!("firstName" in participant) || !participant["firstName"]){
        let userInfo = await bot.telegram.getChat(chatId);
        participant["firstName"] = userInfo.first_name;
    }

    // Send each reply message
    for(let i = 0; i < replyMessages.length; i++){
        const reply = replyMessages[i];

        // Simulate typing by adding delay and sending chat action
        if(!noDelay){

            bot.telegram.sendChatAction(chatId, "typing").catch((reason) => {
                console.log("Unable to send chat action for chatId " + chatId+ ": \n" + reason)
            });
            let delayMs = reply.length * msPerCharacter;
            await new Promise(res => {
                setTimeout(res, delayMs)
            });
        }

        // Send the message
        try{
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, reply, true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
        } catch(e) {
            console.log("Error sending message: \n" + e.message + "\n" + e.stack);
            return;
        }

    }

    await new Promise(res => {
        setTimeout(res, 300)
    });
}

/**
 * Sends simple message
 *
 * @param bot current telegram bot instance
 * @param participant
 * @param chatId chatId of user to send message to
 * @param message message to be sent
 * @param noDelay
 * @param noVarSub
 * @returns {Promise<*>}
 */
module.exports.sendMessage = async (bot, participant, chatId, message, noDelay = false, noVarSub = false) => {

    if(!("firstName" in participant) || !participant["firstName"]){
        let userInfo = await bot.telegram.getChat(chatId);
        participant["firstName"] = userInfo.first_name;
    }

    let delayMs = message.length * msPerCharacter;

    // Simulate typing by adding delay and sending chat action
    if(!noDelay){

        bot.telegram.sendChatAction(chatId, "typing").catch((reason) => {
            console.log("Unable to send chat action for chatId " + chatId+ ": \n" + reason)
        });

        await new Promise(res => {
            setTimeout(res, delayMs)
        });
    }
    let finalMessage = noVarSub ? message : substituteVariables(participant, message, true)
    try{
        await bot.telegram.sendMessage(chatId, finalMessage, {
            parse_mode: "HTML",
            reply_markup: InputOptions.removeKeyboard().reply_markup
        });
    } catch(e) {
        console.log("Error sending message: \n" + e.message + "\n" + e.stack);
        return;
    }

}
