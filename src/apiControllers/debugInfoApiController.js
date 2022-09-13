/**
 * Class to write data about the current experiment to the
 * MongoDB database.
 *
 * Primary identifier of a participant document is the
 * Telegram chat id
 */

const { DebugInfo } = require('../models/DebugInfo');
const lodash = require('lodash');

// Get all documents
exports.getAll = async () => {
  try {
    return DebugInfo.find();
  } catch (err) {
    console.error(err);
  }
}

// Get a single document by chatID
exports.get = async (uniqueId) => {
  try {
    return DebugInfo.findOne({ uniqueId: uniqueId });
  } catch (err) {
    console.error(err);
  }
}

exports.getByExperimentId = async (experimentId) => {
  try {
    return DebugInfo.find({ experimentId: experimentId });
  } catch(err) {
    console.error(err);
  }
}

// Add a new document with a given chat ID
exports.add = async (uniqueId) => {
  try {

    return DebugInfo.create({
      uniqueId: uniqueId
    });
  } catch (err) {
    console.error(err);
  }
}


// Initialize the experiment document with some basic essential information
exports.initializeDebugInfo = async (uniqueId, config) => {
  try{

    return DebugInfo.findOneAndUpdate(
        {
            uniqueId : uniqueId
          },
        {
          $set: {
            experimentId: config.experimentId
          },
        },
        {new: true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to initializeParticipant');
    console.error(err);
  }
}

// Add debug information to the chronological list
exports.addDebugInfo = async (uniqueId, infoObj) => {
  try{
    let update = {
      "$push":{

      }
    }
    update["$push"]["debugInfo"] = infoObj;
    return DebugInfo.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to add answer');
    console.error(err);
  }
}

exports.removeAllForExperiment = async experimentId => {
  try {
    return DebugInfo.deleteMany({ experimentId : experimentId });
  } catch (err) {
    console.error(err);
  }
}

// remove a single record by chat ID
exports.remove = async uniqueId => {
  try {
    return DebugInfo.deleteOne({ uniqueId });
  } catch (err) {
    console.error(err);
  }
}


