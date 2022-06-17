const DevConfig = require('../json/essential/devConfig.json')
const fs = require('fs');
const path = require('node:path');

/**
 *
 * Parse a single filename token of the form $F{fileName}
 *
 * @param expression
 */
module.exports.parseFilenameToken = (expression) => {
    if(typeof expression != "string"){
        return {
            returnCode: DevConfig.FAILURE_CODE,
            data: "CReader: File token must be string"
        };
    }
    if(!expression.startsWith("$F{") || !expression.endsWith("}")){
        return {
            returnCode: DevConfig.FAILURE_CODE,
            data: "CReader: File token in incorrect format - must be $F{...}"
        };
    }
    let trimmedExpression = expression.substring(3,expression.length-1);

    return {
        returnCode: DevConfig.SUCCESS_CODE,
        data: trimmedExpression
    };
}

/**
 *
 * Go through a given object and recursively replace any filename tokens ($F{<filename>} with
 * the JSON object/array read from the file 'data/<filename>'
 *
 * If filename cannot be processed, replace filename string with empty array []
 *
 * @param targetObj
 * @returns {string|{}|*[]|*}
 */
module.exports.replaceFilenameDeeply = (targetObj) => {
    switch(typeof targetObj){
        case "string" :
            // Check if it is a filename token
            let fileNameParseObj = this.parseFilenameToken(targetObj);
            switch(fileNameParseObj.returnCode){
                case DevConfig.FAILURE_CODE:
                    // String is not a file token
                    return targetObj;
                case DevConfig.SUCCESS_CODE:
                    // String is a valid filename
                    let rootPath = path.resolve('.');
                    let targetFile = path.join(rootPath, fileNameParseObj.data);
                    if(fs.existsSync(targetFile)){
                        let JSONString = fs.readFileSync(targetFile,'utf8');
                        let JSONElement;
                        try{
                            JSONElement = JSON.parse(JSONString);
                            return JSONElement;
                        } catch(e){
                            // Not a valid JSON file
                            return [];
                        }
                    } else {
                        // File doesn't exist
                        return [];
                    }
                    break;
                default:
                    return targetObj;

            }
            break;
        case "object" :
            if(Array.isArray(targetObj)){
                // Deal with all elements of array
                let newArray = [];
                for(let i = 0; i < targetObj.length; i++){
                    newArray.push(this.replaceFilenameDeeply(targetObj[i]));
                }
                return newArray;
            } else {
                let newObj = {};
                // Recursively deal with all properties of object
                for(const [key, value] of Object.entries(targetObj)){
                    newObj[key] = this.replaceFilenameDeeply(value);
                }
                return newObj;
            }
        default :
            // Everything else, return as normal
            return targetObj;
    }

}

/**
 *
 * Get the experimenter config
 *
 * @returns {*}
 */
module.exports.getExpConfig = () => {
    let config = require('../json/essential/config.json');
    return this.replaceFilenameDeeply(config);
}

/**
 *
 * Get the developer config
 *
 * @returns {{SUCCESS_CODE: number, PARTIAL_FAILURE_CODE: number, FAILURE_CODE: number, NO_RESPONSE_STRING: string, NEXT_ACTION_STRING: string, REPEAT_QUESTION_STRING: string, INVALID_ANSWER_STRING: string, INVALID_FILE_STRING: string, qTypeAliases: {}, validAssignmentSchemes: {}, RESERVED_VARIABLES: {}, VAR_STRINGS: {FIRST_NAME: string, CURRENT_ANSWER: string, UNIQUE_ID: string, STAGE_NAME: string, STAGE_DAY: string, ANSWER_LEN_CHARS: string, ANSWER_LEN_WORDS: string, TODAY: string, TODAY_NAME: string, CONDITION: string}, SENSITIVE_DATA_VARS: {}, MS_PER_CHARACTER_DELAY: number, DUMMY_QUESTION_TEXT: string, VALID_CONDITIONAL_OPERATORS: {}, VALID_BOOLEAN_CONSTANTS: {}, OPERAND_TYPES: {EXPRESSION: string, NUMBER: string, NUMBER_ARRAY: string, STRING: string, STRING_ARRAY: string, BOOLEAN: string, VARIABLE: string, UNDEFINED: string}, DEFAULT_DTYPE_VALUES: {number: number, numArr: {}, string: string, strArr: {}, boolean: boolean}, VALID_ACTIONS_ARGS: {saveAnswerTo: number, setBooleanVar: number, scheduleQuestions: number, assignToCondition: number, addAnswerTo: number, clearVar: number, addValueTo: number, startStage: number, incrementStageDay: number, endExperiment: number}, END_STAGE_STRING: string, BEGIN_STAGE_STRING: string, DAY_INDEX_ORDERING: {}, STAGE_PARAMS: {LENGTH_DAYS: string, ON_DAYS: string}, STAGE_UPDATE_TIME: string, DATA_FOLDER_PATH: string}}
 */
module.exports.getDevConfig = () => {
    return DevConfig;
}

/**
 *
 * Get the developer config
 *
 * @returns {{SUCCESS_CODE: number, PARTIAL_FAILURE_CODE: number, FAILURE_CODE: number, NO_RESPONSE_STRING: string, NEXT_ACTION_STRING: string, REPEAT_QUESTION_STRING: string, INVALID_ANSWER_STRING: string, INVALID_FILE_STRING: string, qTypeAliases: {}, validAssignmentSchemes: {}, RESERVED_VARIABLES: {}, VAR_STRINGS: {FIRST_NAME: string, CURRENT_ANSWER: string, UNIQUE_ID: string, STAGE_NAME: string, STAGE_DAY: string, ANSWER_LEN_CHARS: string, ANSWER_LEN_WORDS: string, TODAY: string, TODAY_NAME: string, CONDITION: string}, SENSITIVE_DATA_VARS: {}, MS_PER_CHARACTER_DELAY: number, DUMMY_QUESTION_TEXT: string, VALID_CONDITIONAL_OPERATORS: {}, VALID_BOOLEAN_CONSTANTS: {}, OPERAND_TYPES: {EXPRESSION: string, NUMBER: string, NUMBER_ARRAY: string, STRING: string, STRING_ARRAY: string, BOOLEAN: string, VARIABLE: string, UNDEFINED: string}, DEFAULT_DTYPE_VALUES: {number: number, numArr: {}, string: string, strArr: {}, boolean: boolean}, VALID_ACTIONS_ARGS: {saveAnswerTo: number, setBooleanVar: number, scheduleQuestions: number, assignToCondition: number, addAnswerTo: number, clearVar: number, addValueTo: number, startStage: number, incrementStageDay: number, endExperiment: number}, END_STAGE_STRING: string, BEGIN_STAGE_STRING: string, DAY_INDEX_ORDERING: {}, STAGE_PARAMS: {LENGTH_DAYS: string, ON_DAYS: string}, STAGE_UPDATE_TIME: string, DATA_FOLDER_PATH: string}}
 */
module.exports.getPIDCondMap = () => {
    let PIDCondMap = require('../json/essential/PIDCondMap.json');
    return PIDCondMap;
}
