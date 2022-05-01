const ReturnMethods = require('./returnMethods');
const DevConfig = require('../json/devConfig.json')

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
     * file based on the question ID
     *
     * @param qId qId String of the form <questionCategory>.<questionId>
     * @returns {returnCode, data}
     *          if success, returnCode is 1, data  contains selectedQuestion
     *          if failure, returnCode is -1 data contains errorMsg
     */
    let getQuestionById = (qId) => {

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
        const categoryName = components[0];
        const id_ = components[1];

        if(!(categoryName in config.questionCategories)){
            return ReturnMethods.returnFailure("QHandler: Question category " + categoryName + " doesn't exist");
        }

        const category = config.questionCategories[categoryName];
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
     * constructedQuestion = {
     *     qId: "<questionCategoryName>.<questionID>,
     *     qType: "<questionType>",
     *     text: "<questionTextInPreferredLanguage>",
     *     <otherOptionalParameters> : [see variables languageDepOptionalParams
     *                                     and otherOptionalParams]
     * }
     *
     * @param qId Question ID of the form <questionCategory>.<questionID>
     * @param language Selected language of the user
     * @returns {returnCode, data}
     *          if success, returnCode is 1, data  contains constructedQuestion
     *          if failure, returnCode is -1 data contains errorMsg
     */

    this.constructQuestionByID = (qId, language) => {

        if(!config.languages.includes(language)) language = config.defaultLanguage;

        let selectedQuestion;

        let selectedQuestionObj = getQuestionById(qId);

        if(selectedQuestionObj.returnCode === DevConfig.FAILURE_CODE) {
            return ReturnMethods.returnFailure(selectedQuestionObj.data);
        } else {
            selectedQuestion = selectedQuestionObj.data;
        }

        let constructedQuestion = {
            "qId" : qId,
            "text" : selectedQuestion.text[language],
            "qType" : selectedQuestion.qType,
        }

        const languageDepOptionalParams = ["options", "replyMessages"];
        const otherOptionalParams = ["saveAnswerTo", "nextAction"];

        for(let i = 0; i < languageDepOptionalParams.length; i++){
            let field = languageDepOptionalParams[i];
            if(field in selectedQuestion) constructedQuestion[field] = selectedQuestion[field][language];
        }
        for(let i = 0; i < otherOptionalParams.length; i++){
            let field = otherOptionalParams[i];
            if(field in selectedQuestion) constructedQuestion[field] = selectedQuestion[field];
        }
        return ReturnMethods.returnSuccess(constructedQuestion);

    }

    /**
     * Returns starting question of the question category as defined in the config file
     * It is the question that contains the "start" field set to the value "true"
     *
     * @param categoryName the question category from which first question is to be found
     * @param language language in which the question should be presented
     * @returns {{returnCode: number, data}}
     *          if success, returnCode is 1, data  contains constructedQuestion
     *          if failure, returnCode is -1 data contains errorMsg
     */
    this.getFirstQuestionInCategory = (categoryName, language) => {
        if(!(categoryName in config.questionCategories)){
            return returnError("QHandler: Question category " + categoryName + " doesn't exist");
        }
        const category = config.questionCategories[categoryName];
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
        return this.constructQuestionByID(fullId, language);
    }

    this.getScheduledQuestions = () => {
        if(!("scheduledQuestions" in config)){
            return ReturnMethods.returnFailure("QHandler: Scheduled questions not found");
        }
        let schQList = config["scheduledQuestions"];

        return ReturnMethods.returnSuccess(schQList);
    }
}

module.exports = QuestionHandler;
