const participants = require("./apiControllers/participantApiController");
const ConfigReader = require('../src/configReader');
const config = ConfigReader.getExpConfig();
const DevConfig = ConfigReader.getDevConfig();
const ReturnMethods = require('./returnMethods');
const QuestionHandler = require('./questionHandler');
const ConfigParser = require('./configParser')
const Communicator = require('./communicator')
const {getByUniqueId} = require("./apiControllers/idMapApiController");
const ActionHandler = require("./actionHandler")
const AnswerHandler = require("./answerHandler");
const ReminderHandler = require("./reminderHandler");

/**
 * Logic handler deals with the logic of what is to occur at each step
 * of the interaction with the user
 *
 */


/**
 *
 * After a question has been successfully answered by the user,
 * this function is called to process everything that is supposed
 * to happen afterward (reply messages, actions, next questions)
 *
 * @param bot Telegram bot instance
 * @param uniqueId uniqueId of the user for which the next steps are to be processes
 * @returns {Promise<{returnCode: *, data: *}>}
 *
 */
let processNextSteps = async(bot, uniqueId) => {
    // Get the participant
    let participant;
    try{
        participant = await participants.get(uniqueId)
        if(!participant) throw "Participant not found"
    } catch(err){
        return ReturnMethods.returnFailure("LHandler: Could not fetch participant " + uniqueId)
    }
    // if(participant.currentState !== "answerReceived"){
    //     return ReturnMethods.returnFailure("LHandler: Can process next steps only after answer received")
    // }
    let partLang = participant.parameters.language;
    let partCond = participant.conditionName;
    let currentQuestion = participant.currentQuestion;

    // Get chat ID
    let secretMap = await getByUniqueId(config.experimentId, uniqueId);
    if(!secretMap){
        return ReturnMethods.returnFailure("LHandler: Unable to find participant chat ID while processing next: " + uniqueId);
    }

    let userInfo = await bot.telegram.getChat(secretMap.chatId);
    participant["firstName"] = userInfo.first_name;

    // Get all reply messages and send
    let replyMessagesObj = this.getNextReplies(participant, currentQuestion);
    if(replyMessagesObj.returnCode === DevConfig.FAILURE_CODE){
        return ReturnMethods.returnFailure(
            "LHandler (PNS):Failure getting next replies:"
            + "\n"+ replyMessagesObj.data
        );
    }

    // Try to send replies
    for(let i = 0; i < DevConfig.SEND_MESSAGE_ATTEMPTS; i++){
        try{
            await Communicator.sendReplies(bot, participant, secretMap.chatId, replyMessagesObj.data, !config.debug.messageDelay);
            break;
        } catch(e){
            if(i === DevConfig.SEND_MESSAGE_ATTEMPTS - 1){
                return ReturnMethods.returnFailure("LHandler: Unable to send replies:\n" +
                e.message + "\n" + e.stack)
            }
        }
    }



    let nextQuestionObj;

    // Select and construct the question before actions are performed
    //  i.e., before participant parameters are updated
    if(currentQuestion.selectQFirst){
        // Get the next question
        nextQuestionObj = this.getAndConstructNextQuestion(participant, currentQuestion);
        if(nextQuestionObj.returnCode === DevConfig.FAILURE_CODE){
            return ReturnMethods.returnFailure(
                "LHandler (PNS):Failure getting and constructing next question:"
                + "\n"+ nextQuestionObj.data
            );
        }
    }

    // Get all next actions
    let actionsObj = this.getNextActions(participant, currentQuestion);
    if(actionsObj.returnCode === DevConfig.FAILURE_CODE){
        return ReturnMethods.returnFailure(
            "LHandler (PNS):Failure getting next actions:"
            + "\n"+ actionsObj.data
        );
    }
    let nextActions = actionsObj.data;

    let failedActions = [];

    // Process all next actions, if any
    for(let i = 0; i < nextActions.length; i++){
        let pActionObj = await ActionHandler.processAction(bot, config, participant, nextActions[i]);

        if(pActionObj.returnCode === DevConfig.FAILURE_CODE){
            failedActions.push(pActionObj.data);
        }
        // Get updated participant for next action:
        try{
            participant = await participants.get(uniqueId)
            if(!participant) throw "Participant not found"
        } catch(err){
            return ReturnMethods.returnFailure("LHandler: Could not fetch participant again: " + uniqueId)
        }
        participant["firstName"] = userInfo.first_name;

    }

    // If question is not selected first, select and construct it after participant parameters are updated
    if(!currentQuestion.selectQFirst){
        // Get the next question
        nextQuestionObj = this.getAndConstructNextQuestion(participant, currentQuestion);
        if(nextQuestionObj.returnCode === DevConfig.FAILURE_CODE){
            return ReturnMethods.returnFailure(
                "LHandler (PNS):Failure getting and constructing next question (2):"
                + "\n"+ nextQuestionObj.data
            );
        }
    }

    // If a constructed question has been stored in next question obj
    if(!!nextQuestionObj.data){
        let returnObj = await this.sendQuestion(bot, participant, secretMap.chatId, nextQuestionObj.data,
            false, !config.debug.messageDelay);
        if(returnObj.returnCode === DevConfig.FAILURE_CODE){
            return ReturnMethods.returnFailure(
                "LHandler (PNS):Failure sending question:"
                + "\n"+ returnObj.data
            );
        }
    }
    if(failedActions.length === 0){
        return ReturnMethods.returnSuccess("");
    } else {
        return ReturnMethods.returnFailure("LHandler: Following actions failed: \n"+failedActions.join("\n"));
    }


}
module.exports.processNextSteps = processNextSteps;

/**
 *
 * Function to get and construct the next question with some error handling,
 *  based on the current question and current participant parameters
 *
 * @param participant
 * @param currentQuestion
 * @returns {{returnCode: *, data: *}|{returnCode: *, data: *}}
 */
module.exports.getAndConstructNextQuestion = (participant, currentQuestion) => {
    let requiredPartFields = ["conditionName", "parameters"];
    for (let i = 0; i < requiredPartFields.length; i++) {
        if (!(requiredPartFields[i] in participant)) {
            return ReturnMethods.returnFailure("LHandler(SNQ): Participant requires field " + requiredPartFields[i]);
        }
    }

    // Get the ID of the next question
    let returnObj = this.getNextQuestion(participant, currentQuestion);
    if (returnObj.returnCode === DevConfig.FAILURE_CODE) {
        return ReturnMethods.returnFailure(
            "LHandler (GCNS): Failure getting question:"
            + "\n"+ returnObj.data
        );
    }

    let nextQuestionObj;
    if (!!returnObj.data) {
        let qHandler = new QuestionHandler(config);
        let conditionName = participant["conditionName"];
        let language = participant.parameters["language"];
        nextQuestionObj = qHandler.constructQuestionByID(conditionName, returnObj.data, language);
        return nextQuestionObj;
    }
    return ReturnMethods.returnSuccess(nextQuestionObj);
}
/**
 *
 * Method to send a single question
 *
 * @param bot Telegram bot instance
 * @param participant participant object
 * @param chatId participant chatId
 * @param question question to be sent
 * @param scheduled
 * @param debugExp whether in experimenter debug mode or not
 * @returns {Promise<{returnCode: *, data: *}|{returnCode: *, data: *}>}
 */
module.exports.sendQuestion = async (bot, participant, chatId, question, scheduled=false, debugExp) => {

    // Cancel any outstanding reminder messages
    let cancelReminderObj = await ReminderHandler.cancelCurrentReminder(participant.uniqueId);
    if(cancelReminderObj.returnCode === DevConfig.FAILURE_CODE){
        return ReturnMethods.returnFailure(
            "LHandler (SQ):Failure cancelling reminder:"
            + "\n"+ cancelReminderObj.data
        );
    }

    // Don't send the question if it is a dummy
    // Dummies are used to either just send messages or to conditionally
    //  select next questions/actions which are not preceded by another question already
    if(question.qType === "dummy"){

        // Replace dummy question text and qId with that of previous question
        //  in case previous question has not been answered and needs to be saved
        let copyQuestion = JSON.parse(JSON.stringify(question));
        copyQuestion.text = participant.currentQuestion.text;
        copyQuestion.qId = participant.currentQuestion.qId;

        await participants.updateField(participant.uniqueId, "currentQuestion", copyQuestion);
        return this.processNextSteps(bot, participant.uniqueId);
    }
    // Handle any outstanding questions before sending next question.
    await AnswerHandler.handleNoResponse(participant.uniqueId);

    for(let i = 0; i < DevConfig.SEND_MESSAGE_ATTEMPTS; i++){
        try{
            await Communicator.sendQuestion(bot, participant, chatId, question, debugExp);
            break;
        } catch(e){
            return ReturnMethods.returnFailure("LHandler: Unable to send question:\n"
            + e.message + "\n" + e.stack)
        }
    }

    // Update participant state parameters
    let newState = scheduled ? "awaitingAnswerScheduled" : "awaitingAnswer";
    await participants.updateField(participant.uniqueId, 'currentState', newState);
    await participants.eraseCurrentAnswer(participant.uniqueId)
    await participants.updateField(participant.uniqueId, 'currentQuestion', question);

    // Set reminders, if any
    if(question.reminder && question.reminder["freqMins"]){
        let reminderObj = await ReminderHandler.setReminder(config, bot, participant, chatId,
            question.reminder.freqMins, question.reminder.numRepeats);
        if(reminderObj.returnCode === DevConfig.FAILURE_CODE){
            // Don't crash if unable to set reminders for whatever reason
            console.log(reminderObj.data);
        }
    }

    return ReturnMethods.returnSuccess("");
}

/**
     *
     * Returns an array of next actions based on what the current question specifies
     *
     *
     * @param participant participant object
     * @param currentQuestion object of the question that has just been answered
     * @returns {{returnCode: *, data: *}}
     */
let getNextActions = (participant, currentQuestion) => {

    // Validating parameters
    let requiredPartFields = ["currentAnswer", "firstName"];
    for(let i = 0; i < requiredPartFields.length; i++){
        if(!(requiredPartFields[i] in participant)){
            return ReturnMethods.returnFailure("LHandler(GNA): Participant requires field " + requiredPartFields[i]);
        }
    }

    let nextActions = [];
    if(!!currentQuestion.nextActions && currentQuestion.nextActions.length > 0){
        // Unconditional next actions get precedence
        nextActions = currentQuestion.nextActions;
    } else if(!!currentQuestion.cNextActions && currentQuestion.cNextActions.length > 0){
        // Conditional next actions
        // Evaluate the condition
        let nextActionsObj = ConfigParser.evaluateAnswerConditions(participant, currentQuestion.cNextActions)
        if(nextActionsObj.returnCode === DevConfig.FAILURE_CODE){
            return ReturnMethods.returnFailure( "LHandler: Could not process cond next actions:\n" + nextActionsObj.data);
        } else if (nextActionsObj.returnCode === DevConfig.SUCCESS_CODE) {
            // Found matching condition.
            nextActions = nextActionsObj.data;
        }
    }
    // If nothing is found, return empty array
    return ReturnMethods.returnSuccess(nextActions);
}
module.exports.getNextActions = getNextActions;
/**
 *
 * Returns a single string with the next question ID based on what the current
 * question specifies
 *
 *
 * @param participant participant object
 * @param currentQuestion object of the question that has just been answered
 * @returns {{returnCode: *, data: *}}
 */
let getNextQuestion = (participant, currentQuestion) => {
    let requiredPartFields = ["currentAnswer", "firstName"];
    for(let i = 0; i < requiredPartFields.length; i++){
        if(!(requiredPartFields[i] in participant)){
            return ReturnMethods.returnFailure("LHandler(GNQ): Participant requires field " + requiredPartFields[i]);
        }
    }
    let nextQuestion;
    if(!!currentQuestion.nextQuestion){
        // Unconditional next question get precedence
        nextQuestion = currentQuestion.nextQuestion;
    } else if(!!currentQuestion.cNextQuestions && currentQuestion.cNextQuestions.length > 0){
        // Search for conditional next question
        // Evaluate the condition specified
        let nextQuestionsObj = ConfigParser.evaluateAnswerConditions(participant, currentQuestion.cNextQuestions);
        if(nextQuestionsObj.returnCode === DevConfig.FAILURE_CODE){
            // Error while processing
            return ReturnMethods.returnFailure("LHandler: Unable to process cond next question:\n" + nextQuestionsObj.data);
        } else if(nextQuestionsObj.returnCode === DevConfig.SUCCESS_CODE){
            // Found a conditional next question
            nextQuestion = nextQuestionsObj.data;
        }
    }
    // If nothing is found, return undefined, so no next question
    return ReturnMethods.returnSuccess(nextQuestion);
}
module.exports.getNextQuestion = getNextQuestion;

/**
 *
 * Returns an array of next replies based on what the current question specifies
 *
 *
 * @param participant participant object
 * @param currentQuestion object of the question that has just been answered
 * @returns {{returnCode: *, data: *}}
 */
let getNextReplies = (participant, currentQuestion) => {
    let requiredPartFields = ["currentAnswer", "firstName"];
    for(let i = 0; i < requiredPartFields.length; i++){
        if(!(requiredPartFields[i] in participant)){
            return ReturnMethods.returnFailure("LHandler(GNR): Participant requires field " + requiredPartFields[i]);
        }
    }
    // Search for unconditional replies
    if(!!currentQuestion.replyMessages && currentQuestion.replyMessages.length > 0){
        return ReturnMethods.returnSuccess(currentQuestion.replyMessages);
    } else if(!!currentQuestion.cReplyMessages && currentQuestion.cReplyMessages.length > 0){
        // Search for conditional replies
        let rules = currentQuestion.cReplyMessages;
        let options = currentQuestion.options;
        let lastAnswer = participant.currentAnswer;
        // Evaluate the condition to get the appropriate result
        let replyMessagesObj = ConfigParser.evaluateAnswerConditions(participant, rules);
        if(replyMessagesObj.returnCode === DevConfig.FAILURE_CODE){
            // Error while evaluating
            return ReturnMethods.returnFailure("LHandler: Could not process conditional replies\n" + replyMessagesObj.data);
        } else if(replyMessagesObj.returnCode === DevConfig.SUCCESS_CODE){
            // Condition match found
            return ReturnMethods.returnSuccess(replyMessagesObj.data);
        } else {
            // No match
            return ReturnMethods.returnSuccess([]);
        }
    } else {
        // No replies found
        return ReturnMethods.returnSuccess([]);
    }
}

module.exports.getNextReplies = getNextReplies;

