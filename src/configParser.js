const participants = require("./apiControllers/participantApiController");
const config = require("../json/config.json");
const DevConfig = require('../json/devConfig.json');
const ReturnMethods = require('./returnMethods');
const lodash = require('lodash');
const moment = require('moment-timezone')
const ExperimentUtils = require('./experimentUtils')

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
     *                      stages
     *                      conditionName
     *
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
        let requiredParams = ["firstName", "currentAnswer", "uniqueId", "stages", "conditionName"];
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
                try{
                    if(participant.currentQuestion.qType === "number") {
                        varVal = parseInt(varVal[0]);
                    }
                } catch(err){
                    // Do nothing
                }
                foundReserved = true;
                break;
            case DevConfig.VAR_STRINGS.UNIQUE_ID:
                varVal = participant["uniqueId"];
                foundReserved = true;
                break;
            case DevConfig.VAR_STRINGS.STAGE_NAME :
                varVal = participant.stages["stageName"]
                foundReserved = true;
                break;
            case DevConfig.VAR_STRINGS.STAGE_DAY :
                varVal = participant.stages["stageDay"]
                foundReserved = true;
                break;
            case DevConfig.VAR_STRINGS.ANSWER_LEN_CHARS:
                let curAns = participant.currentAnswer;
                let curAnsLens = curAns.map(el => el.length);
                varVal = curAnsLens.length > 0 ? curAnsLens.reduce((partialSum, ans) => partialSum + ans) : 0;
                foundReserved = true;
                break;
            case DevConfig.VAR_STRINGS.ANSWER_LEN_WORDS:
                let currAns = participant.currentAnswer;
                let currAnsWords = currAns.join(" ").split(" ").filter(el => el.trim().length > 0);
                varVal = currAnsWords.length;
                foundReserved = true;
                break;
            case DevConfig.VAR_STRINGS.TODAY:
                let dateObj = ExperimentUtils.getNowDateObject(participant.parameters.timezone);
                varVal = DevConfig.DAY_INDEX_ORDERING[dateObj.dayOfWeek];
                foundReserved = true;
                break;
            case DevConfig.VAR_STRINGS.CONDITION:
                varVal = participant["conditionName"];
                if(!varVal) varVal = "";
                foundReserved = true;
                break;

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
     *                      uniqueId
     *                      stages
     *                      conditionName
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

    static evaluateAnswerConditionsOld(ruleList, options, lastAnswer){
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
     * Conditional results of cNextReplies, cNextQuestions, and cNextActions can only
     * either be strings of non-zero length or arrays of non-zero length
     *
     * @param result
     * @returns {boolean}
     */
    static isValidConditionalResult(result){
        if(typeof result === "undefined") return false;
        if(typeof result === "string" && result.length > 0) return true;
        if(Array.isArray(result)){
            return result.length > 0;
        }
        return false;
    }

    /**
     *
     * Function to take a condition string and evaluate it
     * by using the functions to construct an expression object
     * and then evaluate it
     *
     * @param participant
     * @param condString
     * @returns {{returnCode: *, data: *}|*}
     */
    static evaluateConditionString(participant, condString){
        let constructConObj = this.constructExpressionObject(participant, condString);
        if(constructConObj.returnCode === DevConfig.FAILURE_CODE){
            return constructConObj;
        }
        let evaluateConObj = this.evaluateExpressionObject(participant, constructConObj.data);
        return evaluateConObj;
    }
    /**
     *
     * Receive a list of rules of the format:
     * [ {
     *      if: valid logical expression,
     *      then : string or array of outcomes if expression evaluates to true
     *      else : (optional) string or array of outcomes if expression evaluates to false
     *  }]
     *
     * Evaluates expressions in list order, and returns the first outcome that
     * corresponds to a true or false evaluation.
     *
     * If 'else' is not specified and 'if' evaluates to false, skip to the next rule
     *
     * @param participant participant object
     * @param ruleList list of rules
     * @returns {{returnCode: *, data: *}|*|{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}}
     */
    static evaluateAnswerConditions(participant, ruleList){
        if(!Array.isArray(ruleList)) return ReturnMethods.returnFailure("CParser: Rule List must be list");
        if(!participant) return ReturnMethods.returnFailure("CParser: Participant must be valid");
        if(!ruleList.every(el => ("if" in el) && ("then" in el))){
            return ReturnMethods.returnFailure("CParser: If and then required for every condition evaluation")
        }
        if(!ruleList.every(el => typeof el["if"] === "string")){
            return ReturnMethods.returnFailure("CParser: Every if condition must be a string")
        }
        let found = false;
        let result;
        for(let i = 0; i < ruleList.length; i++){
            // Construct the expression object from the string and evaluate
            let curConString = ruleList[i]['if'];
            let evaluateConObj = this.evaluateConditionString(participant, curConString);
            if(evaluateConObj.returnCode === DevConfig.FAILURE_CODE){
                return evaluateConObj;
            }

            // "If" is true, return when there is a valid "then" statement
            if(evaluateConObj.data.value){
                if(this.isValidConditionalResult(ruleList[i]["then"])){
                    result = ruleList[i]["then"];
                    found = true;
                    break;
                }
            } else if(ruleList[i]["else"]){
                // "if" is false, return if there is a valid "else" statement. Otherwise move on to next condition.
                if(this.isValidConditionalResult(ruleList[i]["else"])){
                    result = ruleList[i]["else"];
                    found = true;
                    break;
                }
            }
        }
        if(!found){
            return ReturnMethods.returnPartialFailure("", DevConfig.NO_RESPONSE_STRING);
        } else {
            return ReturnMethods.returnSuccess(result);
        }
    }
    /**
     *
     * Recursively evaluates an expression object based on the operands and operators of the object
     *
     * An expression object is of the following form:
     *
     * {
     *     operand1: {
     *         value : Constant of primitive type or expression object
     *         type : Primitive type or expression
     *     }
     *     operator : valid operator,
     *     operand2 : {
     *         value : Constant of primitive type or expression object
     *         type : Primitive type or expression
     *     }
     * }
     *
     * @param participant participant object, must contain field "currentQuestion"
     * @param expressionObj object to be evaluated
     * @returns {{returnCode: *,  data: *}|*|{returnCode: *, data: *}}
     *          if success, returns {
     *              value : true/false (based on evaluation of expression),
     *              type : boolean
     *          }
     *
     */
    static evaluateExpressionObject(participant, expressionObj){

        // Error checking
        if(typeof expressionObj !== "object"){
            return ReturnMethods.returnFailure("CParser: expression object must be object")
        }
        if(typeof expressionObj.operand1 === "undefined" || typeof expressionObj.operand2 === "undefined"){
            return ReturnMethods.returnFailure("CParser: operands must not be undefined for evaluation")
        }
        if(typeof expressionObj.operand1.value === "undefined" || typeof expressionObj.operand2.value === "undefined"){
            return ReturnMethods.returnFailure("CParser: operands must not be undefined for evaluation")
        }
        if(expressionObj.operand1.type === DevConfig.OPERAND_TYPES.UNDEFINED
            || expressionObj.operand2.type === DevConfig.OPERAND_TYPES.UNDEFINED){
            return ReturnMethods.returnFailure("CParser: operands must not be objects/undefined for evaluation")
        }
        if(typeof expressionObj.operator === "undefined"
            || !DevConfig.VALID_CONDITIONAL_OPERATORS.includes(expressionObj.operator)){
            return ReturnMethods.returnFailure("CParser: operator must be valid for evaluation")
        }
        let expObjCopy = JSON.parse(JSON.stringify(expressionObj));

        // Recursively evaluate expressions if present in operands
        if(expObjCopy.operand1.type === DevConfig.OPERAND_TYPES.EXPRESSION){
            let evalObj = this.evaluateExpressionObject(participant, expObjCopy.operand1.value);
            if(evalObj.returnCode === DevConfig.FAILURE_CODE) return evalObj;
            expObjCopy.operand1 = evalObj.data;
        }
        if(expObjCopy.operand2.type === DevConfig.OPERAND_TYPES.EXPRESSION){
            let evalObj = this.evaluateExpressionObject(participant, expObjCopy.operand2.value);
            if(evalObj.returnCode === DevConfig.FAILURE_CODE) return evalObj;
            expObjCopy.operand2 = evalObj.data;
        }
        let evaluation = false;

        // Evaluate based on operator
        switch(expObjCopy.operator){
            case "==":
                // Check if operand1 == operand2
                // Data types must be of same type to compare equality
                if(expObjCopy.operand1.type !== expObjCopy.operand2.type){
                    return ReturnMethods.returnFailure("CParser: Data types " + expObjCopy.operand1.type
                        + " and " + expObjCopy.operand2.type + " cannot be compared for equality")
                }
                try{
                    // Sort arrays to compare for equality
                    if([DevConfig.OPERAND_TYPES.STRING_ARRAY, DevConfig.OPERAND_TYPES.NUMBER_ARRAY].includes(expObjCopy.operand1.type)){
                        expObjCopy.operand1.value.sort();
                        expObjCopy.operand2.value.sort();
                    }
                } catch(err){
                    return ReturnMethods.returnFailure("CParser: Error processing arrays for comparison")
                }

                evaluation = lodash.isEqual(expObjCopy.operand1.value, expObjCopy.operand2.value);
                break;
            case "!=":
                // Check if operand1 != operand2
                if(expObjCopy.operand1.type !== expObjCopy.operand2.type){
                    return ReturnMethods.returnFailure("CParser: Data types " + expObjCopy.operand1.type
                        + " and " + expObjCopy.operand2.type + " cannot be compared for equality")
                }
                try{
                    if([DevConfig.OPERAND_TYPES.STRING_ARRAY, DevConfig.OPERAND_TYPES.NUMBER_ARRAY].includes(expObjCopy.operand1.type)){
                        expObjCopy.operand1.value.sort();
                        expObjCopy.operand2.value.sort();
                    }
                } catch(err){
                    return ReturnMethods.returnFailure("CParser: Error processing arrays for comparison")
                }
                evaluation = !lodash.isEqual(expObjCopy.operand1.value, expObjCopy.operand2.value);
                break;
            case ">=":
                // Check if operand1 >= operand2
                // Data types must be numbers to compare greater/less than
                if(expObjCopy.operand1.type !== DevConfig.OPERAND_TYPES.NUMBER
                    || expObjCopy.operand2.type !== DevConfig.OPERAND_TYPES.NUMBER){
                    return ReturnMethods.returnFailure("CParser: Data types must be number to use comparison operators")
                }
                evaluation = expObjCopy.operand1.value >= expObjCopy.operand2.value;
                break;
            case ">":
                // Check if operand1 > operand2
                if(expObjCopy.operand1.type !== DevConfig.OPERAND_TYPES.NUMBER
                    || expObjCopy.operand2.type !== DevConfig.OPERAND_TYPES.NUMBER){
                    return ReturnMethods.returnFailure("CParser: Data types must be number to use comparison operators")
                }
                evaluation = expObjCopy.operand1.value > expObjCopy.operand2.value;
                break;
            case "<=":
                // Check if operand1 <= operand2
                if(expObjCopy.operand1.type !== DevConfig.OPERAND_TYPES.NUMBER
                    || expObjCopy.operand2.type !== DevConfig.OPERAND_TYPES.NUMBER){
                    return ReturnMethods.returnFailure("CParser: Data types must be number to use comparison operators")
                }
                evaluation = expObjCopy.operand1.value <= expObjCopy.operand2.value;
                break;
            case "<":
                // Check if operand1 < operand2
                if(expObjCopy.operand1.type !== DevConfig.OPERAND_TYPES.NUMBER
                    || expObjCopy.operand2.type !== DevConfig.OPERAND_TYPES.NUMBER){
                    return ReturnMethods.returnFailure("CParser: Data types must be number to use comparison operators")
                }
                evaluation = expObjCopy.operand1.value < expObjCopy.operand2.value;
                break;
            case "AND":
                // Check if (operand1 AND operand2) is true
                // Data types must be boolean to use AND/OR operator
                if(expObjCopy.operand1.type !== DevConfig.OPERAND_TYPES.BOOLEAN
                    || expObjCopy.operand2.type !== DevConfig.OPERAND_TYPES.BOOLEAN){
                    return ReturnMethods.returnFailure("CParser: Data types must be boolean to use connectors AND/OR")
                }
                evaluation = expObjCopy.operand1.value && expObjCopy.operand2.value;
                break;
            case "OR":
                // Check if (operand1 OR operand2) is true
                if(expObjCopy.operand1.type !== DevConfig.OPERAND_TYPES.BOOLEAN
                    || expObjCopy.operand2.type !== DevConfig.OPERAND_TYPES.BOOLEAN){
                    return ReturnMethods.returnFailure("CParser: Data types must be boolean to use connectors AND/OR")
                }
                evaluation = expObjCopy.operand1.value || expObjCopy.operand2.value;
                break;
            case "MULTIPLE_OF":
                // Check if operand1 is an integer multiple of operand2
                // Data types must be numbers to check multiples of
                if(expObjCopy.operand1.type !== DevConfig.OPERAND_TYPES.NUMBER
                    || expObjCopy.operand2.type !== DevConfig.OPERAND_TYPES.NUMBER){
                    return ReturnMethods.returnFailure("CParser: Data types must be number to use MULTIPLE_OF")
                }
                evaluation = expObjCopy.operand1.value % expObjCopy.operand2.value === 0;
                break;
            case "IN_ARRAY":
                // Check if operand1 is contained in operand2 (array)
                // Array (operand 2) must be of same primitive type as the first operand
                if(!((expObjCopy.operand1.type === DevConfig.OPERAND_TYPES.NUMBER
                    && expObjCopy.operand2.type === DevConfig.OPERAND_TYPES.NUMBER_ARRAY)
                    || (expObjCopy.operand1.type === DevConfig.OPERAND_TYPES.STRING
                        && expObjCopy.operand2.type === DevConfig.OPERAND_TYPES.STRING_ARRAY))){
                    return ReturnMethods.returnFailure("CParser: first operand must be string or number, " +
                        "second operand must be array of same type as first operand")
                }
                evaluation = expObjCopy.operand2.value.includes(expObjCopy.operand1.value);
                break;
            case "CONTAINS_STRING":
                // Check if operand1 contains operand 2 as substring
                // Both must be string
                if(expObjCopy.operand1.type !== DevConfig.OPERAND_TYPES.STRING
                    || expObjCopy.operand2.type !== DevConfig.OPERAND_TYPES.STRING){
                    return ReturnMethods.returnFailure("CParser: Data types must be string to use CONTAINS_STRING")
                }
                evaluation = expObjCopy.operand1.value.includes(expObjCopy.operand2.value);
                break;
            case "HAS_CHOICE_IDX":
                // Check if the current answer (stored in operand1) of a choice question corresponds to the
                //  any of the answers (from currentQuestion.options) whose indices are provided in operand2
                // E.g., options ["yes","no","maybe"] and CURRENT_ANSWER = ["yes"]
                //          ${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0,2} => true
                //          ${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{1} => false

                if(!(expObjCopy.operand1.type === DevConfig.OPERAND_TYPES.STRING_ARRAY
                    && expObjCopy.operand2.type === DevConfig.OPERAND_TYPES.NUMBER_ARRAY)){
                    return ReturnMethods.returnFailure("CParser: Operand 1 must be string array (last answer)," +
                        "operand 2 must be number array (option indices) to use HAS_CHOICE_IDX");
                }

                // Convert the participant answers into their respective indices as ordered in currentQuestion.options
                let chosenOptionIdx;
                try{
                    let options = participant.currentQuestion.options;
                    if(!Array.isArray(options)) throw "Options not valid"
                    chosenOptionIdx = expObjCopy.operand1.value.map(el => options.indexOf(el));
                } catch(err){
                    return ReturnMethods.returnFailure("CParser: Could not find options to compare HAS_CHOICE_IDX");
                }

                // Check if there is any intersection between chosen option indices and condition indices
                evaluation = lodash.intersection(chosenOptionIdx, expObjCopy.operand2.value).length > 0;
                break;
            default:
                return ReturnMethods.returnFailure("CParser: operator " + expObjCopy.operator + " not recognized!");

        }
        return ReturnMethods.returnSuccess({
            type : DevConfig.OPERAND_TYPES.BOOLEAN,
            value : evaluation
        })

    }

    /**
     *
     * Remove a single set of enclosing brackets for the given expression.
     * If the bracket at the end of an expression is the closing bracket for
     * the one at the beginning of the expression, then the entire expression
     * is enclosed in braces, and this is removed.
     *
     * E.g., ((hello) AND (bye)) => (hello) AND (bye)
     * E.g., (hello AND bye) AND (dog AND cat) => (hello AND bye) AND (dog AND cat)
     *          [no enclosing bracket, no change]
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
                // If all open braces are closed before the expression ends,
                //  then the entire expression is not enclosed in a pair of brackets
                if(openBraces === 0){
                    enclosed = false;
                    break;
                }
            }
        }
        // Remove the enclosing brackets if it is enclosed
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
     * Operators are as defined in VALID_CONDITIONAL_OPERATORS in devConfig
     *
     * No validation is done, only separation into different parts of expression along with
     * denotation of the data type of the operands as defined by the declarations of the tokens
     * in the expression
     *
     *
     * @param expression
     * @returns {{returnCode: *, data: *}}
     *
     *          data : {
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

        // Parser is a state machine which deals with the current character based on the state.
        // States are:
        //  - start : at the time of starting
        //  - startToken : encountered $, begin processing token
        //  - inVariable : current text is to be taken as part of a variable token
        //  - inExpression : current text is to be taken as part of an expression within parentheses
        //  - startNumber : check if number definition syntax is correct
        //  - startNumberArray : check if number array definition syntax is correct
        //  - inNumber : current text is to be taken as part of a number token
        //  - inNumberArray : current text is to be taken as part of a number array token
        //  - startString : check if string definition syntax is correct
        //  - startStringArray : check if string array definition syntax is correct
        //  - inString : current text is to be taken as part of a string token
        //  - inStringArray : current text is to be taken as part of a string array token
        //  - startBoolean : check if boolean definition syntax is correct
        //  - inBoolean : current text is to be taken as part of a boolean token
        //  - end: after second operand has been parsed

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

        // Check each character of expression
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
                    } else if(')/.,:;@#%^&*'.split('').includes(char)){
                        return  ReturnMethods.returnFailure("CParser: Invalid character in operator: " + char)
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

    /**
     *
     * Parse a single number token of the form $N{<number>}. Return the number value
     * if valid, return error if not valid
     *
     * @param expression
     */
    static parseNumberToken(expression){
        if(typeof expression != "string"){
            return ReturnMethods.returnFailure("CParser: Number token must be string");
        }
        if(!expression.startsWith("$N{") || !expression.endsWith("}")){
            return ReturnMethods.returnFailure("CParser: Number token in incorrect format - must be $N{...}");
        }
        let trimmedExpression = expression.substring(3,expression.length-1);
        return this.getNumberFromString(trimmedExpression);
    }
    /**
     *
     * Parse a single boolean token of the form $B{TRUE/FALSE}. Return the truth value
     * if valid, return error if not valid
     *
     * @param expression
     */
    static parseBooleanToken(expression){
        if(typeof expression != "string"){
            return ReturnMethods.returnFailure("CParser: Boolean token must be string");
        }
        if(!expression.startsWith("$B{") || !expression.endsWith("}")){
            return ReturnMethods.returnFailure("CParser: Boolean token in incorrect format - must be $B{...}");
        }
        let trimmedExpression = expression.substring(3,expression.length-1);
        return this.getBooleanFromString(trimmedExpression);
    }
    /**
     *
     * Take a string value and get the corresponding boolean value
     * "TRUE" (case insensitive) => true
     * "FALSE" (case insensitive) => false
     *
     * @param expression
     * @returns {{returnCode: *, data: *}}
     */
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
        let retVal = modExp === "true";

        return ReturnMethods.returnSuccess(retVal);
    }

    /**
     *
     * Take a string value and get the corresponding number value, if possible
     *
     * @param expression
     * @returns {{returnCode: *, data: *}}
     */
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

    /**
     *
     * Get the operand type as defined in devConfig OPERAND_TYPES, based on the value
     * stored in a particular variable
     *
     * e.g., [1,2,3] => devConfig.OPERAND_TYPES.NUMBER
     *
     * @param constant
     * @returns {string}
     */
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

    /**
     *
     * Take a string with numbers separated by commas and return a number array
     *
     * @param expression
     * @returns {{returnCode: *, data: *}}
     */
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

    /**
     *
     * Takes in a string containing a conditional expression and outputs an "expression object"
     * that represents the expression in the string (provided it is correct syntactically)
     *
     * See docs for "evaluateExpressionObject" for details on what an expression object looks like
     *
     *
     * @param participant
     * @param expressionString
     * @returns {{returnCode: *, data: *}|{returnCode: *, data: *}|{returnCode: *, data: *}|{returnCode: *, data: *}|*|{returnCode: *, data: *}|{returnCode: *, data: *}|{returnCode: *, data: *}|{returnCode: *, data: *}}
     */
    static constructExpressionObject(participant, expressionString){
        // Parse into two operands and operator
        let parsedExpObj = this.parseSimpleExpression(expressionString);
        if(parsedExpObj.returnCode === DevConfig.FAILURE_CODE){
            return parsedExpObj;
        }
        let parsedExp = parsedExpObj.data;
        let operator = parsedExp.operator;

        // Check if operator is valid
        if(!DevConfig.VALID_CONDITIONAL_OPERATORS.includes(operator)){
            return ReturnMethods.returnFailure("CParser: Operator " + operator + " not recognized")
        }
        let expReturnObj;

        // Process both operands
        let operandList = [parsedExp.operand1, parsedExp.operand2];
        for(let i = 0; i < operandList.length; i++){
            let operand = operandList[i];
            switch(operand.type){
                // Recursively construct expression object if operand is itself expression
                case DevConfig.OPERAND_TYPES.EXPRESSION:
                    expReturnObj = this.constructExpressionObject(participant, operand.value);
                    if(expReturnObj.returnCode === DevConfig.FAILURE_CODE){
                        return expReturnObj;
                    }
                    operand.value = expReturnObj.data;
                    break;
                // Convert string to number
                case DevConfig.OPERAND_TYPES.NUMBER:
                    expReturnObj = this.getNumberFromString(operand.value);
                    if(expReturnObj.returnCode === DevConfig.FAILURE_CODE){
                        return expReturnObj;
                    }
                    operand.value = expReturnObj.data;
                    break;
                // Convert string to number array
                case DevConfig.OPERAND_TYPES.NUMBER_ARRAY:
                    expReturnObj = this.getNumberArrayFromString(operand.value);
                    if(expReturnObj.returnCode === DevConfig.FAILURE_CODE){
                        return expReturnObj;
                    }
                    operand.value = expReturnObj.data;
                    break;
                // No conversion required for string
                case DevConfig.OPERAND_TYPES.STRING:
                    break;
                // Convert string to string array
                case DevConfig.OPERAND_TYPES.STRING_ARRAY:
                    try{
                        operand.value = operand.value.split(",").map(e => e.trim());
                    } catch(err){
                        return ReturnMethods.returnFailure("CParser: Could not convert " + operand + " to string arr");
                    }
                    break;
                // Convert string to boolean
                case DevConfig.OPERAND_TYPES.BOOLEAN:
                    expReturnObj = this.getBooleanFromString(operand.value);
                    if(expReturnObj.returnCode === DevConfig.FAILURE_CODE){
                        return expReturnObj;
                    }
                    operand.value = expReturnObj.data;
                    break;
                // Get the value of the variable with the given name,
                //  and update the operand type depending on the value present in the
                //  variable
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

    /**
     *
     * Function to build a logical expression of multiple conjunctions,
     * using the same operand1 and operator, but different operand2s
     *
     * E.g., "((${STAGE_NAME} == $S{s1}) AND (${STAGE_NAME} == $S{s2})) AND (${STAGE_NAME} == $S{s3})
     *
     * @param operand1
     * @param operator
     * @param operand2List
     * @returns {{returnCode: *, data: *}}
     */
    static buildMultipleANDCondition(operand1, operator, operand2List){
        if(!Array.isArray(operand2List)){
            return ReturnMethods.returnFailure("CParser: operand 2 must be list")
        }
        if(!DevConfig.VALID_CONDITIONAL_OPERATORS.includes(operator)){
            return ReturnMethods.returnFailure("CParser: operator must be valid")
        }

        let expression;
        switch(operand2List.length){
            case 0:
                return ReturnMethods.returnFailure("CParser: Must have at least one operand 2 in list");
            case 1:
                expression = operand1 + " " + operator + " " + operand2List[0];
                break;
            default:
                let newList = operand2List.slice();
                newList[0] = operand1 + " " + operator + " " + operand2List[0];
                expression = newList.reduce((prev, curr) => {
                    let newExp = "(" + prev + ")" + " AND (" + operand1 + " " + operator + " " + curr + ")";
                    return newExp;
                })
        }
        return ReturnMethods.returnSuccess(expression);
    }
}

module.exports = ConfigParser;
