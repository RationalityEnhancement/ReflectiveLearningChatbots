const ReturnMethods = require('./returnMethods');
const DevConfig = require('../json/devConfig.json');
const participants = require('./apiControllers/participantApiController')
const moment = require('moment-timezone')

/**
 * Stage handler class that takes in a config as a parameter
 *  Purpose of the class is to deal with all things related
 *  to experiment stages
 *
 */

/**
 *
 * Gets the list of stages from the config file along with validation,
 * based on the condition
 *
 * If condition is undefined, expect experimentStages field of config
 * to be a list and not an object with condition names
 *
 * @param config
 * @param conditionName
 * @returns {{returnCode: *, data: *}}
 */
module.exports.getStageList = (config, conditionName) => {
    try{
        if(conditionName && !config.experimentConditions.includes(conditionName)){
            return ReturnMethods.returnFailure("StageHandler: Condition " + conditionName + " doesn't exist")
        }
    } catch(err){
        return ReturnMethods.returnFailure("StageHandler: Config experiment conditions missing")
    }

    let condition;
    if(!conditionName){
        condition = config.experimentStages;
    } else {
        if(!(conditionName in config["experimentStages"])){
            let errorMsg = "StageHandler: Condition " + conditionName + " does not exist in experiment stages!";
            return ReturnMethods.returnFailure(errorMsg)
        }
        condition = config["experimentStages"][conditionName];
    }
    if(!Array.isArray(condition)){
        return ReturnMethods.returnFailure("StageHandler: Experiment stages must be array!")
    }
    if(!condition.every(e => typeof e === "object" && "name" in e)){
        return ReturnMethods.returnFailure("StageHandler: Every experiment stage must be an object with" +
            " at least field 'name'")
    }
    return ReturnMethods.returnSuccess(condition);
}

/**
 *
 * Read the passed in config file to get the length of the days for a given
 * stage name in a given condition
 *
 * Return -1 if no length of days is specified
 *
 * @param config
 * @param conditionName
 * @param stageName
 * @returns {{returnCode: *, data: *}}
 */
module.exports.getStageParam = (config, conditionName, stageName, param) => {

    if(typeof stageName !== "string"){
        return ReturnMethods.returnFailure("StageHandler: stage name must be string");
    }
    let stageListObj = this.getStageList(config, conditionName);
    if(stageListObj.returnCode === DevConfig.FAILURE_CODE){
        return stageListObj;
    }
    let condition = stageListObj.data;

    let curObj;
    for(let i = 0; i < condition.length; i++){
        let curStage = condition[i];
        if(curStage["name"] === stageName){
            curObj = curStage;
            break;
        }
    }
    if(!curObj){
        return ReturnMethods.returnFailure("StageHandler: Stage " + stageName + " doesn't exist!");
    }

    if(curObj[param]){
        if(param === DevConfig.STAGE_PARAMS.LENGTH_DAYS && typeof curObj[param] !== "number"){
            return ReturnMethods.returnFailure("StageHandler: stage length days must be a number")
        }
        if(param === DevConfig.STAGE_PARAMS.ON_DAYS){
            if(!Array.isArray(curObj[param])) {
                return ReturnMethods.returnFailure("StageHandler: stage on days must be a list")
            }
            if(!curObj[param].every(e => DevConfig.DAY_INDEX_ORDERING.includes(e))) {
                return ReturnMethods.returnFailure("StageHandler: on days must contain valid day names")
            }
        }
        return ReturnMethods.returnSuccess(curObj[param])
    } else {
        return ReturnMethods.returnSuccess(-1)
    }
}

/**
 *
 * Gets the name of the next stage as in the list of experiment stages
 * for the given condition in the config file
 *
 * If conditionName is undefined, then it is expected that the
 * experiment has no conditions and that the experimentStages
 * field of the config file will directly be a list, instead of an
 * object with condition names
 *
 * If no next stage is found, return partial failure with successdata -1
 *
 * @param config
 * @param conditionName
 * @param stageName
 * @returns {{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}}
 */
module.exports.getNextStageName = (config, conditionName, stageName) => {

    if(typeof stageName !== "string"){
        return ReturnMethods.returnFailure("StageHandler: stage name must be string");
    }

    let stageListObj = this.getStageList(config, conditionName);
    if(stageListObj.returnCode === DevConfig.FAILURE_CODE){
        return stageListObj;
    }
    let condition = stageListObj.data;

    let curStageIdx = -1;
    for(let i = 0; i < condition.length; i++){
        let curStage = condition[i];
        if(curStage["name"] === stageName){
            curStageIdx = i;
            break;
        }
    }
    if(curStageIdx === -1){
        return ReturnMethods.returnFailure("StageHandler: Stage " + stageName + " doesn't exist!");
    }

    if(curStageIdx !== condition.length-1){
        let nextStageName = condition[curStageIdx+1].name;
        return ReturnMethods.returnSuccess(nextStageName)
    } else {
        return ReturnMethods.returnPartialFailure("Next Stage doesn't exist", -1)
    }
}

/**
 *
 * Updates the current stage by a single day. Then, check whether
 * the stage should be updated to the next stage based on the prescribed
 * length of the stage as given in the config file.
 *
 * If last stage day limit has been reached, end the experiment
 *
 * @param config
 * @param uniqueId
 * @returns {Promise<{returnCode: *, data: *}|*>}
 */
module.exports.updateStageDay = async (config, uniqueId) => {
    let newStageDay, participant, returnVal;
    try{
        participant = await participants.get(uniqueId);
    } catch(err){
        return ReturnMethods.returnFailure("StageHandler: Unable to fetch participant to update stage day")
    }

    // Get the current stage information
    let currentStage, stageDay;
    try{
        currentStage = participant.stages.stageName;
        stageDay = participant.stages.stageDay;
    } catch(err){
        return ReturnMethods.returnFailure("StageHandler: Stages object not found in participant");
    }

    if(typeof currentStage === "undefined" || typeof stageDay === "undefined"){
        return ReturnMethods.returnFailure("StageHandler: no stage currently underway!");
    }

    // Check if current stage has a specific length
    let stageLengthObj = this.getStageParam(config, participant.conditionName, currentStage, DevConfig.STAGE_PARAMS.LENGTH_DAYS);
    if(stageLengthObj.returnCode === DevConfig.FAILURE_CODE){
        return stageLengthObj;
    }

    // Update the day
    let curStageLength = stageLengthObj.data;
    newStageDay = stageDay + 1;

    // Switch to next stage if number of days of current stage has been exceeded
    if(curStageLength !== -1 && newStageDay > curStageLength){
        let nextStageObj = this.getNextStageName(config, participant.conditionName, currentStage);
        if(nextStageObj.returnCode === DevConfig.FAILURE_CODE){
            return nextStageObj;
        } else if(nextStageObj.returnCode === DevConfig.PARTIAL_FAILURE_CODE){
            // End of experiment reached when no next stage found
            newStageDay = -1;
            returnVal = newStageDay;

            // End the current stage
            let endObj = await this.endCurrentStage(participant);
            if(endObj.returnCode === DevConfig.FAILURE_CODE){
                return endObj;
            }

            // End experiment
            let endExpObj = await this.endExperiment(participant.uniqueId);
            return endExpObj;

        } else {
            // Start the next stage (which includes ending the current stage)
            let startObj = await this.startStage(participant, nextStageObj.data);
            if(startObj.returnCode === DevConfig.FAILURE_CODE){
                return startObj;
            }
            returnVal = startObj.data;
        }

    } else {
        // Otherwise update and move on
        await participants.updateStageParameter(uniqueId, "stageDay", newStageDay);
        returnVal = newStageDay;
    }

    return ReturnMethods.returnSuccess(returnVal);
}

/**
 *
 * Ends the current stage for a given participant.
 * This involves clearing certain stage parameters and updating the
 * corresponding stage activity
 *
 * @param participant participant object must contain stage object
 * @returns {Promise<{returnCode: *, data: *}>}
 *          When failure, error code
 *          When success, success code with no data
 */
module.exports.endCurrentStage = async (participant) => {

    // get the current stage
    let currentStage, stageDay;
    try{
        currentStage = participant.stages.stageName;
        stageDay = participant.stages.stageDay;
    } catch(err){
        return ReturnMethods.returnFailure("StageHandler: Stages object not found in participant");
    }

    // If there is no current stage, then it cannot be ended
    if(typeof currentStage === "undefined" || typeof stageDay === "undefined"){
        return ReturnMethods.returnFailure("StageHandler: no stage currently underway!");
    }

    // Update the activity and the parameters
    let now = moment.tz(participant.parameters.timezone);
    try{
        await participants.addStageActivity(participant.uniqueId, {
            name : currentStage,
            what : DevConfig.END_STAGE_STRING,
            when : now.format()
        })

        // Erase current stage parameters
        await participants.clearStageParam(participant.uniqueId, "stageName");
        await participants.clearStageParam(participant.uniqueId, "stageDay");

    } catch(err){
        return ReturnMethods.returnFailure("StageHandler: Unable to update participant to end stage");
    }
    return ReturnMethods.returnSuccess("");
}

/**
 *
 * Starts a given stage for a given participant
 *
 * This involves setting certain stage variables and updating the activity
 * of beginning and ending of stages
 *
 * @param participant participant object, must contain stages object
 * @param nextStageName
 * @returns {Promise<{returnCode: *, data: *}|*>}
 *          When failure, error code
 *          When success, success code with name of next stage
 */
module.exports.startStage = async (participant, nextStageName) => {

    // Get the current stage and day
    let currentStage, stageDay;
    try{
        currentStage = participant.stages.stageName;
        stageDay = participant.stages.stageDay;
    } catch(err){
        return ReturnMethods.returnFailure("StageHandler: Stages object not found in participant");
    }

    // If a stage is already running, end it
    if(typeof currentStage !== "undefined" || typeof stageDay !== "undefined"){
        let endStageObj = await this.endCurrentStage(participant);
        if(endStageObj.returnCode === DevConfig.FAILURE_CODE){
            return endStageObj;
        }
    }

    // Start the next stage
    let now = moment.tz(participant.parameters.timezone);
    try{
        await participants.addStageActivity(participant.uniqueId, {
            name : nextStageName,
            what : DevConfig.BEGIN_STAGE_STRING,
            when : now.format()
        })
        await participants.updateStageParameter(participant.uniqueId, "stageName", nextStageName);
        await participants.updateStageParameter(participant.uniqueId, "stageDay", 0);
    } catch(err){
        return ReturnMethods.returnFailure("StageHandler: Unable to update participant parameters to start stage")
    }
    return ReturnMethods.returnSuccess(nextStageName);
}

/**
 *
 * Ends the experiment. Cancels all scheduled jobs and then updates the participant's state
 *
 * @param uniqueId
 * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}|{returnCode: *, data: *}>}
 */
module.exports.endExperiment = async (uniqueId) => {
    // Put require here because of dependency issues or sth, I guess.
    const ScheduleHandler = require('./scheduleHandler');
    let removeReturnObj = await ScheduleHandler.removeAllJobsForParticipant(uniqueId);

    if(removeReturnObj.returnCode === DevConfig.FAILURE_CODE){
        return removeReturnObj;
    } else if(removeReturnObj.returnCode === DevConfig.PARTIAL_FAILURE_CODE){
        return ReturnMethods.returnFailure(removeReturnObj.failData);
    }

    try{
        await participants.updateField(uniqueId, "currentState", "experimentEnd");
    } catch(err){
        return ReturnMethods.returnFailure("StageHandler: Unable to update participant state to end");
    }
    return ReturnMethods.returnSuccess(-1);
}

module.exports.getStageUpdateActionList = (config, conditionName) => {
    // Need all stage names
    // Need all on days
    // Group all stages based on onDays
    // If only one group, then only one action needed with no if
    // If more than one group, then as many actions as there are groups with stage names of all stages in that
    //      group in the if condition for that action.
}