const participants = require("./apiControllers/participantApiController");
const config = require("../json/config.json");
const DevConfig = require('../json/devConfig.json');
const ReturnMethods = require('./returnMethods');
const lodash = require('lodash');

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
        let foundReserved = false;
        switch(varName){
            case DevConfig.VAR_STRINGS.FIRST_NAME :
                varVal = participant["firstName"];
                foundReserved = true;
                break;
            case DevConfig.VAR_STRINGS.CURRENT_ANSWER :
                varVal = participant["currentAnswer"];
                foundReserved = true;
                break;
            case DevConfig.VAR_STRINGS.UNIQUE_ID:
                varVal = participant["uniqueId"];
                foundReserved = true;
            default:
        }
        // Look in parameters
        if(!foundReserved){
            if(!(varName in participant.parameters)){
                return ReturnMethods.returnFailure("CParser: Variable name not recognized");
            }
            if(typeof participant.parameters[varName] === "undefined"){
                return ReturnMethods.returnFailure("CParser: Parameter " + varName +" value not set");
            }
            return ReturnMethods.returnSuccess(participant.parameters[varName]);
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

    /**
     *
     * Takes a string and replaces specific variable values in the string
     * based on the given mapping varVals
     *
     * If a value for a variable is not given in the mapping, that variable is
     * not replaced and will be kept as such
     *
     * @param targetString String with variables to replace (e.g., "My name is ${Name}")
     * @param varVals Mapping between variable names and values (e.g., { "Name" : "John" })
     * @returns {{returnCode: *, data: *}|{returnCode: *, data: *}}
     *              when successful, returns string with replaced variables (e.g., "My name is John")
     */
    static replaceSpecificVariablesInString(targetString, varVals){
        if(typeof varVals !== 'object' || Array.isArray(varVals)){
            return ReturnMethods.returnFailure("CParser: varVals must be object")
        }
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
                let varVal;
                if(varName in varVals) {
                    varVal = varVals[varName];
                } else {
                    varVal = currentString;
                }

                // If it is an array, join it with commas
                if(Array.isArray(varVal)) addString = varVal.join(', ');
                else addString = varVal;

            } else {
                addString = currentString;
            }
            // Build the string piece by piece
            newString += addString;
        }
        return ReturnMethods.returnSuccess(newString);
    }
    
    static evaluateAnswerConditions(ruleList, options, lastAnswer){
        if(!Array.isArray(ruleList)) return ReturnMethods.returnFailure("CParser: Rule List must be list");
        if(!Array.isArray(options)) return ReturnMethods.returnFailure("CParser: Options must be list");
        if(!Array.isArray(lastAnswer)) return ReturnMethods.returnFailure("CParser: Last answer must be list");
        if(!ruleList.every(el => ("optionIndices" in el) && Array.isArray(el.optionIndices))){
            return ReturnMethods.returnFailure("CParser: Option indices required for condition evaluation")
        }
        let maxIntersection = 0;
        let maxIntersectionIdx = 0;
        let maxIntersectionRatio = 0;
        let answerIndices = lastAnswer.map(el => options.indexOf(el));
        for(let i = 0; i < ruleList.length; i++){
            let curOpt = ruleList[i]
            let intersection = lodash.intersection(curOpt.optionIndices, answerIndices);
            let intersectionRatio = intersection.length / curOpt.optionIndices.length;

            if(intersection.length > maxIntersection){
                maxIntersection = intersection.length;
                maxIntersectionRatio = intersectionRatio;
                maxIntersectionIdx = i;
            } else if(intersection.length === maxIntersection && maxIntersection > 0){
                if(intersectionRatio > maxIntersectionRatio){
                    maxIntersection = intersection.length;
                    maxIntersectionRatio = intersectionRatio;
                    maxIntersectionIdx = i;
                }
            }
        }

        if(maxIntersectionRatio === 0){
            return ReturnMethods.returnPartialFailure("", DevConfig.NO_RESPONSE_STRING);
        } else {
            return ReturnMethods.returnSuccess(ruleList[maxIntersectionIdx].data);
        }
    }

    /**
     *
     * Remove a single set of enclosing brackets for the given expression.
     * If the bracket at the end of an expression is the closing bracket for
     * the one at the beginning of the expression, then the entire expression
     * is enclosed in braces, and this is removed.
     *
     * @param expression (string) the expression whose enclosing braces are to be removed
     * @returns {string|*}
     */
    static removeEnclosingBrackets(expression){
        expression = expression.trim();
        // Not enclosed in brackets
        if(expression[0] !== "(" || expression[expression.length-1] !== ")") return expression;

        let openBraces = 1;
        let enclosed = true;
        for(let i = 1; i < expression.length-1; i++){
            if(expression[i] === "(") openBraces += 1;
            if(expression[i] === ")"){
                openBraces -= 1;
                if(openBraces === 0){
                    enclosed = false;
                    break;
                }
            }
        }
        if(enclosed){
            return expression.substring(1, expression.length - 1);
        } else {
            return expression;
        }
    }

    /**
     *
     * An expression is a single string with a binary operator and two operands.
     * The operator must be between the operands.
     * Operand must either be a single token or another expression within parentheses.
     *
     * Tokens are:
     * ${VarName} - Parameter with name VarName (e.g., {$Name})
     * $S{String} - String constant (e.g., $S{hello} = "hello")
     * $N{Number} - Number constant (e.g., $N{43} = 43)
     * $B{Boolean} - boolean constant (e.g., $B{TRUE} = true) (must be TRUE or FALSE)
     * $S*{String, Array} - Array of strings (e.g., = ["String", "Array"])
     * $N*{Number Array} - Array of numbers (e.g., $N*{3,4,5} = [3, 4, 5])
     *
     * Operators are as defined in VALID_CONDITIONAL_OPERATORS in devConfig,
     *
     * @param expression
     * @returns {
     *              operand1 : { value, type }, - Extracted string within curly braces as well and the declared type
     *              operator : String,
     *              operand2 : { value, type }, - Extracted string within curly braces as well and the declared type
     *          }
     */
    static parseSimpleExpression(expression){
        if(typeof expression !== 'string') {
            return ReturnMethods.returnFailure("CParser: Expression must be a string to evaluate")
        }

        // Remove all enclosing brackets
        let prevExp;
        let newExp = expression.slice();
        while(newExp !== prevExp){
            prevExp = newExp.slice();
            newExp = this.removeEnclosingBrackets(newExp);
        }
        expression = newExp.slice();

        let returnObj = {
            "operand1" : {
                "found" : false
            },
            "operator" : undefined,
            "operand2" : {
                "found" : false
            }
        };

        let currentText = "";

        // Possible states the parser can be when dealing with a single character:
        let currentState = "start"
        let openBraces = 0;

        let addToOperand = (value, type) => {
            if(!returnObj.operand1.found) {
                returnObj.operand1["found"] = true;
                returnObj.operand1["value"] = value;
                returnObj.operand1["type"] = type;
                currentState = "inOperator";
            } else if(!returnObj.operand2.found) {
                returnObj.operand2["found"] = true;
                returnObj.operand2["value"] = value;
                returnObj.operand2["type"] = type;
                currentState = "end";
            }
        }

        outer:
        for(let i = 0; i < expression.length; i++){
            let char = expression[i];
            switch(currentState){
                case "start" :
                    if(char === "$"){
                        currentState = "startToken"
                    } else if(char === "("){
                        openBraces += 1;
                        currentState = "inExpression"
                    } else {
                        return ReturnMethods.returnFailure("CParser: Expression must begin with $ or ( operand");
                    }
                    break;
                case "inExpression" :
                    if(char === "("){
                        currentText += char;
                        openBraces += 1;
                    } else if(char ===")") {
                        openBraces -= 1;
                        if(openBraces < 0) {
                            return ReturnMethods.returnFailure("CParser: Expression must have balanced braces");
                        } else if(openBraces === 0){
                            // End expression operand here
                            addToOperand(currentText, DevConfig.OPERAND_TYPES.EXPRESSION)
                            currentText = "";
                        } else {
                            currentText += char;
                        }
                    } else {
                        currentText += char;
                    }
                    break;
                case "inOperator":
                    if(char === "$"){
                        currentState = "startToken";
                        returnObj.operator = currentText.trim();
                        currentText = "";

                    } else if(char === "("){
                        openBraces += 1;
                        currentState = "inExpression";
                        returnObj.operator = currentText.trim();
                        currentText = "";
                    } else if(')/.,:;!@#%^&*'.split('').includes(char)){
                        return  ReturnMethods.returnFailure("CParser: Invalid character in operator")
                    } else {
                        currentText += char;
                    }
                    break;
                // $ signifies the beginning of a reserved phrase (variable, etc.)
                // Prepare to parse reserved word depending on character occurring after $
                case "startToken":
                    if(char === "{"){
                        currentState = "inVariable";

                    } else if(char === "N") {
                        currentState = "startNumber";
                    } else if(char === "S"){
                        currentState = "startString";
                    } else if(char === "B"){
                        currentState = "startBoolean";
                    } else {
                        return ReturnMethods.returnFailure("CParser: Invalid character " + char + " in token");
                    }
                    break;
                case "startNumber" :
                    if(char === "*") {
                        currentState = "startNumberArray"
                    } else if(char !== "{"){
                        return ReturnMethods.returnFailure("CParser: Number token must begin with {");
                    } else {
                        currentState = "inNumber";
                    }
                    break;
                case "inNumber" :
                    if(char === "}"){
                        addToOperand(currentText.trim(), DevConfig.OPERAND_TYPES.NUMBER)
                        currentText = "";
                    } else {
                        currentText += char;
                    }
                    break;
                case "startNumberArray" :
                    if(char !== "{") {
                        return ReturnMethods.returnFailure("CParser: Number array token must begin with {");
                    } else {
                        currentState = "inNumberArray";
                    }
                    break;
                case "inNumberArray" : {
                    if(char === "}"){
                        addToOperand(currentText.trim(), DevConfig.OPERAND_TYPES.NUMBER_ARRAY)
                        currentText = "";
                    } else {
                        currentText += char;
                    }
                    break;
                }
                case "startString" :
                    if(char === "*") {
                        currentState = "startStringArray"
                    } else if(char !== "{"){
                        return ReturnMethods.returnFailure("CParser: String token must begin with {");
                    } else {
                        currentState = "inString";
                    }
                    break;
                case "inString" :
                    if(char === "}"){
                        addToOperand(currentText.trim(), DevConfig.OPERAND_TYPES.STRING)
                        currentText = "";
                    } else {
                        currentText += char;
                    }
                    break;
                case "startStringArray" :
                    if(char !== "{") {
                        return ReturnMethods.returnFailure("CParser: String array token must begin with {");
                    } else {
                        currentState = "inStringArray";
                    }
                    break;
                case "inStringArray" : {
                    if(char === "}"){
                        addToOperand(currentText.trim(), DevConfig.OPERAND_TYPES.STRING_ARRAY)
                        currentText = "";
                    } else {
                        currentText += char;
                    }
                    break;
                }
                case "startBoolean" :
                    if(char !== "{"){
                        return ReturnMethods.returnFailure("CParser: Boolean token must begin with {");
                    } else {
                        currentState = "inBoolean";
                    }
                    break;
                case "inBoolean" :
                    if(char === "}"){
                        addToOperand(currentText.trim(), DevConfig.OPERAND_TYPES.BOOLEAN)
                        currentText = "";
                    } else {
                        currentText += char;
                    }
                    break;
                case "inVariable" :
                    if(char === "}"){
                        addToOperand(currentText.trim(), DevConfig.OPERAND_TYPES.VARIABLE)
                        currentText = "";
                    } else {
                        currentText += char;
                    }
                    break;
                case "end" :
                    break outer;
            }
        }
        if(currentState !== "end") {
            return ReturnMethods.returnFailure("CParser: Token or expression not closed, or expression is incomplete")
        }
        if(!returnObj.operand1.found || !returnObj.operand2.found){
            return ReturnMethods.returnFailure("CParser: One or more operands could not be found")
        }
        if(!returnObj.operator){
            return ReturnMethods.returnFailure("CParser: Operator could not be found")
        }

        delete returnObj.operand1["found"]
        delete returnObj.operand2["found"]

        return ReturnMethods.returnSuccess(returnObj);

    }
    static getBooleanFromString(expression){
        if(typeof expression !== "string"){
            return ReturnMethods.returnFailure("CParser: Must be a string to get boolean ")
        }
        if(expression.trim().length === 0) {
            return ReturnMethods.returnFailure("CParser: Cannot get boolean from empty string");
        }

        let modExp = expression.trim().toLowerCase();
        if(!["true", "false"].includes(modExp)){
            return ReturnMethods.returnFailure("CParser: Boolean string must be either 'true' or 'false'");
        }
        let retVal = modExp === "true" ? true : false;

        return ReturnMethods.returnSuccess(retVal);
    }
    static getNumberFromString(expression){
        if(typeof expression !== "string"){
            return ReturnMethods.returnFailure("CParser: Must be a string to get number ")
        }
        if(expression.trim().length === 0) {
            return ReturnMethods.returnFailure("CParser: Cannot get number from empty string");
        }
        if(isNaN(expression)){
            return ReturnMethods.returnFailure("CParser: Cannot convert " + expression + " into number");
        }
        let numberForm;
        if(expression.indexOf('.') !== -1) {
            numberForm = parseFloat(expression);
        } else {
            numberForm = parseInt(expression);
        }
        return ReturnMethods.returnSuccess(numberForm)
    }
    static getOperandType(constant){
        if(Array.isArray(constant)){
            if(constant.length === 0) return DevConfig.OPERAND_TYPES.STRING_ARRAY;
            if(typeof constant[0] === "number") return DevConfig.OPERAND_TYPES.NUMBER_ARRAY;
            else return DevConfig.OPERAND_TYPES.STRING_ARRAY;
        }
        if(typeof constant === "boolean") return DevConfig.OPERAND_TYPES.BOOLEAN;
        if(typeof constant === "string") return DevConfig.OPERAND_TYPES.STRING;
        if(typeof constant === "number") return DevConfig.OPERAND_TYPES.NUMBER;
        return DevConfig.OPERAND_TYPES.UNDEFINED;
    }
    static getNumberArrayFromString(expression){
        if(typeof expression !== "string"){
            return ReturnMethods.returnFailure("CParser: Must be a string to get number ")
        }
        if(expression.trim().length === 0) {
            return ReturnMethods.returnFailure("CParser: Cannot get number array from empty string");
        }
        let numSplit = expression.split(',').map(e => e.trim());
        let newArray = []
        for(let i = 0; i < numSplit.length; i++){
            if(isNaN(numSplit[i])){
                return ReturnMethods.returnFailure("CParser: Cannot convert " + numSplit[i] + " into number");
            }
            if(numSplit[i].length === 0) {
                return ReturnMethods.returnFailure("CParser: Cannot get number from empty string");
            }
            let numberForm;
            if(numSplit[i].indexOf('.') !== -1) {
                numberForm = parseFloat(numSplit[i]);
            } else {
                numberForm = parseInt(numSplit[i]);
            }
            newArray.push(numberForm);
        }
        return ReturnMethods.returnSuccess(newArray)
    }
    static constructExpressionObject(participant, expressionString){
        let parsedExpObj = this.parseSimpleExpression(expressionString);
        if(parsedExpObj.returnCode === DevConfig.FAILURE_CODE){
            return parsedExpObj;
        }
        let parsedExp = parsedExpObj.data;
        let operator = parsedExp.operator;
        if(!DevConfig.VALID_CONDITIONAL_OPERATORS.includes(operator)){
            return ReturnMethods.returnFailure("CParser: Operator not recognized")
        }
        let expReturnObj;
        let operandList = [parsedExp.operand1, parsedExp.operand2];
        for(let i = 0; i < operandList.length; i++){
            let operand = operandList[i];
            switch(operand.type){
                case DevConfig.OPERAND_TYPES.EXPRESSION:
                    expReturnObj = this.constructExpressionObject(participant, operand.value);
                    if(expReturnObj.returnCode === DevConfig.FAILURE_CODE){
                        return expReturnObj;
                    }
                    operand.value = expReturnObj.data;
                    break;
                case DevConfig.OPERAND_TYPES.NUMBER:
                    expReturnObj = this.getNumberFromString(operand.value);
                    if(expReturnObj.returnCode === DevConfig.FAILURE_CODE){
                        return expReturnObj;
                    }
                    operand.value = expReturnObj.data;
                    break;
                case DevConfig.OPERAND_TYPES.NUMBER_ARRAY:
                    expReturnObj = this.getNumberArrayFromString(operand.value);
                    if(expReturnObj.returnCode === DevConfig.FAILURE_CODE){
                        return expReturnObj;
                    }
                    operand.value = expReturnObj.data;
                    break;
                case DevConfig.OPERAND_TYPES.STRING:
                    break;
                case DevConfig.OPERAND_TYPES.STRING_ARRAY:
                    try{
                        operand.value = operand.value.split(",").map(e => e.trim());
                    } catch(err){
                        return ReturnMethods.returnFailure("CParser: Could not convert " + operand + " to string arr");
                    }
                    break;
                case DevConfig.OPERAND_TYPES.BOOLEAN:
                    expReturnObj = this.getBooleanFromString(operand.value);
                    if(expReturnObj.returnCode === DevConfig.FAILURE_CODE){
                        return expReturnObj;
                    }
                    operand.value = expReturnObj.data;
                    break;
                case DevConfig.OPERAND_TYPES.VARIABLE:
                    expReturnObj = this.getVariable(participant, operand.value);
                    if(expReturnObj.returnCode === DevConfig.FAILURE_CODE){
                        return expReturnObj;
                    }
                    operand.value = expReturnObj.data;
                    operand.type = this.getOperandType(expReturnObj.data);
                    break;

            }
        }

        return ReturnMethods.returnSuccess(parsedExp);
    }
}

module.exports = ConfigParser;
