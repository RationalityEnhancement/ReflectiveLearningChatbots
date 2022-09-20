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

// Get the current node of the linked list for participant with uniqueId
exports.getCurrent = async (uniqueId) => {
  try {
    return DebugInfo.findOne({ uniqueId: uniqueId, current: true });
  } catch (err) {
    console.error(err);
  }
}

exports.getAllForId = async (uniqueId) => {
  try {
    return DebugInfo.find({ uniqueId: uniqueId });
  } catch (err) {
    console.error(err);
  }
}

// Get a single document by linkId
exports.getByLinkId = async (uniqueId, linkId) => {
  try {
    return DebugInfo.findOne({ uniqueId: uniqueId, linkId: linkId });
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
//  Starts a new linked list
exports.add = async (uniqueId) => {
  try {
    return DebugInfo.create({
      uniqueId: uniqueId,
      current: true,
      start: true
    });
  } catch (err) {
    console.error(err);
  }
}

exports.generateLinkId = (uniqueId) => {
  let randInt = Math.floor(Math.random() * (99999999 - 10000000) + 10000000);
  return uniqueId + "_" + randInt;
}

// Initialize the experiment document with some basic essential information
exports.initializeDebugInfo = async (uniqueId, experimentId) => {
  try{
    let linkId = this.generateLinkId(uniqueId);

    return DebugInfo.findOneAndUpdate(
        {
            uniqueId : uniqueId
          },
        {
          $set: {
            experimentId: experimentId,
            linkId: linkId
          },
        },
        {new: true}
    );
  } catch(err){
    console.log('Debug API Controller: Unable to initializeDebug');
    console.error(err);
  }
}

// Creates a new node in the linked list of debug info for a given participant
//  and makes the new node current
exports.addNode = async(uniqueId) => {
  let currentDebugInfo = await DebugInfo.findOne({
    uniqueId: uniqueId,
    current: true
  })
  let currentLinkId = currentDebugInfo.linkId;
  let currentExperimentId = currentDebugInfo.experimentId;
  let newLinkId = this.generateLinkId(uniqueId);
  let writeOps = [
    {
      insertOne: {
        "document" : {
          "uniqueId": uniqueId,
          "experimentId": currentExperimentId,
          "current": true,
          "start" : false,
          "linkId": newLinkId,
        }
      }
    },
    {
      updateOne: {
        filter: {
          "uniqueId": uniqueId,
          "linkId": currentLinkId
        },
        update: {
          $set: {
            "current" : false,
            "nextLinkId": newLinkId
          }
        }
      }
    }
  ]

  return DebugInfo.bulkWrite(
      writeOps
  )

}

// Return a single list of debug info objects by re-constructing the linked list
exports.getSingleList = async (uniqueId) => {
  let allDocs = await DebugInfo.find({ uniqueId: uniqueId })
  let debugInfoList = []
  let currentDoc = allDocs.filter(doc => doc.start)[0]
  try{
    while(true){
      debugInfoList = debugInfoList.concat(currentDoc.debugInfo)
      let nextDocId = currentDoc.nextLinkId
      if(!nextDocId) break;
      currentDoc = allDocs.filter(doc => (doc.linkId === nextDocId))[0]
    }
    return debugInfoList;
  } catch(e) {
    console.log("No single list created for participant " + uniqueId + "\n" + e.message + "\n" + e.stack);
    return []
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
        { uniqueId: uniqueId, current: true },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Debug API Controller: Unable to add debug info');
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
exports.removeAllForId = async uniqueId => {
  try {
    return DebugInfo.deleteMany({ uniqueId });
  } catch (err) {
    console.error(err);
  }
}


