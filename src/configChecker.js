
/**
  Method to validate the config class to make sure it has all of the necessary parameters
  to define an experiment
**/

const ConfigReader = require('./configReader');
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

  // : Validate presence of all languages in all questions
  // : Check if all question categories have unique names
  // : Validate presence of options depending on question type
  // : Check if setup questions are present
  // : Check if all nextquestions are valid question IDs or question chain
  // : Check for duplicate question IDs
  // : Check if each question category has only one start question
  // : Check whether scheduled questions have necessary components

  // Phrases
  // Ensure necessary phrases are present in all languages

  console.log('\x1b[42m\x1b[30m%s\x1b[0m', 'Config file valid');

}

module.exports.checkConfig()