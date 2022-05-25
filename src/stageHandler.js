const ReturnMethods = require('./returnMethods');
const DevConfig = require('../json/devConfig.json');
const lodash = require('lodash');

/**
 * Stage handler class that takes in a config as a parameter
 *  Purpose of the class is to deal with stages as defined in the config
 *  file
 *
 */

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
module.exports.getStageLengthDays = (config, conditionName, stageName) => {
    try{
        if(conditionName && !config.experimentConditions.includes(conditionName)){
            return ReturnMethods.returnFailure("StageHandler: Condition " + conditionName + " doesn't exist")
        }
    } catch(err){
        return ReturnMethods.returnFailure("StageHandler: Config experiment conditions missing")
    }
    if(typeof stageName !== "string"){
        return ReturnMethods.returnFailure("StageHandler: stage name must be string");
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

    if(curObj.lengthDays){
        if(typeof curObj.lengthDays !== "number"){
            return ReturnMethods.returnFailure("StageHandler: stage length days must be a number")
        }
        return ReturnMethods.returnSuccess(curObj.lengthDays)
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
 * @param config
 * @param conditionName
 * @param stageName
 * @returns {{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}}
 */
module.exports.getNextStageName = (config, conditionName, stageName) => {
    try{
        if(conditionName && !config.experimentConditions.includes(conditionName)){
            return ReturnMethods.returnFailure("StageHandler: Condition " + conditionName + " doesn't exist")
        }
    } catch(err){
        return ReturnMethods.returnFailure("StageHandler: Config experiment conditions missing")
    }
    if(typeof stageName !== "string"){
        return ReturnMethods.returnFailure("StageHandler: stage name must be string");
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

