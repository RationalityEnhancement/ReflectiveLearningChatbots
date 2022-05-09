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
 *
 */

class ConfigParser{

    static isolateVariables(targetString){
        if(typeof targetString !== 'string') {
            return ReturnMethods.returnFailure("CParser: Must be a string to replace variables")
        }
        let splitArr = [];
        let isVarArr = [];
        let currentText = "";
        let currentVar = "";
        let currentState = "inText" // inText, inVariable, startReserved
        for(let i = 0; i < targetString.length; i++){
            let char = targetString[i];
            switch(currentState){
                // Handles any text that is not part of the variable ${var}
                case "inText" :
                    if(char === "$"){
                        currentState = "startReserved";
                    } else {
                        currentText += char;
                    }
                    break;
                // Handles any text that is part of the variable ${var}
                case "inVariable":
                    currentVar += char;
                    if(char === "}"){
                        splitArr.push(currentVar);
                        isVarArr.push(true);
                        currentVar = "";
                        currentState = "inText";
                    }
                    break;
                // $ signifies the beginning of a reserved phrase (variable, etc.)
                // Prepare to parse reserved word depending on character occurring after $
                case "startReserved":
                    if(char === "{"){
                        currentState = "inVariable";
                        currentVar += char;
                        if(currentText.length > 0) {
                            splitArr.push(currentText);
                            isVarArr.push(false);
                        }
                        currentText = "";
                    } else if(char === "$") {
                        currentText += "$";
                    } else {
                        currentState = "inText";
                        currentText += "$" + char;
                    }
                    break;

            }
        }
        // Deal with last character
        if(currentState === "startReserved"){
            currentState = "inText";
            currentText += "$"
            splitArr.push(currentText);
            isVarArr.push(false);
        } else if(currentText.length > 0){
            splitArr.push(currentText);
            isVarArr.push(false);
        }
        if(currentState !== "inText"){
            return ReturnMethods.returnFailure("CParser: Reserved words syntax is incorrect");
        }
        return ReturnMethods.returnSuccess({
            splitArr: splitArr,
            isVarArr: isVarArr
        });

    }

    /**
     *
     * @param participant participant object data. Must contain the following fields:
     *                      currentAnswer
     *                      firstName
     *                      uniqueId
     * @param targetString
     * @returns {{returnCode: *, data: *}|{returnCode: *, data: *}}
     *
     */
    static getVariable(participant, varName) {
        if(typeof varName !== 'string'){
            return ReturnMethods.returnFailure("CParser: Must be a string to replace variables")
        }
        if(!participant || typeof participant !== 'object') {
            return ReturnMethods.returnFailure("CParser: Participant object required to replace variables")
        }
        let requiredParams = ["firstName", "currentAnswer", "uniqueId"];
        for(let i = 0; i < requiredParams.length; i++){
            let param = requiredParams[i];
            if(!(param in participant)){
                return ReturnMethods.returnFailure("CParser: Participant object requires field " + param);
            }
        }

        let varVal = "";
        switch(varName){
            case DevConfig.VAR_STRINGS.FIRST_NAME :
                varVal = participant["firstName"];
                break;
            case DevConfig.VAR_STRINGS.CURRENT_ANSWER :
                varVal = participant["currentAnswer"];
                break;
            case DevConfig.VAR_STRINGS.UNIQUE_ID:
                varVal = participant["uniqueId"];
            default:
                return ReturnMethods.returnFailure("CParser: Variable name not recognized");
        }
        return ReturnMethods.returnSuccess(varVal);
    }
    /**
     *
     * @param participant participant object data. Must contain the following fields:
     *                      currentAnswer
     *                      firstName
     * @param targetString
     * @returns {{returnCode: *, data: *}|{returnCode: *, data: *}}
     */
    static replaceVariablesInString(participant, targetString){
        let isolatedObj = this.isolateVariables(targetString);
        if(isolatedObj.returnCode === DevConfig.FAILURE_CODE) return isolatedObj;
        let varSplit = isolatedObj.data.splitArr;
        let isVar = isolatedObj.data.isVarArr;
        let newString = "";
        for(let i = 0; i < varSplit.length; i++){
            let currentString = varSplit[i];
            let addString = "";
            if(isVar[i]){
                let varName = currentString.replace(/[\{}]/g, "");
                let varVal = this.getVariable(participant, varName);
                if(varVal.returnCode === DevConfig.FAILURE_CODE) return varVal;
                if(Array.isArray(varVal.data)) addString = varVal.data.join(', ');
                else addString = varVal.data;
            } else {
                addString = currentString;
            }
            newString += addString;
        }
        return ReturnMethods.returnSuccess(newString);
    }

}

module.exports = ConfigParser;
