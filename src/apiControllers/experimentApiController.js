/**
 * Class to write data about the current experiment to the
 * MongoDB database
 *
 * Primary identifier of the experiment document is the
 * experiment ID defined in the config file
 */

const { Experiment } = require('../models/Experiment');
const moment = require('moment-timezone');
const defaultTimezone = 'Europe/Berlin';


// Get all documents
exports.getAll = async () => {
  try {
    return Experiment.find();
  } catch (err) {
    console.error(err);
  }
}

// Get a single document by experimentId
exports.get = async (experimentId) => {
  try {
    return Experiment.findOne({ experimentId });
  } catch (err) {
    console.error(err);
  }
}

// Add a new document with a given experiment ID
exports.add = async (experimentId) => {
  try {
    const experiment = new Experiment();
    // console.log(experiment);
    experiment.experimentId = experimentId;
    

    return experiment.save();
  } catch (err) {
    console.error(err);
  }
}

// Update the field of a document with a new value
exports.updateField = async (experimentId, field, value) => {
  
  try{
    let experiment = await Experiment.findOne({ experimentId });
    experiment[field] = value;
    let savedExp = await experiment.save();
    return savedExp;
  } catch (err) {
    console.error(err);
  }
}

// Initialize the experiment document with some basic essential information
exports.initializeExperiment = async (experimentId, experimentName, experimentConditions, conditionAssignments) => {
  try{
    if (!experimentConditions) experimentConditions = [];
    if (!conditionAssignments) conditionAssignments = [];
    let experiment = await Experiment.findOne({ experimentId });
    experiment["experimentName"] = experimentName;
    experiment["experimentConditions"] = experimentConditions;
    experiment["conditionAssignments"] = conditionAssignments;
    experiment["currentlyAssignedToCondition"] = new Array(experimentConditions.length).fill(0);
    let savedExp = await experiment.save();
    return savedExp;
  } catch (err) {
    console.error(err);
  }
}

// Update the number of participants assigned to each condition (usually +1 or -1)
// Condition is indexed by the index of that particular condition in the array
exports.updateConditionAssignees = async (experimentId, conditionIdx, updateVal) => {
  try{
    const field = "currentlyAssignedToCondition";
    let experiment = await Experiment.findOne({ experimentId });
    let curAssigned = experiment[field];
    
    curAssigned[conditionIdx] += updateVal;
    if(curAssigned[conditionIdx] < 0) curAssigned[conditionIdx] = 0;
    experiment[field] = curAssigned;
   
    let savedExp = await experiment.save();
    return savedExp;

  } catch (err) {
    console.error(err);
  }
}

// Remove all documents
exports.removeAll = async () => {
  try {
    return Experiment.deleteMany({});
  } catch (err) {
    console.error(err);
  }
}

// Remove a single document by ID
exports.remove = async experimentId => {
  try {
    return Experiment.deleteOne({ experimentId });
  } catch (err) {
    console.error(err);
  }
}

// Add an error object
exports.addErrorObject = async (experimentId, errObj) => {
  try{
    let experiment = await Experiment.findOne( { experimentId });
    experiment["errorMessages"].push(errObj);
    return experiment.save();
  } catch(err) {
    console.error(err);
  }
}

// Add a feedback object
exports.addFeedbackObject = async (experimentId, feedObj) => {
  try{
    let experiment = await Experiment.findOne( { experimentId });
    experiment["feedbackMessages"].push(feedObj);
    return experiment.save();
  } catch(err) {
    console.error(err);
  }
}