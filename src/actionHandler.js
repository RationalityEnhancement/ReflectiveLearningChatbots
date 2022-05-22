const participants = require("./apiControllers/participantApiController");
const experiments = require("./apiControllers/experimentApiController");
const DevConfig = require('../json/devConfig.json');
const ReturnMethods = require('./returnMethods');
const QuestionHandler = require('./questionHandler');
const ConfigParser = require('./configParser')
const Communicator = require('./communicator')
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
 *
 *
 * {
 *     aType : String,
 *     args : [String]
 * }
 *
 * @param bot Telegram bot instance
 * @param participant
 * @param actionObj
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
    // console.log(participant);

    let debugExp = !!config.debugExp;

    // Get chat ID
    let secretMap = await getByUniqueId(config.experimentId, participant.uniqueId);
    if(!secretMap){
        return ReturnMethods.returnFailure("LHandler: Unable to find participant chat ID while processing next");
    }

    let userInfo = await bot.telegram.getChat(secretMap.chatId);
    participant["firstName"] = userInfo.first_name;

    // Process next action, if any
    switch(actionObj.aType){
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
            let returnObj = await ScheduleHandler.scheduleAllQuestions(bot, participant.uniqueId, config, debugExp);
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
            if(!ID) ID = config.uniqueId;
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
            await participants.updateField(config.uniqueId, "conditionIdx", assignedConditionIdx);
            await participants.updateField(config.uniqueId, "conditionName", conditionName);
            await experiments.updateConditionAssignees(config.experimentId, assignedConditionIdx, 1);
            break;
        case "saveAnswerTo" :
            let varName = actionObj.args[0];
            if(typeof varName !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Variable name must be string");
            }
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
            switch(paramType){
                case DevConfig.OPERAND_TYPES.STRING:
                    try{
                        await participants.updateParameter(participant.uniqueId, varName, participant.currentAnswer[0]);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler: could not update participant params");
                    }
                    return ReturnMethods.returnSuccess(participant.currentAnswer[0]);
                case DevConfig.OPERAND_TYPES.STRING_ARRAY:
                    try{
                        await participants.updateParameter(participant.uniqueId, varName, participant.currentAnswer);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler: could not update participant params");
                    }
                    return ReturnMethods.returnSuccess(participant.currentAnswer);
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
                    return ReturnMethods.returnSuccess(conversionObj.data);
                default:
                    return ReturnMethods.returnFailure("ActHandler: Cannot save to var of type " + paramType);
            }
        case "addAnswerTo" :
            let aVarName = actionObj.args[0];
            if(typeof aVarName !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Variable name must be string");
            }
            if(!participant.currentAnswer
                || !Array.isArray(participant.currentAnswer)
                || participant.currentAnswer.length === 0){
                return ReturnMethods.returnFailure("ActHandler: Current answer not available to save");
            }
            let aParamType;
            try{
                aParamType = participant.parameterTypes[aVarName];
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: parameterTypes field not present in participant obj");
            }

            switch(aParamType){
                case DevConfig.OPERAND_TYPES.NUMBER_ARRAY:
                    let conversionObj = ConfigParser.getNumberFromString(participant.currentAnswer[0]);
                    if(conversionObj.returnCode === DevConfig.FAILURE_CODE){
                        return conversionObj;
                    }
                    try{
                        await participants.addToArrParameter(participant.uniqueId, aVarName, conversionObj.data);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler: could not add to participant params");
                    }
                    return ReturnMethods.returnSuccess(conversionObj.data);
                case DevConfig.OPERAND_TYPES.STRING_ARRAY:
                    try{
                        await participants.addToArrParameter(participant.uniqueId, aVarName, participant.currentAnswer[0]);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler: could not add to participant params");
                    }
                    return ReturnMethods.returnSuccess(participant.currentAnswer[0]);
                default:
                    return ReturnMethods.returnFailure("ActHandler: Cannot add to var of type " + aParamType);
            }
        case "setBooleanVar" :
            let bVarName = actionObj.args[0];
            if(typeof bVarName !== "string"){
                return ReturnMethods.returnFailure("ActHandler: Variable name (arg1) must be string");
            }
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

            if(bParamType !== DevConfig.OPERAND_TYPES.BOOLEAN){
                return ReturnMethods.returnFailure("ActHandler: Can save boolean only to boolean param")
            }
            let boolValObj = ConfigParser.parseBooleanToken(newVal);
            if(boolValObj.returnCode === DevConfig.FAILURE_CODE){
                return ReturnMethods.returnFailure("ActHandler: Unable to parse boolean token")
            }
            let boolVal = boolValObj.data;
            try{
                await participants.updateParameter(participant.uniqueId, bVarName, boolVal);
            } catch(err){
                return ReturnMethods.returnFailure("ActHandler: could not update participant params");
            }
            return ReturnMethods.returnSuccess(boolVal);
        case "clearArrVar" :
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
            switch(cParamType){
                case DevConfig.OPERAND_TYPES.NUMBER_ARRAY:
                case DevConfig.OPERAND_TYPES.STRING_ARRAY:
                    try{
                        await participants.clearArrParamValue(participant.uniqueId, cVarName);
                    } catch(err){
                        return ReturnMethods.returnFailure("ActHandler: could not clear participant parameter " + cVarName);
                    }
                    return ReturnMethods.returnSuccess([]);
                default:
                    return ReturnMethods.returnFailure("ActHandler: Cannot clear var of type " + cParamType);
            }
        default:
            return ReturnMethods.returnFailure("LHandler: aType not recognized");
    }
}
module.exports.processAction = processAction;

