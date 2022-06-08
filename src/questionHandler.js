const ReturnMethods = require('./returnMethods');
const DevConfig = require('../json/devConfig.json');
const lodash = require('lodash');
const ConfigParser = require('./configParser')

/**
 * Question handler class that takes in a config as a parameter
 *  Purpose of the class is to deal with questions as defined in the config
 *  file
 *
 * @param config variable containing a valid config json file loaded
 *              using 'require('...json')'
 */

function QuestionHandler(config){

    /**
     * Validates the question ID and fetches the question from the config
     * file based on the condition and question ID
     *
     * If conditionName is undefined, then search for questions in
     * "questionCategories" of the main experiment portion in the JSON config
     * file
     *
     * @param conditionName String containing the name of the condition
     * @param qId qId String of the form <questionCategory>.<questionId>
     * @returns {{returnCode: number, data: string}}
     *          if success, returnCode is 1, data  contains selectedQuestion
     *          if failure, returnCode is -1 data contains errorMsg
     */
    let getQuestionById = (conditionName, qId) => {

        let components;
        try{
            components = qId.split('.');
        } catch(err) {
            return { "returnCode" : -1, "data": "QHandler: Question ID not a string"};
        }
        if(components.length !== 2){
            let errorMsg = "QHandler: Question ID is of incorrect form or does not exist";
            return ReturnMethods.returnFailure(errorMsg)
        }
        let condition;
        if(!conditionName){
            condition = config;
        } else {
            if(!(conditionName in config["conditionQuestions"])){
                let errorMsg = "QHandler: Condition " + conditionName + " does not exist in config file!";
                return ReturnMethods.returnFailure(errorMsg)
            }
            condition = config["conditionQuestions"][conditionName];
        }
        const categoryName = components[0];
        const id_ = components[1];

        if(!(categoryName in condition.questionCategories)){
            return ReturnMethods.returnFailure("QHandler: Question category " + categoryName + " doesn't exist");
        }

        const category = condition.questionCategories[categoryName];
        let selectedQuestion;

        for(let i = 0; i < category.length; i++){
            let currentQuestion = category[i];
            if(currentQuestion.qId === id_){
                selectedQuestion = currentQuestion;
                break;
            }
        }
        if(!selectedQuestion){
            return ReturnMethods.returnFailure("QHandler: Question with qId " + id_ + " doesn't exist in category " + categoryName)
        }
        return ReturnMethods.returnSuccess(selectedQuestion);
    }

    /**
     * Constructing a question from the config file by the given question ID
     * and user preferences
     *
     *
     * constructedQuestion = {
     *     qId: "<questionCategoryName>.<questionID>,
     *     qType: "<questionType>",
     *     text: "<questionTextInPreferredLanguage>",
     *     <otherOptionalParameters> : [see variables languageDepOptionalParams
     *                                     and otherOptionalParams]
     * }
     *
     * @param conditionName condition from which question is to be selected
     * @param qId Question ID of the form <questionCategory>.<questionID>
     * @param language Selected language of the user
     * @returns {returnCode, data}
     *          if success, returnCode is 1, data  contains constructedQuestion
     *          if failure, returnCode is -1 data contains errorMsg
     */

    this.constructQuestionByID = (conditionName, qId, language) => {

        if(!config.languages.includes(language)) language = config.defaultLanguage;

        let selectedQuestion;

        let selectedQuestionObj = getQuestionById(conditionName, qId);

        if(selectedQuestionObj.returnCode === DevConfig.FAILURE_CODE) {
            return ReturnMethods.returnFailure(selectedQuestionObj.data);
        } else {
            selectedQuestion = selectedQuestionObj.data;
        }
        let constructedQuestion = {
            "qId" : qId,
            "qType" : selectedQuestion.qType,
        }
        try{
            // If it is a dummy question, use the default text
            if(constructedQuestion.qType !== "dummy"){
                constructedQuestion["text"] = selectedQuestion.text[language];
            } else {
                constructedQuestion["text"] = DevConfig.DUMMY_QUESTION_TEXT;
            }
        } catch(err){
            return ReturnMethods.returnFailure("QHandler: question " + qId + " does not have text for " +
                "language " + language + " available.")
        }


        // Process qualtrics question, add the link with query strings to question object
        if(selectedQuestion.qType === "qualtrics"){
            if(!("qualtricsLink" in selectedQuestion)){
                return ReturnMethods.returnFailure("QHandler: Qualtrics question requires link");
            }
            let fields = selectedQuestion.qualtricsFields;
            if(!fields) fields = [];
            let link = selectedQuestion.qualtricsLink;
            let addedFields = 0;
            for(let i = 0; i < fields.length; i++){
                let fieldName = fields[i]["field"];
                let fieldValue = fields[i]["value"];
                if(!fieldName) continue;
                if(typeof fieldValue === "undefined"){
                    return ReturnMethods.returnFailure("QHandler: Qualtrics field " + fieldName + " missing  value");
                }
                let sepChar = (addedFields === 0) ? "?" : "&";

                // Add query string to end of link
                link += sepChar + fieldName + "=" + fieldValue;
                addedFields++;
            }
            constructedQuestion["qualtricsLink"] = link;
        }

        // If any of the questions have preset options (qType aliases)
        if(DevConfig.qTypeAliases.includes(selectedQuestion.qType)){
            switch(selectedQuestion.qType){
                case "likert5":
                    constructedQuestion["qType"] = "singleChoice";
                    constructedQuestion["options"] = config.phrases.keyboards.likert5Options[language];
                    break;
                case "likert7":
                    constructedQuestion["qType"] = "singleChoice";
                    constructedQuestion["options"] = config.phrases.keyboards.likert7Options[language];
            }
        }

        const optionalParams = ["options", "replyMessages", "saveAnswerTo", "nextQuestion", "nextActions",
        "cReplyMessages", "cNextActions","cNextQuestions", "range", "selectQFirst", "minLengthChars", "minLengthWords"]
        for(let i = 0; i < optionalParams.length; i++){
            let field = optionalParams[i];
            let languageReplacedValue = this.replaceLanguageDeeply(selectedQuestion[field], config.languages, language)
            if(field in selectedQuestion) constructedQuestion[field] = languageReplacedValue;
        }


        return ReturnMethods.returnSuccess(constructedQuestion);

    }

    /**
     *
     * Function to go through an object and replace every language object
     * (object which has config.languages as keys) with the corresponding value
     * based on the participant preferred language
     *
     * @param targetObj target object to replace all language objects
     * @param languages possible languages
     * @param partLang participant preferred language
     * @returns {{}|*[]|*}
     */
    this.replaceLanguageDeeply = (targetObj, languages, partLang) => {
        if(typeof targetObj !== 'object') return targetObj;
        if(!Array.isArray(languages)) return targetObj;
        if(typeof partLang !== 'string') return targetObj;

        // Deal with all elements of array
        if(Array.isArray(targetObj)){
            let newArray = [];
            for(let i = 0; i < targetObj.length; i++){
                newArray.push(this.replaceLanguageDeeply(targetObj[i], languages, partLang))
            }
            return newArray;
        }

        // If object is a language object, return the value of the corresponding language
        if(languages.length === lodash.intersection(Object.keys(targetObj),config.languages).length){
            // Handle nested language objects
            return this.replaceLanguageDeeply(targetObj[partLang], languages, partLang);
        }
        let newObj = {};

        // Recursively deal with all properties of object
        for(const [key, value] of Object.entries(targetObj)){
            newObj[key] = this.replaceLanguageDeeply(value, languages, partLang);
        }
        return newObj;
    }

    /**
     * Returns starting question of the question category as defined in the config file
     * It is the question that contains the "start" field set to the value "true"
     *
     * If conditionName is undefined, then search for category in main config file area
     *
     * @param conditionName the condition
     * @param categoryName the question category from which first question is to be found
     * @param language language in which the question should be presented
     * @returns {{returnCode: number, data}}
     *          if success, returnCode is 1, data  contains constructedQuestion
     *          if failure, returnCode is -1 data contains errorMsg
     */
    this.getFirstQuestionInCategory = (conditionName, categoryName, language) => {

        let condition;
        if(!conditionName){
            condition = config;
        } else {
            if(!(conditionName in config["conditionQuestions"])){
                let errorMsg = "QHandler: Condition " + conditionName + " does not exist in config file!";
                return ReturnMethods.returnFailure(errorMsg)
            }
            condition = config["conditionQuestions"][conditionName];
        }
        if(!(categoryName in condition.questionCategories)){
            return ReturnMethods.returnFailure("QHandler: Question category " + categoryName + " doesn't exist");
        }
        const category = condition.questionCategories[categoryName];
        let selectedQuestion;

        for(let i = 0; i < category.length; i++){
            let currentQuestion = category[i];
            if(currentQuestion.start){
                selectedQuestion = currentQuestion;
                break;
            }
        }
        if(!selectedQuestion){
            return ReturnMethods.returnFailure("QHandler: Starting question doesn't exist in category " + categoryName)
        }
        let fullId = categoryName + "." + selectedQuestion.qId;
        return this.constructQuestionByID(conditionName, fullId, language);
    }

    /**
     *
     * Return a list of the scheduled questions from the config file,
     * for a given condition.
     *
     * @param conditionName name of the condition
     * @param participant
     * @returns {{returnCode: *, data: *}}
     */
    this.getScheduledQuestions = (conditionName, participant) => {
        let condition;
        if(!conditionName){
            condition = config;
        } else {
            if(!(conditionName in config["conditionQuestions"])){
                let errorMsg = "QHandler: Condition " + conditionName + " does not exist in config file!";
                return ReturnMethods.returnFailure(errorMsg)
            }
            condition = config["conditionQuestions"][conditionName];
        }
        if(!("scheduledQuestions" in condition)){
            return ReturnMethods.returnSuccess([]);
        }
        let schQList = condition["scheduledQuestions"];

        // Replace all variable timing values with values.
        for(let i = 0; i < schQList.length; i++){
            let curQ = schQList[i];
            let replaceObj = ConfigParser.replaceVariablesInString(participant, curQ["atTime"], true);
            if(replaceObj.returnCode === DevConfig.FAILURE_CODE){
                return replaceObj
            }
            curQ["atTime"] = replaceObj.data;
        }

        return ReturnMethods.returnSuccess(schQList);
    }
}

module.exports = QuestionHandler;
