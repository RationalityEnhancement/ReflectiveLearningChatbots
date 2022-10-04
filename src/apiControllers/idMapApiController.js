/**
 * Class to write data about mappings between the telegram chat ID
 * and the automatically generated unique Id to the
 * MongoDB database
 *
 * Primary identifier of the idMapping document is the
 * experiment Id defined in the config file
 */

const { IDMap } = require('../models/IDMap');


// Get all mappings
exports.getAll = async () => {
  try {
    return IDMap.find();
  } catch (err) {
    console.error(err);
  }
}

//Get all mappings for a single experiment
exports.getAllForExperiment = async(experimentId) => {
  try{
    return IDMap.find({experimentId : experimentId});
  } catch(err){
    console.error(err);
  }
}

//Get all mappings for a single experiment
exports.getExperiment = async(experimentId) => {
  try{
    return IDMap.find({experimentId : experimentId})
        .then(allMaps => {
          return {
            experimentId: experimentId,
            IDMappings: allMaps.map(map => {
              return {
                chatId: map.chatId,
                uniqueId: map.uniqueId
              }
            })
          }
        })
  } catch(err){
    console.error(err);
  }
}

// Get a single user's mapping by telegram chatId
let getByChatId = async (experimentId, chatId) => {
  if(typeof chatId !== "number") return undefined;
  try {
    return IDMap.findOne( {
      experimentId : experimentId,
      chatId : chatId
    }).then(found => {
      return found;
    })
  } catch (err) {
    console.error(err);
  }
}
exports.getByChatId = getByChatId;

// Get a single user's mapping by bot-generated ID
let getByUniqueId = async (experimentId, uniqueId) => {
  try {
    if(typeof uniqueId !== "string") return undefined;
    return IDMap.findOne( {
      experimentId : experimentId,
      uniqueId : uniqueId
    }).then(found => {
      return found;
    })
  } catch (err) {
    console.error(err);
  }
}

exports.getByUniqueId = getByUniqueId;


// Checks if a given list of Id Mappings contains a given unique Id already
let hasChatId = (IDMappings, chatId) => {
  if(!Array.isArray(IDMappings)) return false;
  let foundChatId = false;
  for(let i = 0; i < IDMappings.length; i++){
    if(IDMappings[i].chatId === chatId){
      foundChatId = true;
      break;
    }
  }
  return foundChatId;
}
exports.hasChatId = hasChatId;

// Checks if a given list of Id Mappings contains a given unique Id already
let hasUniqueId = (IDMappings, uniqueId) => {
  if(!Array.isArray(IDMappings)) return false;
  let foundChatId = false;
  for(let i = 0; i < IDMappings.length; i++){
    if(IDMappings[i].uniqueId === uniqueId){
      foundChatId = true;
      break;
    }
  }
  return foundChatId;
}
exports.hasUniqueId = hasUniqueId;

// Generate a unique Id that doesn't exist already
let generateUniqueId = () => {
  let newId = Math.floor(Math.random() * (99999999 - 10000000) + 10000000);
  return ""+newId;
}
exports.generateUniqueId = generateUniqueId;

// Add a new Id Mapping if uniqueId doesn't already exist
// If uniqueId already exists, return undefined
// If chatID already exists, then update mapping
let addIDMapping = async (experimentId, chatId, uniqueId) => {
  try {
    return IDMap.findOne({
      experimentId: experimentId,
      uniqueId: uniqueId
    }).then(found => {
      if(found) return undefined;
      return IDMap.findOneAndUpdate({
        experimentId: experimentId,
        chatId: chatId
      }, {
        experimentId: experimentId,
        chatId: chatId,
        uniqueId: uniqueId
      },
          {upsert: true, new: true})
    })


  } catch (err) {
    console.error(err);
  }
}

exports.addIDMapping = addIDMapping;

// Update the uniqueId based on the telegram chatID
// Not updated to findOneAndUpdate because this isn't used.
let updateUniqueId = async (experimentId, chatId, uniqueId) => {
  
  try{
    return IDMap.findOneAndUpdate(
        {
          experimentId: experimentId,
          chatId: chatId
        },
        {
          experimentId: experimentId,
          chatId: chatId,
          uniqueId: uniqueId
        },
        { upsert: true, new: true }
    );
  } catch (err) {
    console.error(err);
  }
}
exports.updateUniqueId = updateUniqueId;

// Delete a mapping based on the chatId
// If it doesn't exist, do nothing
let deleteByChatId = async(experimentId, chatId) => {
  try{
    return IDMap.deleteOne(
        {
          experimentId: experimentId,
          chatId: chatId
        }
    )
  } catch (err) {
    console.error(err);
  }
}
exports.deleteByChatId = deleteByChatId;

// Delete a mapping based on the unique Id
// If it doesn't exist, do nothing.
let deleteByUniqueId = async(experimentId, uniqueId) => {
  try{
    return IDMap.deleteOne(
        {
          experimentId: experimentId,
          uniqueId: uniqueId
        }
    )
  } catch (err) {
    console.error(err);
  }
}
exports.deleteByUniqueId = deleteByUniqueId;

// Remove all documents
exports.removeAll = async () => {
  try {
    return IDMap.deleteMany({});
  } catch (err) {
    console.error(err);
  }
}

// Remove a single document by ID
exports.removeAllForExperiment = async experimentId => {
  try {
    experimentId = ""+experimentId;
    return IDMap.deleteMany({ experimentId: experimentId });
  } catch (err) {
    console.error(err);
  }
}
