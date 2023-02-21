
/**
  Method to validate the config class to make sure it has all of the necessary parameters
  to define an experiment
**/

const lodash = require('lodash')
const ConfigReader = require('./configReader');
const ReturnMethods = require('./returnMethods')
const ConfigParser = require('./configParser')
const origConfig = ConfigReader.getExpConfig();
// Use copy of config file for checking
const config = JSON.parse(JSON.stringify(origConfig));
const DevConfig = ConfigReader.getDevConfig();

let configFileInvalid = false;

let assert = (exp, errorMsg) => {
  if(!exp){
    console.error('\x1b[41m\x1b[37m%s\x1b[0m', 'ERROR: ' + errorMsg);
    process.exit()
  }
}

module.exports.checkConfig = () => {
  // ---------- Required Fields ----------
  let requiredFields = [
      "experimentName", "experimentId",
    "experimentLengthWeeks", "experimentStages", "phrases","mandatoryParameters", "debug", "languages",
    "defaultLanguage", "questionCategories", "instructionText"
  ]

  // Main experiment information
  let fieldTypeChecks = {
    experimentName: (value) => typeof value === "string" && value.length > 0,
    experimentId: (value) => typeof value === "string" && value.length > 0,
    experimentConditions: (value) => Array.isArray(value) && value.length > 0 && value.every(el => typeof el === "string"),
    relConditionSizes: (value) => Array.isArray(value) && value.length > 0 && value.every(el => typeof el === "number"),
    assignmentScheme: (value) => typeof value === "string" && value.length > 0,
    experimentLengthWeeks: (value) => typeof value === "number" && value > 0,
    experimentStages: (value) => typeof value === "object",
    phrases: (value) => typeof value === "object",
    msPerCharacterDelay: (value) => typeof value === "number",
    mandatoryParameters: (value) => typeof value === "object",
    customParameters: (value) => typeof value === "object",
    debug: (value) => typeof value === "object",
    languages: (value) => Array.isArray(value) && value.length > 0 && value.every(el => typeof el === "string"),
    defaultLanguage: (value) => typeof value === "string" && value.length > 0,
    instructionText: (value) => typeof value === "object",
    questionCategories: (value) => typeof value === "object",
    conditionQuestions: (value) => typeof value === "object",
    conditionMapping: (value) => typeof value === "object"
  }

  // Checking if all required fields are present
  for(const fieldName of requiredFields){
    assert(fieldTypeChecks[fieldName](config[fieldName]), "field " + fieldName + ": absent or incorrect format")
  }

  // ---------- Conditions ----------
  if("experimentConditions" in config){
    let configRequiredFields = ["experimentConditions", "relConditionSizes", "assignmentScheme", "conditionQuestions"];

    for(const fieldName of configRequiredFields){
      assert(fieldTypeChecks[fieldName](config[fieldName]), "field " + fieldName + ": absent or incorrect format")
    }

    // Condition sizes equal to num conditions
    assert(config.experimentConditions.length === config.relConditionSizes.length,
        "# of condition assigments does not match # of expt conditions");

    // Assignment scheme valid
    assert(DevConfig.VALID_ASSIGNMENT_SCHEMES.includes(config.assignmentScheme), "assignmentScheme is invalid");

    // Check if condition mapping present when assignment scheme is PID
    if(config.assignmentScheme === "pid"){
      assert(("conditionMapping" in config && fieldTypeChecks["conditionMapping"](config["conditionMapping"])),
          "PID to condition map must be present and in proper format for assignment scheme pid")
      assert(Object.keys(config["conditionMapping"]).every(el => typeof el === "string" && el.length > 0),
          "Condition map keys must be non-empty strings")
      assert(Object.values(config["conditionMapping"]).every(el => typeof el === "number" && el >= 0 && el < config.experimentConditions.length),
          "Condition map values must be index [0 to n-1] of any of n experiment conditions")
    }

  } else {
    config.experimentConditions = []
  }

  // ---------- Debug flags ----------
  let requiredDebugFlags = ["experimenter", "actionMessages", "enableNext", "messageDelay", "developer", "saveDebugInfo"];
  for(const flagName of requiredDebugFlags){
    assert(flagName in config.debug && typeof config.debug[flagName] == "boolean",
        "debug flag \"" + flagName + "\" must be present and boolean")
  }

  // ---------- Languages ----------
  // Check if default language is in languages
  assert(config.languages.includes(config.defaultLanguage), "default language must be present in languages")

  // ---------- Parameters ------------
  // Check if mandatory parameters are present and in proper format
  let mandatoryParameters = {
    "language" : "string",
    "timezone" : "string",
    "PID" : "string"
  }
  for(const [key, value] of Object.entries(mandatoryParameters)){
    assert(config.mandatoryParameters[key] === value,
    "parameter \"" + key + "\" must be present in mandatoryParameters and of type " + value)
  }

  // Ensure all custom parameters have valid data types
  if("customParameters" in config){
    assert(fieldTypeChecks["customParameters"](config.customParameters), "customParameters must be an object")
    for(const [key,value] of Object.entries(config.customParameters)){
      assert(typeof key === "string" && DevConfig.VALID_PARAMETER_TYPES.includes(value),
          "custom parameter \"" + key + "\" must be string and have a valid parameter type")
    }
  } else {
    config.customParameters = {}
  }

  // ---------- Stages ------------
  let validateStagesObj = ConfigParser.validateStages(config.experimentStages, config.experimentConditions)
  assert(validateStagesObj.returnCode === DevConfig.SUCCESS_CODE, validateStagesObj.data)

  let confirmAllLanguages = (langObj) => {
    let intersect = lodash.intersection(Object.keys(langObj), config.languages);
    return intersect.length === config.languages.length;
  }

  // ---------- Phrases ------------

  // Define all the phrases that are required
  let requiredPhrases = {
    answerValidation: [
      'defaultInvalid',
      'invalidOption',
      'noOptions',
      'notANumber',
      'numberTooHigh',
      'numberTooLow',
      'notLongEnoughChars',
      'notLongEnoughWords',
      'answerNotConforming',
      'terminateSurveyProperly'
    ],
    keyboards: [
      'singleChoice',
      'multiChoice',
      'terminateAnswer',
      'finishedChoosingReply',
      'qualtricsFillPrompt',
      'qualtricsDonePrompt',
      'freeformSinglePrompt',
      'freeformMultiPrompt',
      'linkToSurvey',
      'likert5Options',
      'likert7Options'
    ],
    schedule: [
      'scheduleQNotif',
      'scheduleANotif',
      'dayNames',
      'reminderTextLong',
      'reminderTextShort'
    ],
    experiment: [
      'endExperiment',
      'reportFeedback',
      'reportFeedbackCancel',
      'experimentContinue',
      'reportFeedbackThanks',
      'repeatFail',
      'cannotHelp',
      'didntUnderstand',
      'cannotInteract',
      'cannotInteractAfterEnd',
      'nothingToCancel',
      'talkStart',
      'talkCancelDescription',
      'talkCancelled',
      'talkKeywordNotRecognized',
      'cannotStartTalk',
      'cannotStartTalkOutstanding'
    ]
  }
  let arrayPhrases = ["likert5Options", "likert7Options", "dayNames"]

  // Ensure that all required phrases are present and in correct format
  for(const [category, list] of Object.entries(requiredPhrases)){
    // Ensure that the category is present
    assert(category in config.phrases, "Phrase category \"" + category + "\" missing!")

    for(const phrase of list){
      // Ensure that the phrase is present
      assert(phrase in config.phrases[category],
          "Phrase \"" + phrase + "\" of category \"" + category + "\" missing!")

      // Ensure that the phrase is translated into all languages
      assert(confirmAllLanguages(config.phrases[category][phrase]),
          "Phrase \"" + phrase + "\" of category \"" + category + "\" must be present in all languages!")

      // Ensure that the phrases are either strings or string arrays
      if(!arrayPhrases.includes(phrase)){
        assert(Object.values(config.phrases[category][phrase]).every(el => typeof el === "string"),
            "Phrase \"" + phrase + "\" of category \"" + category + "\" must have only strings!")
      } else {
        assert(Object.values(config.phrases[category][phrase]).every(el => {
              return Array.isArray(el) && el.every(subel => typeof subel === "string")
            }),
            "Phrase \"" + phrase + "\" of category \"" + category + "\" must have only string arrays!")
      }
    }
  }

  // ---------- Questions ------------

  let validateSentText = (str) => {
    if(str.length > 4096){
      return ReturnMethods.returnFailure("Message text cannot be longer than 4096 characters")
    }
    let fakeParticipantObj = {
      firstName: "test",
      parameters: {...config.customParameters, ...config.mandatoryParameters},
      conditionName: "Test",
      currentAnswer: ["Test"],
      stages: {
        stageName: "Test",
        stageDay: 0
      }
    }
    let replaceVarsObj = ConfigParser.replaceVariablesInString(fakeParticipantObj, str, true)
    if(replaceVarsObj.returnCode === DevConfig.FAILURE_CODE) return replaceVarsObj

    // TODO: Ensure that HTML tags are closed

    return ReturnMethods.returnSuccess(true);
  }
  let validateQuestionObj = (questionObj, questionCategory, condition) => {

    // Validate question ID
    if(!("qId" in questionObj) || typeof questionObj.qId !== "string"){
      return ReturnMethods.returnFailure("Condition: " + condition + "\nCategory: " + questionCategory +
          "\nField \"qId\" for question in category is either missing or not valid: " + questionObj.qId)
    }

    // Validate question type
    if(!("qType" in questionObj) || !DevConfig.VALID_QUESTION_TYPES.includes(questionObj.qType)){
      return ReturnMethods.returnFailure("Condition: " + condition + "\nCategory: " + questionCategory +
          "\nField \"qType\" of question \"" + questionObj.qId + "\" is either missing or not valid: " + questionObj.qType)
    }

    // Validate text
    if(!("text" in questionObj) && questionObj.qType !== "dummy"){
      return ReturnMethods.returnFailure("Condition: " + condition + "\nCategory: " + questionCategory +
          "\nField \"text\" is missing for question: " + questionObj.qId)
    }
    if(!confirmAllLanguages(questionObj.text) || !Object.values(questionObj.text.every(el => typeof el === "string"))){
      return ReturnMethods.returnFailure("Condition: " + condition + "\nCategory: " + questionCategory +
          "\nField \"text\" must have a string present for all languages: "
          + questionObj.qType)
    }
    for(const [lang, text] of questionObj.text){
      let validateTextObj = validateSentText(text);
      assert(validateTextObj.returnCode === DevConfig.SUCCESS_CODE,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "\n text for language " + lang + " invalid:\n" + validateTextObj.data)
    }

    // Check for required fields depending on question type
    for(const prop of DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType]["required"]){
      assert(prop in questionObj,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId +
        "\nquestion of qType " + questionObj.qType + " must have property " + prop)
    }

    // Validate all properties of questionObj
    if("minLengthWords" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("minLengthWords"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property minLengthWords")
      assert(typeof questionObj.minLengthWords === "number" && questionObj.minLengthWords > 0,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "minLengthWords must be a number greater than 0"
      )
      assert(!("minLengthChars" in questionObj),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "question object cannot contain both minLengthChars and minLengthWords"
      )
    }

    if("minLengthChars" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("minLengthChars"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property minLengthChars")
      assert(typeof questionObj.minLengthChars === "number" && questionObj.minLengthChars > 0,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "minLengthChars must be a number greater than 0"
      )
    }

    if("answerShouldBe" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("answerShouldBe"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property answerShouldBe")

      assert(questionObj.answerShouldBe.every(el => el.every(el => typeof el === "string")),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "answerShouldBe must be an array of strings"
      )
    }

    if("options" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("options"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property options")
      assert(confirmAllLanguages(questionObj.options),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "options must be available in all languages"
      )
      let optionArrays = Object.values(questionObj.options);
      assert(optionArrays.every(arr => arr.every(el => typeof el === "string")),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "options must be an array of strings for each language"
      )
    }

    if("buttonLayoutCols" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("buttonLayoutCols"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property buttonLayoutCols")
      assert(typeof questionObj.buttonLayoutCols === "number",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "buttonLayoutCols must be a number"
      )
      assert(questionObj.buttonLayoutCols < Math.min(...Object.values(questionObj.options).map(arr => arr.length)),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "buttonLayoutCols cannot be greater than the number of available options"
      )
    }

    if("range" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("range"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property range")
      assert(typeof questionObj.range === "object",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "range must be an object"
      )
      assert("upper" in questionObj.range || "lower" in questionObj.range,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "range must contain an upper bound or lower bound"
      )
      assert(!("upper" in questionObj.range) || typeof questionObj.range.upper === 'number',
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "upper bound of range must be a number"
      )
      assert(!("lower" in questionObj.range) || typeof questionObj.range.lower === 'number',
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "lower bound of range must be a number"
      )
    }

    if("qualtricsLink" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("qualtricsLink"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property qualtricsLink")
      assert(typeof questionObj.qualtricsLink === "string",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "qualtricsLink must be a string"
      )
    }

    if("qualtricsFields" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("qualtricsFields"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property qualtricsFields")
      assert(Array.isArray(questionObj.qualtricsFields),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "qualtricsFields must be an array"
      )
      assert(questionObj.qualtricsFields.every(el => typeof el === "object"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "every element of qualtricsFields array must be an object"
      )
      assert(questionObj.qualtricsFields.every(el => {
        return "field" in el && typeof el.field === "string" && !el.field.match(/[&,?]/g)
        &&  "value" in el && typeof el.value === "string" && !el.value.match(/[&,?]/g)
      }),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "every element of qualtricsFields array must have a string \"field\" and string \"value\" " +
          "without invalid characters"
      )
    }

    if("continueStrings" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("continueStrings"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property continueStrings")
      assert(Array.isArray(questionObj.continueStrings),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "continueStrings must be an array"
      )
      assert(questionObj.qualtricsFields.every(el => typeof el === "string"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "every element of continueStrings array must be a string"
      )
    }

    if("inputPrompt" in questionObj){
      assert(confirmAllLanguages(questionObj.inputPrompt) && Object.values(questionObj.inputPrompt.every(el => typeof el === "string")),
          "Condition: " + condition + "\nCategory: " + questionCategory +
            "\nField \"inputPrompt\" must have a string present for all languages: "
            + questionObj.qId)
      for(const [lang, text] of questionObj.inputPrompt){
        let validateTextObj = validateSentText(text);
        assert(validateTextObj.returnCode === DevConfig.SUCCESS_CODE,
            "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
            + "\n inputPrompt for language " + lang + " invalid:\n" + validateTextObj.data)
      }
    }

    if("reminder" in questionObj){
      assert(typeof questionObj.reminder === "object",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "reminder must be an object"
      )
      assert("freqMins" in questionObj.reminder && "numRepeats" in questionObj.reminder,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "reminder must contain both freqMins and numRepeats"
      )
      assert(typeof questionObj.reminder.freqMins === 'number' && questionObj.reminder.freqMins > 0,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "freqMins of reminder must be a number greater than 0"
      )
      assert(typeof questionObj.reminder.numRepeats === 'number' && questionObj.reminder.numRepeats > 0,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "numRepeats of reminder must be a number greater than 0"
      )
    }

    if("image" in questionObj){
      assert(typeof questionObj.image === "object",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "image must be an object"
      )
      assert("sourceType" in questionObj.image && "source" in questionObj.image,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "image must contain both source and sourceType"
      )
      assert(DevConfig.VALID_IMAGE_SOURCE_TYPES.includes(questionObj.image.sourceType),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "sourceType " + questionObj.image.sourceType + " is not valid"
      )
      assert(confirmAllLanguages(questionObj.image.source) && Object.values(questionObj.image.source.every(el => typeof el === "string")),
          "Condition: " + condition + "\nCategory: " + questionCategory +
          "\nField \"source\" of image must have a string present for all languages: "
          + questionObj.qId)
    }



  }

  // Ensure condition-independent setup questions are present




  // : Validate presence of all languages in all questions
  // : Check if all question categories have unique names
  // : Validate presence of options depending on question type
  // : Check if setup questions are present
  // : Check if all nextquestions are valid question IDs or question chain
  // : Check for duplicate question IDs
  // : Check if each question category has only one start question
  // : Check whether scheduled questions have necessary components

  console.log('\x1b[42m\x1b[30m%s\x1b[0m', 'Config file valid');

}

module.exports.checkConfig()