// TODO: Add devconfig for error codes

/**
 * Question handler class that takes in a config as a parameter
 *
 *
 * @param config variable containing a valid config json file loaded
 *              using 'require('...json')'
 */

function QuestionHandler(config){

    let returnError = (data) => {
        return {
            "returnCode" : -1,
            "data" : data
        };
    }
    let returnSuccess = (data) => {
        return {
            "returnCode" : 1,
            "data" : data
        }
    }
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
            return { "returnCode" : -1, "data": "Question ID not a string"};
        }
        if(components.length != 2){
            let errorMsg = "Question ID is of incorrect form or does not exist";
            return returnError(errorMsg)
        }
        const categoryName = components[0];
        const id_ = components[1];

        if(!(categoryName in config.questionCategories)){
            return returnError("Question category " + categoryName + " doesn't exist");
        }

        const category = config.questionCategories[categoryName];
        let selectedQuestion;

        for(let i = 0; i < category.length; i++){
            let currentQuestion = category[i];
            if(currentQuestion.qId == id_){
                selectedQuestion = currentQuestion;
                break;
            }
        }
        if(!selectedQuestion){
            return returnError("Question with qId " + id_ + " doesn't exist in category " + categoryName)
        }
        return returnSuccess(selectedQuestion);

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

        if(selectedQuestionObj.returnCode == -1) {
            return returnError(selectedQuestionObj.data);
        } else {
            selectedQuestion = selectedQuestionObj.data;
        }

        let constructedQuestion = {
            "qId" : qId,
            "text" : selectedQuestion.text[language],
            "qType" : selectedQuestion.qType,
        }


        const languageDepOptionalParams = ["options", "replyMessages"];
        const otherOptionalParams = ["saveAnswerTo", "nextQuestion"];

        for(let i = 0; i < languageDepOptionalParams.length; i++){
            field = languageDepOptionalParams[i];
            if(field in selectedQuestion) constructedQuestion[field] = selectedQuestion[field][language];
        }
        for(let i = 0; i < otherOptionalParams.length; i++){
            field = otherOptionalParams[i];
            if(field in selectedQuestion) constructedQuestion[field] = selectedQuestion[field];
        }
        return returnSuccess(constructedQuestion);

    }

    /**
     * Returns starting question of the question category as defined in the config file
     * It is the question that contains the "start" field set to the value "true"
     *
     * @param categoryName the question category from which first question is to be found
     * @param language language in which the question should be presented
     * @returns {returnCode, data}
     *          if success, returnCode is 1, data  contains constructedQuestion
     *          if failure, returnCode is -1 data contains errorMsg
     */
    this.getFirstQuestionInCategory = (categoryName, language) => {
        if(!(categoryName in config.questionCategories)){
            return returnError("Question category " + categoryName + " doesn't exist");
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
            return returnError("Starting question doesn't exist in category " + categoryName)
        }
        let fullId = categoryName + "." + selectedQuestion.qId;
        return this.constructQuestionByID(fullId, language);
    }
}

module.exports = QuestionHandler;
