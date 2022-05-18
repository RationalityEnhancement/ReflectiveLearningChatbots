const participants = require("./apiControllers/participantApiController");
const experiments = require("./apiControllers/experimentApiController");
const idMaps = require('./apiControllers/idMapApiController')
const config = require("../json/config.json");
const DevConfig = require('../json/devConfig.json');
const ReturnMethods = require('./returnMethods');
const QuestionHandler = require('./questionHandler');
const ConfigParser = require('./configParser')
const AnswerHandler = require('./answerHandler')
const Communicator = require('./communicator')
const {getByUniqueId} = require("./apiControllers/idMapApiController");
const ExperimentUtils = require("./experimentUtils");
const PIDtoConditionMap = require("../json/PIDCondMap.json");

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
    } catch(err){
        return ReturnMethods.returnFailure("LHandler: Could not fetch participant " + uniqueId)
    }
    if(participant.currentState !== "answerReceived"){
        return ReturnMethods.returnFailure("LHandler: Can process next steps only after answer received")
    }
    let partLang = participant.parameters.language;
    let partCond = participant.conditionName;
    let currentQuestion = participant.currentQuestion;
    let debugDev = !!config.debugDev;
    let debugExp = !!config.debugExp;

    let secretMap = await getByUniqueId(config.experimentId, uniqueId);
    if(!secretMap){
        return ReturnMethods.returnFailure("LHandler: Unable to find participant chat ID while processing next");
    }
    let replyMessagesObj = this.getNextReplies(participant, currentQuestion);
    if(replyMessagesObj.returnCode === DevConfig.FAILURE_CODE){
        return replyMessagesObj;
    }
    await Communicator.sendReplies(bot, participant, secretMap.chatId, replyMessagesObj.data, config.debugExp);

    let actionsObj = this.getNextActions(participant, currentQuestion);
    if(actionsObj.returnCode === DevConfig.FAILURE_CODE){
        return actionsObj;
    }
    let nextActions = actionsObj.data;

    // TODO: Move this to actionHandler
    // Process all next actions, if any
    for(let i = 0; i < nextActions.length; i++){
        let aType = nextActions[i];
        switch(aType){
            case "scheduleQuestions":
                const ScheduleHandler = require("./scheduleHandler");
                // TODO: have disabled overwriting for now, after implementation of /next
                // Debug to schedule all sets of scheduled questions in 3 minute intervals from now
                // if(debugDev){
                //   let nowDateObj = ExperimentUtils.getNowDateObject(participant.parameters.timezone);
                //   if(nowDateObj.returnCode === DevConfig.FAILURE_CODE){
                //     console.error(nowDateObj.data);
                //   }
                //   let qHandler = new QuestionHandler(config);
                //   let schQObj = qHandler.getScheduledQuestions(partCond);
                //   if(schQObj.returnCode === DevConfig.FAILURE_CODE){
                //     return schQObj;
                //   }
                //   ScheduleHandler.overrideScheduleForIntervals(schQObj.data, nowDateObj.data, 1);
                // }
                let returnObj = await ScheduleHandler.scheduleAllQuestions(bot, uniqueId, config, debugExp);
                if(returnObj.returnCode === DevConfig.FAILURE_CODE){
                    return returnObj
                } else if(returnObj.returnCode === DevConfig.PARTIAL_FAILURE_CODE){
                    return ReturnMethods.returnFailure(returnObj.failData);
                }
                break;
            case "assignToCondition":
                let experiment;
                try{
                    experiment = await experiments.get(config.experimentId);
                } catch(err){
                    return ReturnMethods.returnFailure("LHandler: could not fetch experiment " + config.experimentId)
                }
                let ID = participant.parameters.pId;
                if(!ID) ID = uniqueId;
                let scheme = config.assignmentScheme;
                let conditionRatios = experiment["conditionAssignments"];
                let currentAssignments = experiment["currentlyAssignedToCondition"];
                let conditionNames = experiment["experimentConditions"];
                let conditionObj = ExperimentUtils.assignToCondition(ID, PIDtoConditionMap, conditionRatios, currentAssignments, scheme);
                if(conditionObj.returnCode === DevConfig.FAILURE_CODE){
                    return conditionObj;
                }
                let assignedConditionIdx = conditionObj.data;
                let conditionName = conditionNames[assignedConditionIdx];
                if(debugExp){
                    await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) You have been assigned to condition: " + conditionName, config.debugExp);
                }
                await participants.updateField(uniqueId, "conditionIdx", assignedConditionIdx);
                await participants.updateField(uniqueId, "conditionName", conditionName);
                await experiments.updateConditionAssignees(config.experimentId, assignedConditionIdx, 1);
                break;
            default:
                return ReturnMethods.returnFailure("LHandler: aType not recognized");
        }
    }


    // get next question and process
    let nextQuestionObj = this.getNextQuestion(participant, currentQuestion);
    if(nextQuestionObj.returnCode === DevConfig.FAILURE_CODE){
        return nextQuestionObj;
    }
    if(!!nextQuestionObj.data){
        await this.sendNextQuestion(bot, participant, secretMap.chatId, config, nextQuestionObj.data);
    }
    return ReturnMethods.returnSuccess("");

}
module.exports.processNextSteps = processNextSteps;

/**
     *
     * Get the next question based on the ID and send it using communicator
     *
     * @param bot Telegram bot instance
     * @param participant participant object - must contain currentQuestion and parameters.language fields
     * @param chatId chatId of the participant
     * @param config loaded config JSON file
     * @param nextQuestionId ID of the next question to be sent
     * @returns {Promise<{returnCode: *, data: *}|{returnCode: *, data: *}>}
     */
module.exports.sendNextQuestion = async (bot, participant, chatId, config, nextQuestionId) => {
    let requiredPartFields = ["conditionName", "parameters"];
    for(let i = 0; i < requiredPartFields.length; i++){
        if(!(requiredPartFields[i] in participant)){
            return ReturnMethods.returnFailure("LHandler: Participant requires field " + requiredPartFields[i]);
        }
    }

    let qHandler = new QuestionHandler(config);
    let conditionName = participant["conditionName"];
    let language = participant.parameters["language"];

    let debugDev = config.debugDev;
    let debugExp = config.debugExp;

    let nextQObj = qHandler.constructQuestionByID(conditionName, nextQuestionId, language);
    if(nextQObj.returnCode === DevConfig.FAILURE_CODE){
        return nextQObj;
    } else {
        let nextQ = nextQObj.data;
        await this.sendQuestion(bot, participant, chatId, nextQ, debugExp);
        return ReturnMethods.returnSuccess("");
    }
}

/**
 *
 * Method to send a single question
 *
 * @param bot Telegram bot instance
 * @param participant participant object
 * @param chatId participant chatId
 * @param question question to be sent
 * @param debugExp whether in experimenter debug mode or not
 * @returns {Promise<{returnCode: *, data: *}|{returnCode: *, data: *}>}
 */
module.exports.sendQuestion = async (bot, participant, chatId, question, debugExp) => {
    // Don't send the question if it is a dummy
    // Dummies are used to either just send messages or to conditionally
    //  select next questions/actions which are not preceded by another question already
    if(question.qType === "dummy"){
        await participants.updateField(participant.uniqueId, "currentState", "answerReceived");
        await participants.updateField(participant.uniqueId, "currentQuestion", question);
        return this.processNextSteps(bot, participant.uniqueId);
    }
    await Communicator.sendQuestion(bot, participant, chatId, question, debugExp);
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

    let requiredPartFields = ["currentAnswer"];
    for(let i = 0; i < requiredPartFields.length; i++){
        if(!(requiredPartFields[i] in participant)){
            return ReturnMethods.returnFailure("LHandler: Participant requires field " + requiredPartFields[i]);
        }
    }

    let nextActions = [];
    if(!!currentQuestion.nextActions && currentQuestion.nextActions.length > 0){
        // Unconditional next actions
        nextActions = currentQuestion.nextActions;
    } else if(!!currentQuestion.cNextActions && currentQuestion.cNextActions.length > 0){
        // Conditional next actions
        let nextActionsObj = ConfigParser.evaluateAnswerConditions(currentQuestion.cNextActions, currentQuestion.options, participant.currentAnswer)
        if(nextActionsObj.returnCode === DevConfig.FAILURE_CODE){
            return ReturnMethods.returnFailure( "LHandler: Could not process cond next actions: " + nextActionsObj.data);
        } else if (nextActionsObj.returnCode === DevConfig.SUCCESS_CODE) {
            nextActions = nextActionsObj.data;
        }
    }
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
    let requiredPartFields = ["currentAnswer"];
    for(let i = 0; i < requiredPartFields.length; i++){
        if(!(requiredPartFields[i] in participant)){
            return ReturnMethods.returnFailure("LHandler: Participant requires field " + requiredPartFields[i]);
        }
    }
    let nextQuestion
    if(!!currentQuestion.nextQuestion){
        nextQuestion = currentQuestion.nextQuestion;
    } else if(!!currentQuestion.cNextQuestions && currentQuestion.cNextQuestions.length > 0){
        let nextQuestionsObj = ConfigParser.evaluateAnswerConditions(currentQuestion.cNextQuestions,
            currentQuestion.options, participant.currentAnswer);
        if(nextQuestionsObj.returnCode === DevConfig.FAILURE_CODE){
            return ReturnMethods.returnFailure("LHandler: Unable to process cond next question: " + nextQuestionsObj.data);
        } else if(nextQuestionsObj.returnCode === DevConfig.SUCCESS_CODE){
            nextQuestion = nextQuestionsObj.data;
        }
    }
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
    let requiredPartFields = ["currentAnswer"];
    for(let i = 0; i < requiredPartFields.length; i++){
        if(!(requiredPartFields[i] in participant)){
            return ReturnMethods.returnFailure("LHandler: Participant requires field " + requiredPartFields[i]);
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
        let replyMessagesObj = ConfigParser.evaluateAnswerConditions(rules, options, lastAnswer);
        console.log(replyMessagesObj);
        if(replyMessagesObj.returnCode === DevConfig.FAILURE_CODE){
            return ReturnMethods.returnFailure("LHandler: Could not process conditional replies" + replyMessagesObj.data);
        } else if(replyMessagesObj.returnCode === DevConfig.SUCCESS_CODE){
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

