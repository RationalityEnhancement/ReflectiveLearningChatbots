/**
 * Class to write data about the current participant interaction transcripts to the
 * MongoDB database.
 *
 * Primary identifier of a participant document is the
 * Telegram chat id
 */

const { Transcript } = require('../models/Transcript');

// Get all documents
exports.getAll = async () => {
  try {
    return Transcript.find();
  } catch (err) {
    console.error(err);
  }
}

// Get the current linked list node
exports.getCurrent = async (uniqueId) => {
  try {
    return Transcript.findOne({ uniqueId: uniqueId, current: true });
  } catch (err) {
    console.error(err);
  }
}

// Get all the linked list nodes for participant with uniqueId
exports.getAllForId = async (uniqueId) => {
  try {
    return Transcript.find({ uniqueId: uniqueId });
  } catch (err) {
    console.error(err);
  }
}

exports.getByExperimentId = async (experimentId) => {
  try {
    return Transcript.find({ experimentId: experimentId });
  } catch(err) {
    console.error(err);
  }
}

// Get a single document by linkId
exports.getByLinkId = async (uniqueId, linkId) => {
  try {
    return Transcript.findOne({ uniqueId: uniqueId, linkId: linkId });
  } catch (err) {
    console.error(err);
  }
}

// Add a new document with a given chat ID
//  Starts a new linked list
exports.add = async (uniqueId) => {
  try {

    return Transcript.create({
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
exports.initializeTranscript = async (uniqueId, experimentId) => {
  try{
    let linkId = this.generateLinkId(uniqueId);
    return Transcript.findOneAndUpdate(
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
    console.log('Answer API Controller: Unable to initializeAnswers');
    console.error(err);
  }
}

// Add multiple messages to the end of a chronological list of messages
// exchanged between the participant and bot
//  Adds to the current node of the linked list
exports.addMessages = async (uniqueId, messages) => {
  try{
    let update = {
      $push:{
        "messages" : {
          $each : messages
        }
      }
    };

    return Transcript.findOneAndUpdate(
        { uniqueId: uniqueId, current: true },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Answer API Controller: Unable to add answer');
    console.error(err);
  }
}

// Creates a new node in the linked list of answers for a given participant
//  and makes the new node current
exports.addNode = async(uniqueId) => {
  let currentTranscript = await Transcript.findOne({
    uniqueId: uniqueId,
    current: true
  })
  let currentLinkId = currentTranscript.linkId;
  let currentExperimentId = currentTranscript.experimentId;
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

  return Transcript.bulkWrite(
      writeOps
  )

}

// Return a single list of transcript objects by re-constructing the linked list
exports.getSingleList = async (uniqueId) => {
  let allDocs = await Transcript.find({ uniqueId: uniqueId })
  let messageList = []
  let currentDoc = allDocs.filter(doc => doc.start)[0]
  try{
    while(true){
      messageList = messageList.concat(currentDoc.messages)
      let nextDocId = currentDoc.nextLinkId
      if(!nextDocId) break;
      currentDoc = allDocs.filter(doc => (doc.linkId === nextDocId))[0]
    }
    return messageList;
  } catch(e) {
    console.log("No single list created for participant " + uniqueId + "\n" + e.message + "\n" + e.stack);
    return []
  }

}

exports.removeAllForExperiment = async experimentId => {
  try {
    return Transcript.deleteMany({ experimentId : experimentId });
  } catch (err) {
    console.error(err);
  }
}

// remove a single record by chat ID
exports.removeAllForId = async uniqueId => {
  try {
    return Transcript.deleteMany({ uniqueId: uniqueId });
  } catch (err) {
    console.error(err);
  }
}


