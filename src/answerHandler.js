const participants = require("./apiControllers/participantApiController");
const MessageSender = require("./messageSender");
const config = require("../json/config.json");

/**
 * Answer handler class that takes in a config as a parameter
 * Purpose of the class is to handle anything that comes in
 * from the user
 *
 *
 * @param config variable containing a valid config json file loaded
 *              using 'require('...json')'
 */

function AnswerHandler(config){

    let returnError = (data) => {
        return {
            "returnCode" : -1,
            "data" : data
        };
    }
    let returnSuccess = (data) => {
        return {
            "returnCode" : 1,
            "data" : data
        }
    }

    let finishAnswer = (currentQuestion) => {

    }

    let processAnswer = async (participant, currentQuestion, answerText) => {
        // Process an answer only if an answer is expected
        if(participant.currentState === 'awaitingAnswer'){

            // Validate answer if the question type is recognized
            if(!("qType" in currentQuestion)){
                console.log(currentQuestion);
                console.error("ERROR: Question is missing question type");
                return;
            }
            switch(currentQuestion["qType"]){
                // If the expected answer is one from a list of possible answers
                case 'singleChoice':
                    // Process answer if it is one of the valid options
                    if(currentQuestion.options.includes(answerText)){
                        // Save the answer to participant parameters if that options is specified
                        if(currentQuestion.saveAnswerTo){
                            await participants.updateParameter(ctx.from.id, currentQuestion.saveAnswerTo, answerText);
                        }
                        // TODO: Remove keyboard if answer is acceptable, in case they typed in a correct answer
                        // Add the answer to the list of answers in the database
                        const answer = {
                            qId: currentQuestion.id,
                            text: currentQuestion.text,
                            timeStamp: new Date(),
                            answer: [answerText]
                        };
                        await participants.addAnswer(ctx.from.id, answer);
                        await participants.updateField(ctx.from.id, "currentState", "answerReceived");

                        // Send replies to the answer, if any
                        await MessageSender.sendReplies(bot, ctx.from.id, currentQuestion);

                        // Send the next question, if any
                        await processNextAction(bot, ctx.from.id);
                        return;

                    } else {
                        // TODO: change this to add validation prompts to the question?
                        // If the answer is not valid, resend the question.
                        await MessageSender.sendMessage(bot, ctx.from.id, config.phrases.answerValidation.option[participant.parameters.language]);
                        await MessageSender.sendQuestion(bot, ctx.from.id, currentQuestion)
                    }
                    break;

                // In case of multi-choice, let user pick as many as possible
                case 'multiChoice' :
                    if(currentQuestion.options.includes(answerText)){
                        // Save the answer to participant's current answer

                        await participants.updateField(ctx.from.id,"currentState", "answering");
                        await participants.addToCurrentAnswer(ctx.from.id, answerText);

                    } else if(answerText === config.phrases.keyboards.terminateMultipleChoice[participant.parameters.language]) {
                        const answer = {
                            qId: currentQuestion.id,
                            text: currentQuestion.text,
                            timeStamp: new Date(),
                            answer: [answerText]
                        };
                        // Save the answer to participant parameters if that options is specified
                        if(currentQuestion.saveAnswerTo){
                            await participants.updateParameter(ctx.from.id, currentQuestion.saveAnswerTo, [answerText]);
                        }
                        await participants.addAnswer(ctx.from.id, answer);
                        await participants.updateField(ctx.from.id, "currentState", "answerReceived");

                        // Send replies to the answer, if any
                        await MessageSender.sendReplies(bot, ctx.from.id, currentQuestion);

                        // Send the next question, if any
                        await processNextAction(bot, ctx.from.id);
                        return;
                    } else {
                        // TODO: change this to add validation prompts to the question?
                        // If the answer is not valid, resend the question.
                        await MessageSender.sendMessage(bot, ctx.from.id, config.phrases.answerValidation.option[participant.parameters.language]);
                        await MessageSender.sendQuestion(bot, ctx.from.id, currentQuestion)
                    }
                    break;

                // Question with free text input
                case 'freeform':

                    if(currentQuestion.saveAnswerTo){
                        await participants.updateParameter(ctx.from.id, currentQuestion.saveAnswerTo, answerText);
                    }
                    const answer = {
                        qId: currentQuestion.id,
                        text: currentQuestion.text,
                        timeStamp: new Date(),
                        answer: [answerText]
                    };
                    await participants.addAnswer(ctx.from.id, answer);
                    await participants.updateField(ctx.from.id, "currentState", "answerReceived");
                    await MessageSender.sendReplies(bot, ctx.from.id, currentQuestion);
                    await processNextAction(bot, ctx.from.id);
                    return;

                default:
                    throw "ERROR: Question type not recognized"
            }
        } else if (participant.currentState === "answering"){
            if(currentQuestion.options.includes(answerText)){
                // Save the answer to participant's current answer
                await participants.addToCurrentAnswer(ctx.from.id, answerText);

            } else if(answerText === config.phrases.keyboards.terminateMultipleChoice[participant.parameters.language]) {
                const answer = {
                    qId: currentQuestion.id,
                    text: currentQuestion.text,
                    timeStamp: new Date(),
                    answer: participant.currentAnswer
                };
                await participants.addAnswer(ctx.from.id, answer);
                await participants.updateField(ctx.from.id, "currentState", "answerReceived");
                // Save the answer to participant parameters if that options is specified
                if(currentQuestion.saveAnswerTo){
                    await participants.updateParameter(ctx.from.id, currentQuestion.saveAnswerTo, participant.currentAnswer);
                }

                await MessageSender.sendMessage(bot, ctx.from.id, config.phrases.keyboards.finishedChoosingReply[participant.parameters.language]);
                // Send replies to the answer, if any
                await MessageSender.sendReplies(bot, ctx.from.id, currentQuestion);

                // Send the next question, if any
                await processNextAction(bot, ctx.from.id);

            } else {
                // TODO: Don't restart if wrong option entered?
                // If the answer is not valid, resend the question.
                await MessageSender.sendMessage(bot, ctx.from.id, config.phrases.answerValidation.option[participant.parameters.language]);
                await MessageSender.sendQuestion(bot, ctx.from.id, currentQuestion)
            }
        }

    }

    /**
     * Constructing a question from the config file by the given question ID
     * and user preferences
     *
     * constructedQuestion = {
     *     qId: "<questionCategoryName>.<questionID>,
     *     qType: "<questionType>",
     *     text: "<questionTextInPreferredLanguage>",
     *     <otherOptionalParameters> : [see variables languageDepOptionalParams
     *                                     and otherOptionalParams]
     * }
     *
     * @param qId Question ID of the form <questionCategory>.<questionID>
     * @param language Selected language of the user
     * @returns {returnCode, data}
     *          if success, returnCode is 1, data  contains constructedQuestion
     *          if failure, returnCode is -1 data contains errorMsg
     */

    this.constructQuestionByID = (qId, language) => {

        if(!config.languages.includes(language)) language = config.defaultLanguage;

        let selectedQuestion;

        let selectedQuestionObj = getQuestionById(qId);

        if(selectedQuestionObj.returnCode == -1) {
            return returnError(selectedQuestionObj.data);
        } else {
            selectedQuestion = selectedQuestionObj.data;
        }

        let constructedQuestion = {
            "qId" : qId,
            "text" : selectedQuestion.text[language],
            "qType" : selectedQuestion.qType,
        }


        const languageDepOptionalParams = ["options", "replyMessages"];
        const otherOptionalParams = ["saveAnswerTo", "nextAction"];

        for(let i = 0; i < languageDepOptionalParams.length; i++){
            field = languageDepOptionalParams[i];
            if(field in selectedQuestion) constructedQuestion[field] = selectedQuestion[field][language];
        }
        for(let i = 0; i < otherOptionalParams.length; i++){
            field = otherOptionalParams[i];
            if(field in selectedQuestion) constructedQuestion[field] = selectedQuestion[field];
        }
        return returnSuccess(constructedQuestion);

    }

    /**
     * Returns starting question of the question category as defined in the config file
     * It is the question that contains the "start" field set to the value "true"
     *
     * @param categoryName the question category from which first question is to be found
     * @param language language in which the question should be presented
     * @returns {{returnCode: number, data}}
     *          if success, returnCode is 1, data  contains constructedQuestion
     *          if failure, returnCode is -1 data contains errorMsg
     */
    this.getFirstQuestionInCategory = (categoryName, language) => {
        if(!(categoryName in config.questionCategories)){
            return returnError("QHandler: Question category " + categoryName + " doesn't exist");
        }
        const category = config.questionCategories[categoryName];
        let selectedQuestion;

        for(let i = 0; i < category.length; i++){
            let currentQuestion = category[i];
            if(currentQuestion.start){
                selectedQuestion = currentQuestion;
                break;
            }
        }
        if(!selectedQuestion){
            return returnError("QHandler: Starting question doesn't exist in category " + categoryName)
        }
        let fullId = categoryName + "." + selectedQuestion.qId;
        return this.constructQuestionByID(fullId, language);
    }

    this.getScheduledQuestions = () => {
        if(!("scheduledQuestions" in config)){
            return returnError("QHandler: Scheduled questions not found");
        }
        let schQList = config["scheduledQuestions"];



    }
}

module.exports = AnswerHandler;
