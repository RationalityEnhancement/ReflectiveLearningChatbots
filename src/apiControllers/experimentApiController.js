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
    return Experiment.create({
      experimentId : experimentId
    })
  } catch (err) {
    console.error(err);
  }
}

// Update the field of a document with a new value
exports.updateField = async (experimentId, field, value) => {
  
  try{
    let update = {
      $set : {

      }
    }
    update["$set"][field] = value;
    return Experiment.findOneAndUpdate(
        {
          experimentId : experimentId
        },
        update,
        { new: true })
  } catch (err) {
    console.error(err);
  }
}

// Initialize the experiment document with some basic essential information
exports.initializeExperiment = async (experimentId, experimentName, experimentConditions, relConditionSizes) => {
  try{
    if (!experimentConditions) experimentConditions = [];
    if (!relConditionSizes) relConditionSizes = [];
    return Experiment.findOneAndUpdate(
        { experimentId: experimentId },
        {
          $set: {
            experimentName: experimentName,
            experimentConditions: experimentConditions,
            relConditionSizes: relConditionSizes,
            conditionAssignments: new Array(experimentConditions.length).fill(0)
          }
        },
        { new: true}
        );

  } catch (err) {
    console.error(err);
  }
}

// Update the number of participants assigned to each condition (usually +1 or -1)
// Condition is indexed by the index of that particular condition in the array
// WARNING: For negative values that are greater than the number of current assignees, updates
//          are rejected and no changes are made!
exports.updateConditionAssignees = async (experimentId, conditionIdx, updateVal) => {
  try{
    const field = "conditionAssignments";
    let condition = {
      experimentId : experimentId
    }

    condition[field+ "." + conditionIdx] = {
      $gte: -updateVal
    }
    let update = {
      $inc : {

      }
    }
    update["$inc"][field + "." + conditionIdx] = updateVal;
    return Experiment.findOneAndUpdate(
        condition,
        update,
        {
          new : true
        }
    )

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
    return Experiment.findOneAndUpdate(
        { experimentId: experimentId },
        {
          $push: {
            errorMessages: errObj
          }
        },
        { new: true }
    )
  } catch(err) {
    console.error(err);
  }
}

// Add a feedback object
exports.addFeedbackObject = async (experimentId, feedObj) => {
  try{
    return Experiment.findOneAndUpdate(
        { experimentId: experimentId },
        {
          $push: {
            feedbackMessages: feedObj
          }
        },
        { new: true }
    )
  } catch(err) {
    console.error(err);
  }
}