const participants = require("./apiControllers/participantApiController");
const config = require("../json/config.json");
const DevConfig = require('../json/devConfig.json');
const ReturnMethods = require('./returnMethods');

/**
 *
 * Config parser class responsible for a variety of parsing functions
 * over parts of the experimenter config file, such as replacement of variables,
 * interpretation of conditional expressions, etc.
 *
 *
 */

class ConfigParser{

    /**
     *
     * Takes in a string and splits it into several parts, with each part being
     * either an isolated variable or a string of normal text that contains no
     * variables.
     *
     * Variables are of the form ${VarName}
     *
     *
     * E.g., "${Name}, how do you do?" -> [ "${Name}" , ", how do you do?" ]
     *
     * @param targetString the string to be separated
     * @returns {{returnCode: *, data: *}}
     *              return code with success or failure along with the object:
     *              {
     *                  splitArr : the array with the split string pieces (e.g., as above),
     *                  isVarArr : boolean array of same length as splitArr, denotes
     *                             whether each part is a variable or not
     *                             E.g., [true, false] for the above example
     *
     *              }
     */
    static isolateVariables(targetString){
        if(typeof targetString !== 'string') {
            return ReturnMethods.returnFailure("CParser: Must be a string to replace variables")
        }
        let splitArr = [];
        let isVarArr = [];
        let currentText = "";
        let currentVar = "";

        // Possible states the parser can be when dealing with a single character:
        //  inText - the current character is to be understood as part of non-variable normal text
        //  inVariable - the current character is to be understood as part of a variable in the string
        //  startReserved - the previous character was '$', which signifies the start of a reserved
        //                  word, if the current character confirms that (e.g., '{' signifies start of var)
        let currentState = "inText"
        for(let i = 0; i < targetString.length; i++){
            let char = targetString[i];
            switch(currentState){
                // Handles any text that is not part of the variable ${var}
                case "inText" :
                    // Potential reserved word
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
                        // End of variable text, save and move back to text parsing mode
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
                        // ${ signifies the start of a variable
                        currentState = "inVariable";
                        currentVar += "$" + char;

                        // If there was text being recorded before this variable, save it
                        //  as a chunk
                        if(currentText.length > 0) {
                            splitArr.push(currentText);
                            isVarArr.push(false);
                        }
                        currentText = "";
                    } else if(char === "$") {
                        // Previous $ is part of text, but this one may not be
                        // Stay in state 'startReserved'
                        currentText += "$";
                    } else {
                        // False alarm, $ is part of text
                        // Move along, nothing to see here.
                        currentState = "inText";
                        currentText += "$" + char;
                    }
                    break;

            }
        }
        // Deal with last character
        if(currentState === "startReserved") {
            // If last character is $ sign
            currentState = "inText";
            currentText += "$"
        }
        // Save any residual text not saved yet
        if(currentText.length > 0){
            splitArr.push(currentText);
            isVarArr.push(false);
        }
        // One of the variables did not have an appropriately closed bracket, syntax error
        if(currentState !== "inText"){
            return ReturnMethods.returnFailure("CParser: Reserved words syntax is incorrect");
        }
        // Return both arrays
        return ReturnMethods.returnSuccess({
            splitArr: splitArr,
            isVarArr: isVarArr
        });

    }

    /**
     *
     * Takes a single variable name, and if a variable exists, return
     * the value of that variable
     *
     * @param participant participant object data. Must contain the following fields:
     *                      currentAnswer
     *                      firstName
     *                      uniqueId
     * @param varName the name of the variable to be returned
     * @returns {{returnCode: *, data: *}|{returnCode: *, data: *}}
     *              returns success code along with data being the value of the variable or the error msg
     *
     */
    static getVariable(participant, varName) {
        // Input validation
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

        // If the variable name is valid, then return a value, otherwise error
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
     * Takes a string with text and variables, and returns a string with all of the
     * variables replaced with their respective values.
     *
     * If sensitive data is to be filtered out (sensitiveDataAlso if false), then
     * those variables that hold sensitive data (as defined in dev config) will not
     * be substituted and will be left alone
     *
     * @param participant participant object data. Must contain the following fields:
     *                      currentAnswer
     *                      firstName
     * @param targetString string in which variables are to be substituted
     * @param sensitiveDataAlso boolean flag for whether variables containing sensitive data
     *                          should also be substituted
     * @returns {{returnCode: *, data: *}|{returnCode: *, data: *}}
     *                  success code along with new string or error message
     */
    static replaceVariablesInString(participant, targetString, sensitiveDataAlso = false){
        // Split the string up to isolate the variables
        let isolatedObj = this.isolateVariables(targetString);
        if(isolatedObj.returnCode === DevConfig.FAILURE_CODE) return isolatedObj;
        let varSplit = isolatedObj.data.splitArr;
        let isVar = isolatedObj.data.isVarArr;

        let newString = "";

        for(let i = 0; i < varSplit.length; i++){
            let currentString = varSplit[i];
            let addString = "";

            if(isVar[i]){
                // If the current string part is a variable
                // Remove $ and {
                let varName = currentString.replace(/[{}$]/g, "");

                // Get the value of the variable
                let varVal = this.getVariable(participant, varName);

                if(varVal.returnCode === DevConfig.FAILURE_CODE) return varVal;

                // If it is an array, join it with commas
                if(Array.isArray(varVal.data)) addString = varVal.data.join(', ');
                else addString = varVal.data;

                // If sensitive data is to be filtered out, and the current variable
                //  contains sensitive data, replace with the original string ${VarName}
                if(!sensitiveDataAlso){
                    if(DevConfig.SENSITIVE_DATA_VARS.includes(varName)){
                        addString = currentString;
                    }
                }
            } else {
                addString = currentString;
            }
            // Build the string piece by piece
            newString += addString;
        }
        return ReturnMethods.returnSuccess(newString);
    }

}

module.exports = ConfigParser;
