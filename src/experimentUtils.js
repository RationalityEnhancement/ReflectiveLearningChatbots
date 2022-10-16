const moment = require('moment-timezone')
const ReturnMethods = require('./returnMethods')
const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();
const fs = require('fs');
const path = require('path');
const request = require('request');

/**
 * Selects the appropriate condition assignment depending on whether the
 * conditions of variables are met for that condition assignment
 *
 * @param participantId the Id of the participant
 * @param pidMap mapping between Ids and condition indices
 * @param assignmentScheme the assignment scheme specified in the config file ("pid", "balanced", "random")
 * @param currentAssignments list of number of participant currently assigned to each condition
 */
let resolveAssignmentScheme = (participantId, pidMap, assignmentScheme, currentAssignments) => {
  let newAssScheme = assignmentScheme;
  // Assigning by PID map
  if(newAssScheme === "pid"){
    // If the PID map doesn't exist, assign balanced
    //  or if the mapping for that participant ID does not exist in PID map
    if(!pidMap){
      newAssScheme = "balanced";
    } else if(!(participantId in pidMap)) {
      newAssScheme = "balanced";
    }
  }
  // If no participants are assigned currently for balancing, assign at random
  if(newAssScheme === "balanced"){
    if(!currentAssignments.some(val => val > 0)){
      newAssScheme = "random";
    }
  }
  return newAssScheme;
}
module.exports.resolveAssignmentScheme = resolveAssignmentScheme;
/**
  Assigns to an experiment condition based on input parameters. If there exists
  a pre-existing mapping between PID and condition number, return that. Otherwise
  assigned randomly to one of the conditions, or balance according to the 
  given condition assignment ratios.

  In:
    participantId -> Id of participant
    pidMap -> object mapping PIDs to condition indices
    relConditionSizes -> array of same length containing ratios of group
                            sizes
    currentAssignment -> array of same length containing number of participants
                          already assigned to each corresponding condition
    assignmentScheme -> "balanced", "random", or "pid"

  Out:
    index of the assigned condition, selected according to the above scheme. If PID
    exists in numbers are exceeded 

*/
module.exports.assignToCondition = (participantId, pidMap, relConditionSizes, currentAssignments, assignmentScheme) => {
  // Error handling
  if(!DevConfig.validAssignmentSchemes.includes(assignmentScheme)){
    return ReturnMethods.returnFailure("ExpUtils: assignmentScheme invalid for condition assignment")
  }
  if(!relConditionSizes || relConditionSizes.length === 0 || !relConditionSizes.some(val => val > 0)){
    return ReturnMethods.returnFailure("ExpUtils: condition ratios invalid for condition assignment")
  }
  if(!currentAssignments || currentAssignments.length === 0){
    return ReturnMethods.returnFailure("ExpUtils: current assignments invalid for condition assignment")
  }
  if(relConditionSizes.length !== currentAssignments.length){
    return ReturnMethods.returnFailure("ExpUtils: condition ratios and current assignment do not match length")
  }

  let assScheme = resolveAssignmentScheme(participantId, pidMap,assignmentScheme, currentAssignments);
  if(assScheme === "pid"){
    return ReturnMethods.returnSuccess(pidMap[participantId]);
  } else if(assScheme === "balanced"){
    let totalParts = currentAssignments.reduce((a, b) => a + b, 0);
    let relCurAssignments = currentAssignments.map(n => parseFloat(n / totalParts));
    
    let relParts = relConditionSizes.reduce((a, b) => a + b, 0);
    let relReqAssignments = relConditionSizes.map(n => parseFloat(n / relParts));

    let relDiffs = [];
    for(let i=0; i < relCurAssignments.length; i++){
      relDiffs.push(relReqAssignments[i] - relCurAssignments[i]);
    }
    return ReturnMethods.returnSuccess(relDiffs.indexOf(Math.max(...relDiffs)));
  } else {
    return ReturnMethods.returnSuccess(Math.floor(Math.random() * relConditionSizes.length));
  }
}

/**
 * Takes a moment date string (moment.tz().format()) and converts it into a date object to access
 *  the numbers directly
 *
 * @param dateString moment date string of the format "YYYY-MM-DDTHH:MM:SS+OH:OM" (OH, OM = offset hours, minutes)
 *                                                 or "YYYY-MM-DDTHH:MM:SS-OH:OM"
 * @returns {{}} date object with following int properties: hours, minutes, seconds, years, months, days
 */

let parseMomentDateString = (dateString) => {
  let dateObj = {},date,time;
  try{
    let dateTimeSplit = dateString.split(/[T]/)
    date = dateTimeSplit[0];
    time = dateTimeSplit[1];
  } catch(e){
    let errorMsg = "ExpUtils: moment string cannot be split"
    ReturnMethods.returnFailure(errorMsg);
  }
  try{
    let dateSplit = date.split('-');
    dateObj.years = parseInt(dateSplit[0]);
    dateObj.months = parseInt(dateSplit[1]);
    dateObj.days = parseInt(dateSplit[2]);
  } catch(e){
    let errorMsg = "ExpUtils: date cannot be split properly"
    ReturnMethods.returnFailure(errorMsg);
  }

  try{
    let timeSplit = time.split(/[-\+:]/);
    dateObj.hours = parseInt(timeSplit[0]);
    dateObj.minutes = parseInt(timeSplit[1]);
    dateObj.seconds = parseInt(timeSplit[2]);
  } catch(e){
    let errorMsg = "ExpUtils: time cannot be split appropriately"
    ReturnMethods.returnFailure(errorMsg);
  }

  let jsDate = new Date();
  jsDate.setDate(dateObj.days);
  jsDate.setMonth(dateObj.months-1);
  jsDate.setFullYear(dateObj.years);

  dateObj.dayOfWeek = jsDate.getDay();

  return ReturnMethods.returnSuccess(dateObj);
}

module.exports.parseMomentDateString = parseMomentDateString;

/**
 * Takes a given timezone in tz-database format and returns a date object
 *
 * @param timezone string in tz database format (see Wikipedia)
 * @returns {{}} date object with following int properties: hours, minutes, seconds, years, months, days
 */
module.exports.getNowDateObject = (timezone) => {
  let now = moment.tz(timezone);
  let dateObj = parseMomentDateString(now.format());

  return dateObj.data;
}
/**
 * Takes an array and rotates in place to the left by one
 * Takes the first item and appends it to the end while preserving the length
 *
 * @param array array to be rotated
 */
module.exports.rotateLeftByOne = (array) => {
  if(!Array.isArray(array)) return [];
  if(array.length === 0) return [];
  let el = array.shift();
  array.push(el);
  return array;
}

/**
 * Takes an array and rotates in place to the left by one
 * Takes the first item and appends it to the end while preserving the length
 *
 * @param array array to be rotated
 */
module.exports.rotateLeftByMany = (array, count) => {
  if(!Array.isArray(array)) return [];
  if(array.length === 0) return [];
  for(let i = 0; i < count; i++){
    this.rotateLeftByOne(array);
  }
  return array;

}

/**
 *
 * Get the difference in minutes between two objects:
 *
 * {
 *     dayIndex: 0 - 6 (Sun - Sat)
 *     time: 00:00 - 24:00
 * }
 *
 * @param obj1 first time point
 * @param obj2 second time point (assumed to be after)
 */
module.exports.getMinutesDiff = (obj1, obj2) => {
  let day1 = obj1.dayIndex;
  let day2 = obj2.dayIndex;

  let hrs1 = parseInt(obj1.time.substring(0,2));
  let mins1 = parseInt(obj1.time.substring(3));

  let day1mins = hrs1 * 60 + mins1;

  let hrs2 = parseInt(obj2.time.substring(0,2));
  let mins2 = parseInt(obj2.time.substring(3));
  let day2mins = hrs2 * 60 + mins2;

  if(day2 < day1 || (day2 === day1 && day2mins <= day1mins)){
    day2 += 7;
  }

  let totalMins1 = day1 * 24 * 60 + day1mins;
  let totalMins2 = day2 * 24 * 60 + day2mins;

  return totalMins2 - totalMins1;

}

/**
 *
 * Calculate the levenshtein (edit) distance between two strings using the
 * naive recursive method
 *
 * @param str1
 * @param str2
 * @param depth
 * @returns {number|*}
 */
module.exports.calcLevDistance = (str1, str2, depth=0) => {
  // console.log('  '.repeat(depth) + 'Comparing:');
  // console.log('  '.repeat(depth) +str1);
  // console.log('  '.repeat(depth) + str2);
  // console.log('\n')
  if(str1.length === 0){
    return str2.length;
  }
  if(str2.length === 0){
    return str1.length;
  }
  if(str1.charAt(0) === str2.charAt(0)){
    return this.calcLevDistance(str1.substring(1), str2.substring(1), depth+1);
  }
  return 1 + Math.min(
      this.calcLevDistance(str1.substring(1), str2, depth+1),
      this.calcLevDistance(str1, str2.substring(1), depth+1),
      this.calcLevDistance(str1.substring(1), str2.substring(1), depth+1),
  )
}

/**
 *
 * From a list of strings (strArr), find the 'num' closest strings (edit distance) to the
 * input string (str)
 *
 * @param str input string
 * @param strArr array of strings to compare
 * @param num number of closest strings to fetch
 * @returns {{returnCode: number, data: *}}
 */
module.exports.getClosestStrings = (str, strArr, num) => {

  if(typeof str !== "string") return ReturnMethods.returnFailure("ExpUtils: must be string to calculate edit dist");
  if(!Array.isArray(strArr) ||
      strArr.length === 0 ||
      !strArr.every(el => typeof el === "string")
  ) {
    return ReturnMethods.returnFailure("ExpUtils: must be non-empty array of strings to find closest strings");
  }
  if(typeof num !== "number") return ReturnMethods.returnFailure("ExpUtils: # of top strings must be number");
  if(num < 1) num = 1
  if(num > strArr.length) num = strArr.length
  let newStrArr = strArr.slice();
  str = str.toLowerCase();
  let distArr = [];
  newStrArr.forEach(el => {
    el = el.toLowerCase();
    distArr.push(this.calcLevDistance(str, el));
  })

  let indices = new Array(distArr.length);
  for (let i = 0; i < distArr.length; ++i) indices[i] = i;
  indices.sort(function (a, b) { return distArr[a] < distArr[b] ? -1 : distArr[a] > distArr[b] ? 1 : 0; });

  let sortedByDist = indices.map(idx => newStrArr[idx]);
  return ReturnMethods.returnSuccess(sortedByDist.splice(0, num));

}

/**
 *
 * Validates an image source object of the type
 * {
 *     sourceType : "local" or "url"
 *     source : path to file from working directory or URL of image
 * }
 *
 * If image is URL, only checks whether URL returns a response (i.e., not dead)
 *  Does not validate if the URL is a valid image!
 *  Does not validate image size or dimensions!
 *
 */
module.exports.validateImageSource = async (imageSourceObj) => {
  if(!imageSourceObj.sourceType || !DevConfig.VALID_IMAGE_SOURCE_TYPES.includes(imageSourceObj.sourceType)){
    return ReturnMethods.returnFailure("ExpUtils: image source type " + imageSourceObj.sourceType+ " not valid!");
  }
  if(!imageSourceObj.source){
    return ReturnMethods.returnFailure("ExpUtils: image source must have source type!");
  }
  if(!(typeof imageSourceObj.sourceType === "string") || !(typeof imageSourceObj.source === "string")){
    return ReturnMethods.returnFailure("ExpUtils: image source and source type must be strings!");
  }
  switch(imageSourceObj.sourceType){
    case "local":
      if(!fs.existsSync(imageSourceObj.source)){
        return ReturnMethods.returnFailure(
            "ExpUtils: Source " + imageSourceObj.source + " is not a valid file!"
        );
      }
      if(!DevConfig.VALID_IMAGE_EXTENSIONS.includes(path.extname(imageSourceObj.source))){
        return ReturnMethods.returnFailure(
            "ExpUtils: Source " + imageSourceObj.source + " does not have a valid image extension!"
        );
      }
      return ReturnMethods.returnSuccess(imageSourceObj.source);
    case "url":
      try{
        let response = await request(imageSourceObj.source);
        return ReturnMethods.returnSuccess(imageSourceObj.source)
      } catch(e){
        return ReturnMethods.returnFailure(
            "ExpUtils: " + imageSourceObj.source + " is not a valid URL"
        )
      }
  }
}


module.exports.validateTimeString = (timeString) => {
  if(typeof timeString !== "string") return false;
  if(timeString.length !== 5) return false;
  let split = timeString.split(":")
  if(split.length !== 2) return false;
  if(!split.every(time => !isNaN(time))) return false;
  if(parseInt(split[0]) > 23 || parseInt(split[0]) < 0) return false;
  if(parseInt(split[1]) > 59 || parseInt(split[1]) < 0) return false;
  return true;
}

module.exports.HHMMToMins = (str) => {
  let split = str.split(":").map(t => parseInt(t));
  return split[0] * 60 + split[1]
}

module.exports.minsToHHMM = (totalMins) => {
  let hrs = Math.floor(totalMins / 60);
  let mins = totalMins % 60;
  return (hrs <= 9 ? "0"+hrs : hrs) + ":" + (mins <= 9 ? "0"+mins : mins)
}
/**
 *
 * Select a random time within a window
 *
 * @param start HH:MM start of time window
 * @param end HH:MM end of time window
 * @returns {{returnCode: number, data: *}}
 */
module.exports.getRandomTimeInWindow = (start, end) => {
  if(!this.validateTimeString(start) || !this.validateTimeString(end)){
    return ReturnMethods.returnFailure("Expt.Utils: time strings must be HH:MM. Received: " + start + ", " + end);
  }

  let startMins = this.HHMMToMins(start);
  let endMins = this.HHMMToMins(end)
  if(startMins > endMins){
    return ReturnMethods.returnFailure("Expt. Utils: start time must be smaller than end time. Received: " + start + ", " + end)
  }
  let newMins = Math.floor(Math.random() * (endMins - startMins) + startMins)

  return ReturnMethods.returnSuccess(this.minsToHHMM(newMins));

}

/**
 *
 * Get a time in a given window based on the hashcode of a passed in string.
 * Same string will return the same time each time.
 *
 *
 * @param start HH:MM start of time window
 * @param end HH:MM end of time window
 * @param str string whose hashcode is to be used to get the time
 *
 * @returns {{returnCode: number, data: *}}
 */
module.exports.getHashedTimeInWindow = (start, end, str) => {
  if(typeof str !== "string"){
    return ReturnMethods.returnFailure("Expt.Utils: hash strings must be a string");
  }
  if(!this.validateTimeString(start) || !this.validateTimeString(end)){
    return ReturnMethods.returnFailure("Expt.Utils: time strings must be HH:MM. Received: " + start + ", " + end);
  }
  let hashCode = function(str) {
    var hash = 0,
        i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
  let startMins = this.HHMMToMins(start);
  let endMins = this.HHMMToMins(end)
  if(startMins > endMins){
    return ReturnMethods.returnFailure("Expt. Utils: start time must be smaller than end time. Received: " + start + ", " + end)
  }
  let numOptions = endMins - startMins;
  let selectedOption = Math.abs(hashCode(str)) % numOptions;
  let newMins = startMins + selectedOption;

  return ReturnMethods.returnSuccess(this.minsToHHMM(newMins));

}

module.exports.getStageUpdateTime = (hashString = undefined) => {
  let start = DevConfig.STAGE_UPDATE_WINDOW.START
  let end = DevConfig.STAGE_UPDATE_WINDOW.END

  let returnObj;
  if(!hashString){
    returnObj = this.getRandomTimeInWindow(start, end);
  } else {
    returnObj = this.getHashedTimeInWindow(start, end, hashString)
  }
  if(returnObj.returnCode === DevConfig.FAILURE_CODE){
    return start;
  } else {
    return returnObj.data
  }
}