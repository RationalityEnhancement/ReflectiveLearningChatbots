const participants = require("./apiControllers/participantApiController");
const experiments = require("./apiControllers/experimentApiController");
const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();
const ReturnMethods = require('./returnMethods');
const ConfigParser = require('./configParser')
const Communicator = require('./communicator')
const QuestionHandler = require('./questionHandler');
const {getByUniqueId} = require("./apiControllers/idMapApiController");
const ExperimentUtils = require("./experimentUtils");
const StageHandler = require('./stageHandler')
const moment = require('moment')
const debugs = require('./apiControllers/debugInfoApiController');
const answers = require('./apiControllers/answerApiController');
const transcripts = require('./apiControllers/transcriptApiController');


/**
 * Action handler deals with the processing of actions
 *
 */

let validateActionObject = (actionObj) => {
    let aType = actionObj.aType;
    let args = actionObj.args;

    let validActions = DevConfig.VALID_ACTIONS_ARGS;

    if(!(aType in validActions)) {
        return ReturnMethods.returnFailure("ActHandler: Invalid action type: " + aType);
    }

    if(!Array.isArray(args)) {
        return ReturnMethods.returnFailure("ActHandler: args must be array");
    }

    let requiredArgs = validActions[aType];
    if(args.length !== requiredArgs) {
        return ReturnMethods.returnFailure(`ActHandler: aType ${aType} requires ${requiredArgs} args`);
    }

    if(args.some(e => typeof e === "undefined")) {
        return ReturnMethods.returnFailure("ActHandler: args cannot be undefined");
    }

    return ReturnMethods.returnSuccess(true);

}
module.exports.validateActionObject = validateActionObject;

/**
 *
 * Processes a single action object of the form
 * {
 *     aType : String,
 *     args : [String]
 * }
 *
 * @param bot Telegram bot instance
 * @param config
 * @param participant updated participant object
 * @param actionObj action that is to be sent
 * @param from string denoting where the action was called from - for debugging purposes
 * @returns {Promise<{returnCode: *, data: *}>}
 *
 */
let processAction = async(bot, config, participant, actionObj, from="undefined") => {
    // Get the participant
    if(!participant){
        return ReturnMethods.returnFailure("ActHandler: Participant not received")
    }
    let validateActionObj = validateActionObject(actionObj);
    if(validateActionObj.returnCode === DevConfig.FAILURE_CODE) {
        return ReturnMethods.returnFailure("ActHandler: cannot validate action:\n"+validateActionObj.data);
    }

    // Get chat ID
    let secretMap = await getByUniqueId(config.experimentId, participant.uniqueId);
    if(!secretMap){
        return ReturnMethods.returnFailure("ActHandler: Unable to find participant " + participant.uniqueId
            + " chat ID while processing action");
    }
    let userInfo;
    try{
        userInfo = await bot.telegram.getChat(secretMap.chatId);
    } catch(e) {
        return ReturnMethods.returnFailure("ActHandler: Unable to find participant " + participant.uniqueId +
            " chat while processing action\n"
            + e.message + "\n" + e.stack);
    }
    participant["firstName"] = userInfo.first_name;


    if(config.debug.saveDebugInfo){
        // Save action that will be performed
        let saveActionObj = {
            infoType: "action",
            scheduledOperations: participant.scheduledOperations,
            parameters: participant.parameters,
            stages: participant.stages,
            info: [actionObj.aType, ...actionObj.args],
            timeStamp: moment.tz(participant.parameters.timezone).format(),
            from: from
        }

        debugs.addDebugInfo(participant.uniqueId, saveActionObj)
            .catch(err => {
                console.log("ActHandler: could not add save action obj - " + actionObj.aType + " - " + participant.uniqueId
                    + "\n" + err.message + "\n" + err.stack);
            });
    }


    switch(actionObj.aType){
        // Assign participant to condition based on assignment scheme specified in config file
        case "assignToCondition":
            let experiment;
            try{
                experiment = await experiments.get(config.experimentId);
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler - assign: could not fetch experiment " + config.experimentId)
            }
            // Get the PID, if present, otherwise, use participant unique ID
            let ID = participant.parameters.PID;
            if(!ID) ID = participant.uniqueId;
            let scheme = config.assignmentScheme;

            // Get the current state of experiment conditions
            let conditionRatios = experiment["relConditionSizes"];
            let currentAssignments = experiment["conditionAssignments"];
            let conditionNames = experiment["experimentConditions"];

            // Assign participant to condition
            let conditionObj = ExperimentUtils.assignToCondition(ID, config.conditionMapping, conditionRatios, currentAssignments, scheme);
            if(conditionObj.returnCode === DevConfig.FAILURE_CODE){
                return ReturnMethods.returnFailure(
                    "ActHandler:Unable to assignt to condition:\n"+ conditionObj.data
                );
            }

            // Save assigned condition to participant
            let assignedConditionIdx = conditionObj.data;
            let conditionName = conditionNames[assignedConditionIdx];
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) You have been assigned to condition: " + conditionName, !config.debug.messageDelay);
            }
            let newPartC;
            try{
                newPartC = await participants.updateFields(participant.uniqueId, {
                    conditionIdx: assignedConditionIdx,
                    conditionName: conditionName
                });
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: Unable to update condition fields");
            }

            // Update experiment condition status
            try{
                await experiments.updateConditionAssignees(config.experimentId, assignedConditionIdx, 1);
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: Unable to update experiment condition numbers");
            }
            return ReturnMethods.returnSuccess(newPartC);
        // Save current answer to a variable
        case "saveAnswerTo" :
            // First argument is name of the variable to save to
            let varName = actionObj.args[0];
            if(typeof varName !== "string"){
                return ReturnMethods.returnFailure("ActHandler - saveAnswerTo: Variable name must be string: " + varName);
            }

            // Current answer must exist to save answer
            if(!participant.currentAnswer
                || !Array.isArray(participant.currentAnswer)
                || participant.currentAnswer.length === 0){
                return ReturnMethods.returnFailure("ActHandler - saveAnswerTo: Current answer not available to save");
            }
            let paramType;
            try{
                paramType = participant.parameterTypes[varName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler - saveAnswerTo: parameterTypes field not present in participant obj");
            }
            let returnVal, newPartSave, savedVal;

            if(DevConfig.RESERVED_VARIABLES.includes(varName)){
                return ReturnMethods.returnFailure("ActHandler - saveAnswerTo: Cannot update reserved variable!");
            }
            // Check which data type the target parameter is
            switch(paramType){
                // For string and string array, no conversion required, since current Answer is already string array
                case DevConfig.OPERAND_TYPES.STRING:
                    try{
                        newPartSave = await participants.updateParameter(participant.uniqueId, varName, participant.currentAnswer[0]);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler - saveAnswerTo(str): could not update participant params");
                    }
                    returnVal = newPartSave;
                    savedVal = participant.currentAnswer[0];
                    break;
                case DevConfig.OPERAND_TYPES.STRING_ARRAY:
                    try{
                        newPartSave = await participants.updateParameter(participant.uniqueId, varName, participant.currentAnswer);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler - saveAnswerTo(strArr): could not update participant params");
                    }
                    returnVal = newPartSave;
                    savedVal = participant.currentAnswer;
                    break;
                // Save to number variable if first entry can be parsed to number
                case DevConfig.OPERAND_TYPES.NUMBER:
                    let conversionObj = ConfigParser.getNumberFromString(participant.currentAnswer[0]);
                    if(conversionObj.returnCode === DevConfig.FAILURE_CODE){
                        return ReturnMethods.returnFailure(
                            "ActHandler:Unable to parse number for saveAnswerTo:\n"+ conversionObj.data
                        );
                    }
                    try{
                        newPartSave = await participants.updateParameter(participant.uniqueId, varName, conversionObj.data);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler - saveAnswerTo(num): could not update participant params");
                    }
                    returnVal = newPartSave;
                    savedVal = conversionObj.data;
                    break;
                default:
                    return ReturnMethods.returnFailure("ActHandler - saveAnswerTo: Cannot save to var of type " + paramType);
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) Answer "
                    + savedVal.toString() + " saved to " + varName, true);
            }
            return ReturnMethods.returnSuccess(returnVal);
        // Add current answer (string, number) to array variable (strArr, numArr)
        case "addAnswerTo" :
            // First argument is the answer to save it to
            let aVarName = actionObj.args[0];
            if(typeof aVarName !== "string"){
                return ReturnMethods.returnFailure("ActHandler - addAnswerTo: Variable name must be string: " + aVarName);
            }

            // Current answer cannot be empty to save it to parameter
            if(!participant.currentAnswer
                || !Array.isArray(participant.currentAnswer)
                || participant.currentAnswer.length === 0){
                return ReturnMethods.returnFailure("ActHandler - addAnswerTo: Current answer not available to save");
            }
            let aParamType;
            let aReturnVal, aSavedVal;
            let newPartAdd;
            try{
                aParamType = participant.parameterTypes[aVarName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler - addAnswerTo: parameterTypes field not present in participant obj");
            }

            if(DevConfig.RESERVED_VARIABLES.includes(aVarName)){
                return ReturnMethods.returnFailure("ActHandler - addAnswerTo: Cannot update reserved variable!");
            }
            // Process only when the target parameter is strArr or numArr
            switch(aParamType){
                case DevConfig.OPERAND_TYPES.NUMBER_ARRAY:
                    // Get answer parsed as number
                    let conversionObj = ConfigParser.getNumberFromString(participant.currentAnswer[0]);
                    if(conversionObj.returnCode === DevConfig.FAILURE_CODE){
                        return ReturnMethods.returnFailure(
                            "ActHandler:Unable to parse number for addAnswerTo:\n"+ conversionObj.data
                        );
                    }
                    // Update the array parameter
                    try{
                        newPartAdd = await participants.addToArrParameter(participant.uniqueId, aVarName, conversionObj.data);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler - addAnswerTo(numArr): could not add to participant params");
                    }
                    aReturnVal = newPartAdd;
                    aSavedVal = conversionObj.data;
                    break;
                case DevConfig.OPERAND_TYPES.STRING_ARRAY:
                    // Update the array parameter
                    try{
                        for(const el of participant.currentAnswer) {
                            newPartAdd = await participants.addToArrParameter(participant.uniqueId, aVarName, el);
                        }
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler - addAnswerTo(strArr): could not add to participant params");
                    }
                    aReturnVal = newPartAdd;
                    aSavedVal = participant.currentAnswer;
                    break;
                default:
                    return ReturnMethods.returnFailure("ActHandler: Cannot add to var of type " + aParamType);
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) Answer "
                    + aSavedVal.toString() + " added to " + aVarName, true);
            }
            return ReturnMethods.returnSuccess(aReturnVal);
        // Save current answer to a variable
        case "saveOptionIdxTo" :
            // First argument is name of the variable to save to
            let oVarName = actionObj.args[0];
            if(typeof oVarName !== "string"){
                return ReturnMethods.returnFailure("ActHandler - saveOptionIdxTo: Variable name must be string: " + oVarName);
            }

            // Current answer must exist to save answer
            if(!participant.currentAnswer
                || !Array.isArray(participant.currentAnswer)
                || participant.currentAnswer.length === 0){
                return ReturnMethods.returnFailure("ActHandler - saveOptionIdxTo: Current answer not available to save");
            }

            // Current question must be of type singleChoice or multiChoice and have options
            if(!["singleChoice", "multiChoice"].includes(participant.currentQuestion.qType)){
                return ReturnMethods.returnFailure("ActHandler - saveOptionIdxTo: Current question must be choice question");
            }
            if(!participant.currentQuestion.options || participant.currentQuestion.options.length === 0){
                return ReturnMethods.returnFailure("ActHandler - saveOptionIdxTo: Current question must have options array");
            }
            let options = participant.currentQuestion.options;

            let oParamType, oSavedVal;
            let newPartSaveOpt;
            try{
                oParamType = participant.parameterTypes[oVarName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler - saveOptionIdxTo: parameterTypes field not present in participant obj");
            }
            let oReturnVal;

            if(DevConfig.RESERVED_VARIABLES.includes(oVarName)){
                return ReturnMethods.returnFailure("ActHandler - saveOptionIdxTo: Cannot update reserved variable!");
            }
            // Check which data type the target parameter is
            switch(oParamType){
                // Can only save to number or number array types
                case DevConfig.OPERAND_TYPES.NUMBER:
                    let answer = participant.currentAnswer[0];
                    let idx = options.indexOf(answer)
                    try{
                        newPartSaveOpt = await participants.updateParameter(participant.uniqueId, oVarName, idx);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler - saveOptionIdxTo(num): could not update participant params");
                    }
                    oReturnVal = newPartSaveOpt;
                    oSavedVal = idx
                    break;
                case DevConfig.OPERAND_TYPES.NUMBER_ARRAY:
                    let idxArr = []
                    for(const answer of participant.currentAnswer){
                        idxArr.push(options.indexOf(answer))
                    }
                    try{
                        newPartSaveOpt = await participants.updateParameter(participant.uniqueId, oVarName, idxArr);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler - saveOptionIdxTo(numArr): could not update participant params");
                    }
                    oReturnVal = newPartSaveOpt;
                    oSavedVal = idxArr;
                    break;
                default:
                    return ReturnMethods.returnFailure(
                        "ActHandler: Cannot save option index to var of type " + oParamType
                    );
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) Idx "
                    + oSavedVal.toString() + " saved to " + oVarName, true);
            }
            return ReturnMethods.returnSuccess(oReturnVal);
        // Set the value of a boolean variable to true or false
        case "setBooleanVar" :
            // First argument must be the name of the variable
            let bVarName = actionObj.args[0];
            if(typeof bVarName !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Variable name (arg1) must be string");
            }
            // Second argument must be a boolean token
            let newVal = actionObj.args[1];
            if(typeof newVal !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Boolean token (arg2) must be string");
            }
            let bParamType, newPartSetBool;
            try{
                bParamType = participant.parameterTypes[bVarName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: variable not found : " + bVarName);
            }
            if(DevConfig.RESERVED_VARIABLES.includes(bVarName)){
                return ReturnMethods.returnFailure("ActHandler: Cannot update reserved variable!");
            }

            // Process only if target variable is boolean type
            if(bParamType !== DevConfig.OPERAND_TYPES.BOOLEAN){
                return ReturnMethods.returnFailure(
                    "ActHandler: Can save boolean only to boolean param. Variable "
                    + bVarName + " is type " + bParamType)
            }


            // Parse the boolean token
            let boolValObj = ConfigParser.parseBooleanToken(newVal);
            if(boolValObj.returnCode === DevConfig.FAILURE_CODE){
                return ReturnMethods.returnFailure("ActHandler - setBooleanVar: Unable to parse boolean token")
            }
            let boolVal = boolValObj.data;

            // Update the parameter with the new value
            try{
                newPartSetBool = await participants.updateParameter(participant.uniqueId, bVarName, boolVal);
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler - setBooleanVar: could not update participant params");
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) Var "
                    + bVarName + " set to " + boolVal, true);
            }
            return ReturnMethods.returnSuccess(newPartSetBool);
        // Clear the value of an array parameter
        case "clearVar" :
            // First argument must be name of target variable
            let cVarName = actionObj.args[0];
            if(typeof cVarName !== "string"){
                return ReturnMethods.returnFailure("ActHandler - clearVar: Variable name must be string: " + cVarName);
            }

            let cParamType, newPartClear;
            try{
                cParamType = participant.parameterTypes[cVarName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler - clearVar: parameterTypes field not present in participant obj");
            }
            if(DevConfig.RESERVED_VARIABLES.includes(cVarName)){
                return ReturnMethods.returnFailure("ActHandler - clearVar: Cannot update reserved variable!");
            }
            // If type is unrecognized (mostly when varname doesnt exist)
            if(!Object.values(DevConfig.OPERAND_TYPES).includes(cParamType)){
                return ReturnMethods.returnFailure("ActHandler - clearVar: did not recognize variable type " + cParamType + " of variable " + cVarName);
            }

            // Clear the parameter value
            try{
                await participants.clearParamValue(participant.uniqueId, cVarName);
                // Have to fetch the participant again to update parameter from undefined in returned document
                newPartClear = await participants.get(participant.uniqueId)
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: could not clear participant parameter " + cVarName);
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) Variable "
                    + cVarName + " cleared", true);
            }
            return ReturnMethods.returnSuccess(newPartClear);
        // Add a value to a number variable
        case "addValueTo" :
            // First argument must be the name of the variable
            let addVarName = actionObj.args[0];
            if(typeof addVarName !== "string"){
                return ReturnMethods.returnFailure("ActHandler - addValueTo: Variable name (arg1) must be string");
            }
            // Second argument must be a number token
            let addVal = actionObj.args[1];
            if(typeof addVal !== "string"){
                return ReturnMethods.returnFailure("ActHandler - addValueTo: Number token (arg2) must be string");
            }
            let addParamType, newPartAddVal;
            try{
                addParamType = participant.parameterTypes[addVarName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler - addValueTo: variable not found : " + addVarName);
            }
            if(DevConfig.RESERVED_VARIABLES.includes(addVarName)){
                return ReturnMethods.returnFailure("ActHandler - addValueTo: Cannot update reserved variable!");
            }

            // Process only if target variable is number type
            if(addParamType !== DevConfig.OPERAND_TYPES.NUMBER){
                return ReturnMethods.returnFailure("ActHandler: Can add number only to number type")
            }

            // Parse the number token
            let addValObj = ConfigParser.parseNumberToken(addVal);
            if(addValObj.returnCode === DevConfig.FAILURE_CODE){
                return ReturnMethods.returnFailure("ActHandler - addValueTo: Unable to parse number token")
            }

            // If parameter hasn't been set already, initialize it
            let newNumVal;
            if(typeof participant.parameters[addVarName] === "undefined"){
                newNumVal = 0;
            } else {
                newNumVal = participant.parameters[addVarName];
            }
            newNumVal += addValObj.data;

            // Update the parameter with the new value
            try{
                newPartAddVal = await participants.updateParameter(participant.uniqueId, addVarName, newNumVal);
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler - addValueTo: could not update participant params");
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) "
                    + newNumVal + " added to " + addVarName, true);
            }
            return ReturnMethods.returnSuccess(newPartAddVal);
        case "startStage" :
            // First argument must be the name of the stage
            let startStage = actionObj.args[0];
            if(typeof startStage !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Stage name (arg1) must be string");
            }

            let newPartStage;
            // Start the given stage
            let startStageObj = await StageHandler.startStage(bot, participant, startStage, config);
            if(startStageObj.returnCode === DevConfig.FAILURE_CODE){
                return ReturnMethods.returnFailure(
                    "ActHandler:Unable to start stage:\n"+ startStageObj.data
                );
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) "
                    + startStageObj.data + " stage started.", true);
            }
            try{
                newPartStage = await participants.get(participant.uniqueId)
            } catch(err){
                return ReturnMethods.returnFailure(
                    "ActHandler:Unable to fetch participant again after starting stage:\n" +
                    err.message + "\n" + err.stack);
            }
            return ReturnMethods.returnSuccess(newPartStage);

        case "incrementStageDay" :
            // No arguments

            let incStageObj = await StageHandler.updateStageDay(bot, participant.uniqueId, config);
            if(incStageObj.returnCode === DevConfig.FAILURE_CODE){
                return ReturnMethods.returnFailure(
                    "ActHandler:Unable to update stage day:\n"+ incStageObj.data
                );
            }
            if(config.debug.actionMessages){
                let message;
                if(typeof incStageObj.data === "string"){
                    message = "New stage " + incStageObj.data+ " has been started at day 1"
                } else if(incStageObj.data === -1){
                    message = "Final stage terminated, experiment has been ended";
                } else {
                    message = "Stage " + participant.stages.stageName + " updated to day " + incStageObj.data;
                }
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) "
                    + message, true);
                // Send the participant a message that the experiment has ended.

            }
            // Create a new node in the linked list for debug infos and answers so that the list doesn't grow too large
            await debugs.addNode(participant.uniqueId);
            await answers.addNode(participant.uniqueId);
            await transcripts.addNode(participant.uniqueId);

            if(incStageObj.data === -1){
                for(let i = 0; i < DevConfig.SEND_MESSAGE_ATTEMPTS; i++){
                    try{
                        await Communicator.sendMessage(bot, participant, secretMap.chatId,
                            config.phrases.experiment.endExperiment[participant.parameters.language], !config.debug.messageDelay)
                        break;
                    } catch(e){
                        return ReturnMethods.returnFailure("AHandler: Unable to send end exp message:\n"
                            + e.message + "\n" + e.stack)
                    }
                }
            }
            let newPartInc;
            try{
                newPartInc = await participants.get(participant.uniqueId)
            } catch(err){
                return ReturnMethods.returnFailure(
                    "ActHandler:Unable to fetch participant again after incrementing stage day:\n" +
                    err.message + "\n" + err.stack);
            }
            return ReturnMethods.returnSuccess(newPartInc);
        // End the experiment simply by updating the state and cancelling all operations
        case "endExperiment" :
            let endReturnObj = await StageHandler.endExperiment(participant.uniqueId);
            if(endReturnObj.returnCode === DevConfig.FAILURE_CODE){
                return ReturnMethods.returnFailure(
                    "ActHandler:Unable to end experiment:\n"+ endReturnObj.data
                );
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) Experiment " +
                    "successfully ended, all operations cancelled."
                    , true);
            }

            // Send a message that the experiment has been ended
            for(let i = 0; i < DevConfig.SEND_MESSAGE_ATTEMPTS; i++){
                try{
                    await Communicator.sendMessage(bot, participant, secretMap.chatId,
                        config.phrases.experiment.endExperiment[participant.parameters.language], !config.debug.messageDelay)
                    break;
                } catch(e){
                    return ReturnMethods.returnFailure("AHandler: Unable to send end exp message:\n"
                        + e.message + "\n" + e.stack)
                }
            }

            let newPartEnd;
            try{
                newPartEnd = await participants.get(participant.uniqueId)
            } catch(err){
                return ReturnMethods.returnFailure(
                    "ActHandler:Unable to fetch participant again after incrementing stage day:\n" +
                    err.message + "\n" + err.stack);
            }
            return ReturnMethods.returnSuccess(newPartEnd);

        default:
            return ReturnMethods.returnFailure("LHandler: aType not recognized");
    }
}
module.exports.processAction = processAction;

