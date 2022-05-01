const participants = require("./apiControllers/participantApiController");
const config = require("../json/config.json");
const DevConfig = require('../json/devConfig.json');
const ReturnMethods = require('./returnMethods');

/**
 * Answer handler class that takes in a config as a parameter
 * Purpose of the class is to handle anything that comes in
 * from the user
 *
 *
 * @param config variable containing a valid config json file loaded
 *              using 'require('...json')'
 */

class AnswerHandler{

    /**
     *
     * Wrapping up answering for any question type
     *
     * @param chatId chatId of the participant
     * @param currentQuestion current question that has just been answered
     * @param fullAnswer String if single answer, array of strings otherwise
     * @returns {Promise<{returnCode: *, data: *}>}
     *          if success, return instruction to calling function to move on from current question
     *          if failure, return error message
     */
    static async finishAnswering(chatId, currentQuestion, fullAnswer){
        try{
            // Save answer to parameters if necessary
            if(!!currentQuestion.saveAnswerTo){
                await participants.updateParameter(chatId, currentQuestion.saveAnswerTo, fullAnswer);
            }
        } catch(e){
            ReturnMethods.returnFailure("AHandler: unable to update parameter with answer")
        }

        try{
            // Add the answer to the list of answers in the database
            // If the answer is a string, convert to array
            let answerConv = (typeof fullAnswer === "string") ? [fullAnswer] : fullAnswer;
            const answer = {
                qId: currentQuestion.qId,
                text: currentQuestion.text,
                timeStamp: new Date(),
                answer: answerConv
            };
            await participants.addAnswer(chatId, answer);
        } catch(e){
            ReturnMethods.returnFailure("AHandler: unable to add answer")
        }

        try{
            // Update that answer is no longer being expected
            await participants.updateField(chatId, "currentState", "answerReceived");
        } catch(e){
            ReturnMethods.returnFailure("AHandler: unable to save participant")
        }
        // Trigger the next action
        return ReturnMethods.returnSuccess(DevConfig.NEXT_ACTION_STRING)

    }

    /**
     *
     * Process any incoming text based on the current state of the chatbot for participant
     * and expected response for the current question
     *
     * @param participant participant database object, must contain fields chatId, currentQuestion and currentState
     * @param answerText the text that is supposed to be processed
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}|{returnCode: *, data: *}>}
     */
    static async processAnswer(participant, answerText){

        // Error handling to ensure that the participant has the required fields
        if(!participant){
            return ReturnMethods.returnFailure("AHandler: Participant not available")
        }
        if(!("chatId" in participant)){
            return ReturnMethods.returnFailure("AHandler: Chat ID not found")
        }
        if(!("currentQuestion" in participant)){
            return ReturnMethods.returnFailure("AHandler: Current question not found")
        }
        if(!("currentState" in participant)){
            return ReturnMethods.returnFailure("AHandler: Current state not found")
        }
        // Process an answer only if an answer is expected
        if(!["awaitingAnswer"].includes(participant.currentState)){
            return ReturnMethods.returnSuccess(DevConfig.NO_RESPONSE_STRING);
        }

        let currentQuestion = participant.currentQuestion;

        // If answer is expected
        if(participant.currentState === 'awaitingAnswer'){

            switch(currentQuestion["qType"]){
                // If the expected answer is one from a list of possible answers
                case 'singleChoice':
                    // Process answer if it is one of the valid options

                    try{
                        if(currentQuestion.options.includes(answerText)){
                            // Complete answering
                            let finishObj = await this.finishAnswering(participant.chatId, currentQuestion, answerText);
                            // Return failure or trigger the next action
                            return finishObj;
                        } else {
                            return ReturnMethods.returnPartialFailure(config.phrases.answerValidation.option[participant.parameters.language], DevConfig.REPEAT_QUESTION_STRING)
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
                            await participants.addToCurrentAnswer(participant.chatId, answerText);
                            return ReturnMethods.returnSuccess(DevConfig.NO_RESPONSE_STRING);

                        } else if(answerText === config.phrases.keyboards.terminateMultipleChoice[participant.parameters.language]) {
                            // If participant is finished answering
                            let finishObj = await this.finishAnswering(participant.chatId, currentQuestion, participant.currentAnswer);
                            // Return failure or trigger the next action
                            return finishObj;

                        } else {
                            // Repeat the question
                            return ReturnMethods.returnPartialFailure(config.phrases.answerValidation.option[participant.parameters.language], DevConfig.REPEAT_QUESTION_STRING)
                        }
                    } catch(e){
                        return ReturnMethods.returnFailure("AHandler: MC question options or response phrase not found");
                    }


                // Question with free text input
                case 'freeform':
                    // Complete answering
                    let finishObj = await this.finishAnswering(participant.chatId, currentQuestion, answerText);
                    // Return failure or trigger the next action
                    return finishObj;

                default:
                    return ReturnMethods.returnFailure("AHandler: Question is missing valid question type: " + currentQuestion.qId);
            }
        }
    }

}

module.exports = AnswerHandler;
