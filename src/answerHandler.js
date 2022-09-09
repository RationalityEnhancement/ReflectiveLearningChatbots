const participants = require("./apiControllers/participantApiController");
const ConfigReader = require('../src/configReader');
const config = ConfigReader.getExpConfig();
const DevConfig = ConfigReader.getDevConfig();
const ReturnMethods = require('./returnMethods');
const moment = require('moment-timezone');
const ConfigParser = require('./configParser')
const ReminderHandler = require('./reminderHandler')
const ExperimentUtils = require('./experimentUtils')

/**
 * Answer handler class that takes in a config as a parameter
 * Purpose of the class is to handle anything that comes in
 * from the user
 *
 *
 */

class AnswerHandler{

    /**
     *
     * If the current question has not been answered by the user in time, and
     * a new question must be asked, this method is called to update
     * the answer list to reflect that the user has not responded to a
     * particular question
     *
     * @param uniqueId the uniqueId of the user
     * @returns {Promise<{returnCode: *, data: *}|{returnCode: *, data: *}>}
     *
     */
    static async handleNoResponse(uniqueId){
        let participant;
        try{
            participant = await participants.get(uniqueId);
            if(!participant) throw "Participant not found"
        } catch(error){
            return ReturnMethods.returnFailure("AHandler: could not get participant");
        }

        // If answer is outstanding
        if(!["answerReceived", "starting"].includes(participant.currentState)){
            let currentAnswer = participant.currentAnswer;

            let saveString = DevConfig.NO_RESPONSE_STRING;
            switch(participant.currentState){
                case 'awaitingAnswerScheduled':
                case "awaitingAnswer" :
                    saveString = DevConfig.NO_RESPONSE_STRING;
                    break;
                case "repeatQuestion" :
                    saveString = DevConfig.REPEAT_QUESTION_STRING;
                    break;
                case "invalidAnswer" :
                    saveString = DevConfig.INVALID_ANSWER_STRING + " " + currentAnswer[0];
                    break;
            }
            // Check if there is already some current answer that has not been saved
            // E.g., in a multi-choice question where the user has not clicked "Done"
            // If there's no current answer, save the answer as "No response" if
            let fullAnswer = [saveString];
            if(participant.currentState.startsWith('awaitingAnswer')){
                try{
                    fullAnswer = currentAnswer.length > 0 ? currentAnswer : fullAnswer;
                } catch(error){
                    return ReturnMethods.returnFailure("AHandler: currentAnswer not present");
                }
            }

            // Answer current outstanding question with no response answer
            let returnObj = await this.finishAnswering(participant, participant.currentQuestion, fullAnswer);
            return returnObj;
        } else {
            return ReturnMethods.returnSuccess("");
        }

    }
    /**
     *
     * Wrapping up answering for any question type
     *
     * @param participant object of the participant
     * @param currentQuestion current question that has just been answered
     * @param fullAnswer String if single answer, array of strings otherwise
     * @returns {Promise<{returnCode: *, data: *}>}
     *          if success, return instruction to calling function to move on from current question
     *          if failure, return error message
     */
    static async finishAnswering(participant, currentQuestion, fullAnswer){
        let cancelReminderObj = await ReminderHandler.cancelCurrentReminder(participant);
        if(cancelReminderObj.returnCode === DevConfig.FAILURE_CODE){
            return ReturnMethods.returnFailure(
                "AHandler:Unable to cancel reminder:\n"+ cancelReminderObj.data
            );
        }
        // TODO: participant is not up to date because of cancelled reminder, but perhaps it doesn't matter?
        try{
            let tz = participant.parameters.timezone;
            // Add the answer to the list of answers in the database
            // If the answer is a string, convert to array
            let answerConv = (typeof fullAnswer === "string") ? [fullAnswer] : fullAnswer;
            let timeStamp = moment.tz(tz);

            let timeString = timeStamp.format();
            const answer = {
                qId: currentQuestion.qId,
                text: currentQuestion.text,
                askTimeStamp: currentQuestion.askTimeStamp,
                answerTimeStamp: timeString,
                answer: answerConv,
                stageName: participant.stages.stageName,
                stageDay: participant.stages.stageDay,
            };
            await participants.addAnswer(participant.uniqueId, answer, answerConv);
        } catch(e){
            return ReturnMethods.returnFailure("AHandler: unable to add answer\n" +
            e.message + "\n" + e.stack)
        }

        try{
            // Update that answer is no longer being expected
            await participants.updateField(participant.uniqueId, "currentState", "answerReceived");
        } catch(e){
            return ReturnMethods.returnFailure("AHandler: unable to save participant")
        }
        // Trigger the next action
        return ReturnMethods.returnSuccess(DevConfig.NEXT_ACTION_STRING)
    }

    /**
     *
     * Process any incoming text based on the current state of the chatbot for participant
     * and expected response for the current question
     *
     * @param participant participant database object, must contain fields uniqueId, currentQuestion and currentState
     * @param answerText the text that is supposed to be processed
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}|{returnCode: *, data: *}>}
     */
    static async processAnswer(participant, answerText){
        // console.log("Answer text: " + answerText)
        // Error handling to ensure that the participant has the required fields

        if(!participant){
            return ReturnMethods.returnFailure("AHandler: Participant not available")
        }
        if(!("uniqueId" in participant)){
            return ReturnMethods.returnFailure("AHandler: Chat ID not found")
        }
        if(!("currentQuestion" in participant)){
            return ReturnMethods.returnFailure("AHandler: Current question not found")
        }
        if(!("currentState" in participant)){
            return ReturnMethods.returnFailure("AHandler: Current state not found")
        }
        // Process an answer only if an answer is expected
        if(participant.currentState === "experimentEnd"){
            try{
                return ReturnMethods.returnPartialFailure(
                    config.phrases.experiment.cannotInteractAfterEnd[participant.parameters.language],
                    DevConfig.NO_RESPONSE_STRING
                );
            } catch(err){
                return ReturnMethods.returnFailure("AHandler: Unable to send cannot interact message\n" +
                    err.message + "\n" + err.stack)
            }
        }
        else if(!["awaitingAnswer", "awaitingAnswerScheduled"].includes(participant.currentState)){
            try{
                return ReturnMethods.returnPartialFailure(
                    config.phrases.experiment.didntUnderstand[participant.parameters.language],
                    DevConfig.NO_RESPONSE_STRING
                );
            } catch(err){
                return ReturnMethods.returnFailure("AHandler: Unable to send cannot interact message\n" +
                err.message + "\n" + err.stack)
            }
        }

        // If answer is not string
        if(typeof answerText !== "string"){
            return ReturnMethods.returnFailure("AHandler: answer must be a string");
        }
        let currentQuestion = participant.currentQuestion;

        // If answer is expected
        if(participant.currentState.startsWith('awaitingAnswer')){

            switch(currentQuestion["qType"]){
                // If the expected answer is one from a list of possible answers

                case 'singleChoice':
                    // Process answer if it is one of the valid options
                    try{
                        if(currentQuestion.options.includes(answerText)){
                            // Complete answering
                            let finishObj = await this.finishAnswering(participant, currentQuestion, answerText);
                            // Return failure or trigger the next action
                            return finishObj;
                        } else {
                            return participants.updateFields(participant.uniqueId,{
                                currentState: "invalidAnswer",
                                currentAnswer: [answerText]
                            })
                                .then((resolve) => {
                                    let errorMsg = config.phrases.answerValidation.invalidOption[participant.parameters.language]
                                    if(!errorMsg) throw "AHandler: error message/participant language not found - single choice"
                                    return ReturnMethods.returnPartialFailure(errorMsg, DevConfig.REPEAT_QUESTION_STRING)
                                })
                                .catch((err) => {
                                    let errorMsg = "AHandler: could not update participant fields\n"
                                    + err.message + "\n" + err.stack;
                                    return ReturnMethods.returnFailure(errorMsg);
                                })

                        }
                    } catch(e){
                        return ReturnMethods.returnFailure("AHandler: SC question options or response phrase not found");
                    }


                // In case of multi-choice, let user pick as many as possible
                case 'multiChoice' :
                    // Check whether it is a valid option
                    try{
                        if(currentQuestion.options.includes(answerText)){
                            // Save the answer to participant's current answer
                            await participants.addToCurrentAnswer(participant.uniqueId, answerText);
                            return ReturnMethods.returnSuccess(DevConfig.NO_RESPONSE_STRING);

                        } else if(answerText === config.phrases.keyboards.terminateAnswer[participant.parameters.language]) {
                            // If participant terminates without providing answer
                            if(participant.currentAnswer.length === 0){
                                // Repeat the question
                                await participants.updateField(participant.uniqueId, "currentState", "invalidAnswer")
                                let errorMsg = config.phrases.answerValidation.noOptions[participant.parameters.language]
                                if(!errorMsg) throw "AHandler: error message/participant language not found - multi choice"
                                return ReturnMethods.returnPartialFailure(errorMsg, DevConfig.REPEAT_QUESTION_STRING)
                            }
                            // If participant is finished answering
                            let finishObj = await this.finishAnswering(participant, currentQuestion, participant.currentAnswer);
                            // Return failure or trigger the next action
                            return finishObj;

                        } else {
                            // Repeat the question
                            await participants.updateField(participant.uniqueId, "currentState", "invalidAnswer")
                            let errorMsg = config.phrases.answerValidation.invalidOption[participant.parameters.language];
                            if(!errorMsg) throw "AHandler: error message/participant language not found - multi choice"
                            return ReturnMethods.returnPartialFailure(errorMsg, DevConfig.REPEAT_QUESTION_STRING)
                        }
                    } catch(e){
                        return ReturnMethods.returnFailure("AHandler: MC question options or response phrase not found");
                    }


                // Question with free text input
                case 'freeform':
                    let meetsMinLen = true;

                    // Check minimum length requirement

                    let ansLenChars = answerText.length;
                    let errorString = "", minLength;
                    if(currentQuestion.minLengthChars && ansLenChars < currentQuestion.minLengthChars){
                        meetsMinLen = false;
                        errorString = config.phrases.answerValidation.notLongEnoughChars[participant.parameters.language]
                        minLength = currentQuestion.minLengthChars;
                    }

                    let ansLenWords = answerText.split(" ").filter(e => e.trim().length > 0).length;
                    if(currentQuestion.minLengthWords && ansLenWords < currentQuestion.minLengthWords){
                        meetsMinLen = false;
                        errorString = config.phrases.answerValidation.notLongEnoughWords[participant.parameters.language]
                        minLength = currentQuestion.minLengthWords;
                    }

                    let answerConforms = true;
                    if(currentQuestion.answerShouldBe && currentQuestion.answerShouldBe.length > 0){
                        answerConforms = currentQuestion.answerShouldBe.includes(answerText);
                        if(!answerConforms) errorString = config.phrases.answerValidation.answerNotConforming[participant.parameters.language];
                    }

                    if(meetsMinLen && answerConforms){
                        // Complete answering
                        let finishObj = await this.finishAnswering(participant, currentQuestion, answerText);
                        // Return failure or trigger the next action
                        return finishObj;
                    } else if(!meetsMinLen) {
                        // Repeat the question if not long enough
                        await participants.updateFields(participant.uniqueId,{
                            currentState: "invalidAnswer",
                            currentAnswer: [answerText]
                        });
                        let replaceVarObj = ConfigParser.replaceSpecificVariablesInString(errorString,
                            {"MinLength" : minLength})
                        if(replaceVarObj.returnCode === DevConfig.SUCCESS_CODE) errorString = replaceVarObj.data
                        return ReturnMethods.returnPartialFailure(errorString, DevConfig.REPEAT_QUESTION_STRING)
                    } else {
                        // Suggest the top closest required answers if it is supposed to be one from a set of answers
                        await participants.updateFields(participant.uniqueId,{
                            currentState: "invalidAnswer",
                            currentAnswer: [answerText]
                        });
                        let closestStringsObj = ExperimentUtils.getClosestStrings(
                            answerText, currentQuestion.answerShouldBe, DevConfig.DEFAULT_TOP_STRINGS_COUNT);
                        if(closestStringsObj.returnCode === DevConfig.FAILURE_CODE){
                            errorString = config.phrases.answerValidation.defaultInvalid[participant.parameters.language];
                        } else {
                            let formattedArray = closestStringsObj.data.map(e => "\n\n* " + e);
                            errorString += formattedArray.join('');
                        }
                        return ReturnMethods.returnPartialFailure(errorString, DevConfig.REPEAT_QUESTION_STRING)
                    }
                // Question with free text input but over multiple messages
                case 'freeformMulti':
                    let termination = config.phrases.keyboards.terminateAnswer[participant.parameters.language];
                    let trimmedTerm;
                    let trimmedAns;

                    // Trim the expected termination answer and the current answer for comparison
                    try{
                        let regex = /[.()!?;:_ ,'-]/g;
                        trimmedTerm = termination.replace(regex, "").toLowerCase();
                        trimmedAns = answerText.replace(regex, "").toLowerCase();
                    } catch(err){
                        return ReturnMethods.returnFailure("AHandler: Participant language or term answer phrase not found")
                    }

                    // Check if user has typed termination answer
                    if(trimmedTerm === trimmedAns){

                        let meetsMinLen = true;

                        // Check minimum length requirement
                        let curAns = participant.currentAnswer;
                        let curAnsLens = curAns.map(el => el.length);
                        let ansLenChars = curAnsLens.length > 0 ? curAnsLens.reduce((partialSum, ans) => partialSum + ans) : 0;
                        let errorString, minLength;
                        if(currentQuestion.minLengthChars && ansLenChars < currentQuestion.minLengthChars){
                            meetsMinLen = false;
                            errorString = config.phrases.answerValidation.notLongEnoughChars[participant.parameters.language]
                            minLength = currentQuestion.minLengthChars;
                        }

                        let ansLenWords = curAns.join(" ").split(" ").filter(e => e.trim().length > 0).length;
                        if(currentQuestion.minLengthWords && ansLenWords < currentQuestion.minLengthWords){
                            meetsMinLen = false;
                            errorString = config.phrases.answerValidation.notLongEnoughWords[participant.parameters.language]
                            minLength = currentQuestion.minLengthWords;
                        }
                        if(meetsMinLen){
                            // If participant is finished answering
                            let finishObj = await this.finishAnswering(participant, currentQuestion, participant.currentAnswer);
                            // Return failure or trigger the next action
                            return finishObj;
                        } else {
                            // Repeat the question
                            await participants.updateField(participant.uniqueId, "currentState", "invalidAnswer")
                            let replaceVarObj = ConfigParser.replaceSpecificVariablesInString(errorString,
                                {"MinLength" : minLength})
                            if(replaceVarObj.returnCode === DevConfig.SUCCESS_CODE) errorString = replaceVarObj.data
                            return ReturnMethods.returnPartialFailure(errorString, DevConfig.REPEAT_QUESTION_STRING)
                        }

                    } else {
                        // Save the answer to participant's current answer
                        await participants.addToCurrentAnswer(participant.uniqueId, answerText);
                        return ReturnMethods.returnSuccess(DevConfig.NO_RESPONSE_STRING);
                    }

                // Qualtrics survey question
                case 'qualtrics':
                    let expectedAnswer = config.phrases.keyboards.terminateAnswer[participant.parameters.language];
                    let trimmedExpected;
                    let trimmedAnswer;

                    let regex = /[.()!?;:_ ,'-]/g;
                    try{
                        trimmedExpected = expectedAnswer.replace(regex, "").toLowerCase();
                        trimmedAnswer = answerText.replace(regex, "").toLowerCase();
                    } catch(err){
                        return ReturnMethods.returnFailure("AHandler: Participant language or term answer phrase not found")
                    }
                    let validAnswers;
                    if(currentQuestion.continueStrings && currentQuestion.continueStrings.length > 0){
                        validAnswers = currentQuestion.continueStrings;
                        validAnswers = validAnswers.map(answerText => answerText.replace(regex, "").toLowerCase());
                    } else {
                        validAnswers = [trimmedExpected];
                    }

                    // Check if user has entered a valid termination answer
                    // If not, then tell the user that the only way to continue is to send that phrase.
                    if(!validAnswers.includes(trimmedAnswer)){
                        let errorString = config.phrases.answerValidation.terminateAnswerProperly[participant.parameters.language]
                        return ReturnMethods.returnPartialFailure(errorString, DevConfig.NO_RESPONSE_STRING);
                    } else {
                        return this.finishAnswering(participant, currentQuestion, answerText);
                    }
                // Question which requires number input
                case 'number' :
                    // Check if it can be parsed as a number
                    if(isNaN(answerText) || answerText.length === 0) {
                        await participants.updateFields(participant.uniqueId,{
                            currentState: "invalidAnswer",
                            currentAnswer: [answerText]
                        });
                        let errorString = config.phrases.answerValidation.notANumber[participant.parameters.language]
                        return ReturnMethods.returnPartialFailure(errorString, DevConfig.REPEAT_QUESTION_STRING);
                    }

                    // Check if decimal or integer
                    let numberForm;
                    if(answerText.indexOf('.') !== -1) {
                        numberForm = parseFloat(answerText);
                    } else {
                        numberForm = parseInt(answerText);
                    }

                    // Check if it is within the range
                    if(!!currentQuestion.range){
                        if("lower" in currentQuestion.range){
                            if(numberForm < currentQuestion.range.lower){
                                // Answer is invalid. Send corresponding message, and ask to repeat question
                                await participants.updateFields(participant.uniqueId,{
                                    currentState: "invalidAnswer",
                                    currentAnswer: [answerText]
                                });
                                let errorString = config.phrases.answerValidation.numberTooLow[participant.parameters.language]
                                let replaceVarObj = ConfigParser.replaceSpecificVariablesInString(errorString,
                                    {"LowerBound" : currentQuestion.range.lower})
                                if(replaceVarObj.returnCode === DevConfig.SUCCESS_CODE) errorString = replaceVarObj.data
                                return ReturnMethods.returnPartialFailure(errorString, DevConfig.REPEAT_QUESTION_STRING);
                            }
                        }
                        if("upper" in currentQuestion.range){
                            if(numberForm > currentQuestion.range.upper){
                                await participants.updateFields(participant.uniqueId,{
                                    currentState: "invalidAnswer",
                                    currentAnswer: [answerText]
                                });
                                let errorString = config.phrases.answerValidation.numberTooHigh[participant.parameters.language]
                                let replaceVarObj = ConfigParser.replaceSpecificVariablesInString(errorString,
                                    {"UpperBound" : currentQuestion.range.upper})
                                if(replaceVarObj.returnCode === DevConfig.SUCCESS_CODE) errorString = replaceVarObj.data
                                return ReturnMethods.returnPartialFailure(errorString, DevConfig.REPEAT_QUESTION_STRING);
                            }
                        }
                    }

                    // All checks passed, answer is valid
                    return this.finishAnswering(participant, currentQuestion, answerText);
                case 'dummy':
                    // TODO: test dummy
                    return ReturnMethods.returnPartialFailure("Dummy Question", DevConfig.NO_RESPONSE_STRING)

                default:
                    return ReturnMethods.returnFailure("AHandler: Question is missing valid question type: " + currentQuestion.qId);
            }
        }
    }

}

module.exports = AnswerHandler;
