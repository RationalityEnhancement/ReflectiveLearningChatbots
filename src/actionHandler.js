const participants = require("./apiControllers/participantApiController");
const experiments = require("./apiControllers/experimentApiController");
const DevConfig = require('../json/devConfig.json');
const ReturnMethods = require('./returnMethods');
const ConfigParser = require('./configParser')
const Communicator = require('./communicator')
const QuestionHandler = require('./questionHandler');
const {getByUniqueId} = require("./apiControllers/idMapApiController");
const ExperimentUtils = require("./experimentUtils");
const PIDtoConditionMap = require("../json/PIDCondMap.json");

/**
 * Action handler deals with the processing of actions
 *
 */

let validateActionObject = (actionObj) => {
    let aType = actionObj.aType;
    let args = actionObj.args;

    let validActions = DevConfig.VALID_ACTIONS_ARGS;

    if(!(aType in validActions)) return false;

    if(!Array.isArray(args)) return false;

    let requiredArgs = validActions[aType];
    if(args.length !== requiredArgs) return false;

    if(args.some(e => typeof e === "undefined")) return false;

    return true;

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
 * @param participant updated participant object
 * @param actionObj action that is to be sent
 * @returns {Promise<{returnCode: *, data: *}>}
 *
 */
let processAction = async(bot, config, participant, actionObj) => {
    // Get the participant
    if(!participant){
        return ReturnMethods.returnFailure("ActHandler: Participant not received")
    }
    if(participant.currentState !== "answerReceived"){
        return ReturnMethods.returnFailure("ActHandler: Can process next steps only after answer received")
    }
    if(!validateActionObject(actionObj)) {
        return ReturnMethods.returnFailure("ActHandler: Action is not valid")
    }

    // Get chat ID
    let secretMap = await getByUniqueId(config.experimentId, participant.uniqueId);
    if(!secretMap){
        return ReturnMethods.returnFailure("LHandler: Unable to find participant chat ID while processing next");
    }

    let userInfo = await bot.telegram.getChat(secretMap.chatId);
    participant["firstName"] = userInfo.first_name;

    switch(actionObj.aType){
        // Schedule all questions specified for given condition in config file
        case "scheduleQuestions":
            const ScheduleHandler = require("./scheduleHandler");

            // Debug to schedule all sets of scheduled questions in X minute intervals from now
            if(config.debug.developer){
              let nowDateObj = ExperimentUtils.getNowDateObject(participant.parameters.timezone);
              if(nowDateObj.returnCode === DevConfig.FAILURE_CODE){
                console.error(nowDateObj.data);
              }
              let qHandler = new QuestionHandler(config);
              let schQObj = qHandler.getScheduledQuestions(participant.conditionName);
              if(schQObj.returnCode === DevConfig.FAILURE_CODE){
                return schQObj;
              }
              ScheduleHandler.overrideScheduleForIntervals(schQObj.data, nowDateObj.data, 1);
            }

            // Schedule all questions
            let returnObj = await ScheduleHandler.scheduleAllQuestions(bot, participant.uniqueId, config, config.debug.experimenter);
            if(returnObj.returnCode === DevConfig.FAILURE_CODE){
                return returnObj;
            } else if(returnObj.returnCode === DevConfig.PARTIAL_FAILURE_CODE){
                return ReturnMethods.returnFailure(returnObj.failData);
            }
            return returnObj;
        // Assign participant to condition based on assignment scheme specified in config file
        case "assignToCondition":
            let experiment;
            try{
                experiment = await experiments.get(config.experimentId);
            } catch(err){
                return ReturnMethods.returnFailure("LHandler: could not fetch experiment " + config.experimentId)
            }
            // Get the PID, if present, otherwise, use participant unique ID
            let ID = participant.parameters.PID;
            if(!ID) ID = participant.uniqueId;
            let scheme = config.assignmentScheme;

            // Get the current state of experiment conditions
            let conditionRatios = experiment["conditionAssignments"];
            let currentAssignments = experiment["currentlyAssignedToCondition"];
            let conditionNames = experiment["experimentConditions"];

            // Assign participant to condition
            let conditionObj = ExperimentUtils.assignToCondition(ID, PIDtoConditionMap, conditionRatios, currentAssignments, scheme);
            if(conditionObj.returnCode === DevConfig.FAILURE_CODE){
                return conditionObj;
            }

            // Save assigned condition to participant
            let assignedConditionIdx = conditionObj.data;
            let conditionName = conditionNames[assignedConditionIdx];
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) You have been assigned to condition: " + conditionName, !config.debug.messageDelay);
            }
            try{
                await participants.updateField(participant.uniqueId, "conditionIdx", assignedConditionIdx);
                await participants.updateField(participant.uniqueId, "conditionName", conditionName);
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: Unable to update condition fields");
            }

            // Update experiment condition status
            try{
                await experiments.updateConditionAssignees(config.experimentId, assignedConditionIdx, 1);
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: Unable to update experiment condition numbers");
            }
            return ReturnMethods.returnSuccess(conditionName);
        // Save current answer to a variable
        case "saveAnswerTo" :
            // First argument is name of the variable to save to
            let varName = actionObj.args[0];
            if(typeof varName !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Variable name must be string");
            }

            // Current answer must exist to save answer
            if(!participant.currentAnswer
                || !Array.isArray(participant.currentAnswer)
                || participant.currentAnswer.length === 0){
                return ReturnMethods.returnFailure("ActHandler: Current answer not available to save");
            }
            let paramType;
            try{
                paramType = participant.parameterTypes[varName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: parameterTypes field not present in participant obj");
            }
            let returnVal;

            if(DevConfig.RESERVED_VARIABLES.includes(varName)){
                return ReturnMethods.returnFailure("ActHandler: Cannot update reserved variable!");
            }
            // Check which data type the target parameter is
            switch(paramType){
                // For string and string array, no conversion required, since current Answer is already string array
                case DevConfig.OPERAND_TYPES.STRING:
                    try{
                        await participants.updateParameter(participant.uniqueId, varName, participant.currentAnswer[0]);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler: could not update participant params");
                    }
                    returnVal = participant.currentAnswer[0];
                    break;
                case DevConfig.OPERAND_TYPES.STRING_ARRAY:
                    try{
                        await participants.updateParameter(participant.uniqueId, varName, participant.currentAnswer);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler: could not update participant params");
                    }
                    returnVal = participant.currentAnswer;
                    break;
                // Save to number variable if first entry can be parsed to number
                case DevConfig.OPERAND_TYPES.NUMBER:
                    let conversionObj = ConfigParser.getNumberFromString(participant.currentAnswer[0]);
                    if(conversionObj.returnCode === DevConfig.FAILURE_CODE){
                        return conversionObj;
                    }
                    try{
                        await participants.updateParameter(participant.uniqueId, varName, conversionObj.data);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler: could not update participant params");
                    }
                    returnVal = conversionObj.data;
                    break;
                default:
                    return ReturnMethods.returnFailure("ActHandler: Cannot save to var of type " + paramType);
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) Answer "
                    + returnVal.toString() + " saved to " + varName, true);
            }
            return ReturnMethods.returnSuccess(returnVal);
        // Add current answer (string, number) to array variable (strArr, numArr)
        case "addAnswerTo" :
            // First argument is the answer to save it to
            let aVarName = actionObj.args[0];
            if(typeof aVarName !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Variable name must be string");
            }

            // Current answer cannot be empty to save it to parameter
            if(!participant.currentAnswer
                || !Array.isArray(participant.currentAnswer)
                || participant.currentAnswer.length === 0){
                return ReturnMethods.returnFailure("ActHandler: Current answer not available to save");
            }
            let aParamType;
            let aReturnVal;
            try{
                aParamType = participant.parameterTypes[aVarName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: parameterTypes field not present in participant obj");
            }

            if(DevConfig.RESERVED_VARIABLES.includes(aVarName)){
                return ReturnMethods.returnFailure("ActHandler: Cannot update reserved variable!");
            }
            // Process only when the target parameter is strArr or numArr
            switch(aParamType){
                case DevConfig.OPERAND_TYPES.NUMBER_ARRAY:
                    // Get answer parsed as number
                    let conversionObj = ConfigParser.getNumberFromString(participant.currentAnswer[0]);
                    if(conversionObj.returnCode === DevConfig.FAILURE_CODE){
                        return conversionObj;
                    }
                    // Update the array parameter
                    try{
                        await participants.addToArrParameter(participant.uniqueId, aVarName, conversionObj.data);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler: could not add to participant params");
                    }
                    aReturnVal = conversionObj.data;
                    break;
                case DevConfig.OPERAND_TYPES.STRING_ARRAY:
                    // Update the array parameter
                    try{
                        await participants.addToArrParameter(participant.uniqueId, aVarName, participant.currentAnswer[0]);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler: could not add to participant params");
                    }
                    aReturnVal = participant.currentAnswer[0];
                    break;
                default:
                    return ReturnMethods.returnFailure("ActHandler: Cannot add to var of type " + aParamType);
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) Answer "
                    + aReturnVal.toString() + " added to " + aVarName, true);
            }
            return ReturnMethods.returnSuccess(aReturnVal);
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
            let bParamType;
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
                return ReturnMethods.returnFailure("ActHandler: Can save boolean only to boolean param")
            }


            // Parse the boolean token
            let boolValObj = ConfigParser.parseBooleanToken(newVal);
            if(boolValObj.returnCode === DevConfig.FAILURE_CODE){
                return ReturnMethods.returnFailure("ActHandler: Unable to parse boolean token")
            }
            let boolVal = boolValObj.data;

            // Update the parameter with the new value
            try{
                await participants.updateParameter(participant.uniqueId, bVarName, boolVal);
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: could not update participant params");
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) Var "
                    + bVarName + " set to " + boolVal, true);
            }
            return ReturnMethods.returnSuccess(boolVal);
        // Clear the value of an array parameter
        case "clearVar" :
            // First argument must be name of target variable
            let cVarName = actionObj.args[0];
            if(typeof cVarName !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Variable name must be string");
            }

            let cParamType;
            try{
                cParamType = participant.parameterTypes[cVarName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: parameterTypes field not present in participant obj");
            }
            if(DevConfig.RESERVED_VARIABLES.includes(cVarName)){
                return ReturnMethods.returnFailure("ActHandler: Cannot update reserved variable!");
            }
            // If type is unrecognized (mostly when varname doesnt exist)
            if(!Object.values(DevConfig.OPERAND_TYPES).includes(cParamType)){
                return ReturnMethods.returnFailure("ActHandler: did not recognize variable type " + cParamType);
            }

            // Clear the parameter value
            try{
                await participants.clearParamValue(participant.uniqueId, cVarName);
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: could not clear participant parameter " + cVarName);
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) Variable "
                    + cVarName + " cleared", true);
            }
            return ReturnMethods.returnSuccess([]);
        // Add a value to a number variable
        case "addValueTo" :
            // First argument must be the name of the variable
            let addVarName = actionObj.args[0];
            if(typeof addVarName !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Variable name (arg1) must be string");
            }
            // Second argument must be a number token
            let addVal = actionObj.args[1];
            if(typeof addVal !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Number token (arg2) must be string");
            }
            let addParamType;
            try{
                addParamType = participant.parameterTypes[addVarName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: variable not found : " + addVarName);
            }
            if(DevConfig.RESERVED_VARIABLES.includes(addVarName)){
                return ReturnMethods.returnFailure("ActHandler: Cannot update reserved variable!");
            }

            // Process only if target variable is number type
            if(addParamType !== DevConfig.OPERAND_TYPES.NUMBER){
                return ReturnMethods.returnFailure("ActHandler: Can add number only to number type")
            }

            // Parse the number token
            let addValObj = ConfigParser.parseNumberToken(addVal);
            if(addValObj.returnCode === DevConfig.FAILURE_CODE){
                return ReturnMethods.returnFailure("ActHandler: Unable to parse number token")
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
                await participants.updateParameter(participant.uniqueId, addVarName, newNumVal);
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: could not update participant params");
            }
            if(config.debug.actionMessages){
                await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) "
                    + newNumVal + " added to " + addVarName, true);
            }
            return ReturnMethods.returnSuccess(newNumVal);
        default:
            return ReturnMethods.returnFailure("LHandler: aType not recognized");
    }
}
module.exports.processAction = processAction;

