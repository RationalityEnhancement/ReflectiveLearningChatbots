/**
  Method to validate the config class to make sure it has all of the necessary parameters
  to define an experiment
**/

const config = require('../json/config.json');


let assert = (exp, errorMsg) => {
  if(!exp){
    throw 'ERROR: ' + errorMsg;
  }
}

module.exports.checkConfig = () => {
  // const validAssignmentTypes = ["relative", "absolute"];
  const validAssignmentSchemes = ["balanced", "random", "pid"];
  
  assert("experimentName" in config, "config missing experiment name");
  assert(config.experimentName.length > 0, "config missing experiment name");
  assert("experimentId" in config, "config missing experiment id");
  assert(config.experimentId.length > 0, "config missing experiment id");
  assert("experimentConditions" in config, "config missing experiment conditions" );
  assert(config.experimentConditions.length > 0, "config missing experiment conditions");
  assert("conditionAssignments" in config, "config missing condition assignments");
  assert(config.conditionAssignments.length > 0, "config missing condition assignments");
  assert("assignmentScheme" in config, "config missing assignment scheme");
  assert(config.assignmentScheme.length > 0, "config missing assignment scheme");
  
  assert(config.experimentConditions.length == config.conditionAssignments.length, "# of condition assigments does not match # of expt conditions");
  assert(validAssignmentSchemes.includes(config.assignmentScheme), "assignmentScheme is invalid");
  
  assert(config.conditionAssignments.every(val => !isNaN(val)), "condition assignments should be numbers");

  // TODO: Check parameter data types are valid
  // TODO: Validate presence of all languages in all questions
  // TODO: Validate parameter names
  // TODO: Validate presence of all phrases
  // TODO: Check if all question categories have unique names
  // TODO: Validate presence of options depending on question type
  // TODO: Check if setup questions are present
  // TODO: Check if all nextquestions are valid question IDs or question chain
  // TODO: Check for duplicate question IDs
  // TODO: Check if each question category has only one start question
  // TODO: Check whether scheduled questions have necessary components
  console.log('Config file valid');
}