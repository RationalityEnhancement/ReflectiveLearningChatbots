const experimentUtils = require('../src/experimentUtils');
const { expect, assert } = require('chai')
const moment = require('moment-timezone');
const {getNowDateObject} = require("../src/experimentUtils");
const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig()


const map = {'1234': 0};
const relConditionSizes = [0.5, 0.5]
const relConditionSizes2 = [1, 1, 2];
const currentAssignments = [2,1];
const currentAssignments2 = [1,1,1]
const currentAssignments3 = [20,20,35]

describe('Condition assignment', () => {

	describe('Resolving assignment scheme', () => {
		let testPIDMap = {
			"123" : 0,
			"321" : 1
		}
		let testCondRatios = [1,1];
		it('returns balanced when balanced conditions are met', () => {
			let ass = experimentUtils.resolveAssignmentScheme("123", testPIDMap, "balanced", [1,1]);
			expect(ass).to.equal("balanced");
		})
		it('returns random when balanced conditions are not met', () => {
			let ass = experimentUtils.resolveAssignmentScheme("123", testPIDMap, "balanced", [0,0]);
			expect(ass).to.equal("random");
		})
		it('returns PID when both pid conditions are met', () => {
			let ass = experimentUtils.resolveAssignmentScheme("123", testPIDMap, "pid", [0,0]);
			expect(ass).to.equal("pid");
		});
		it('returns balanced when PID undefined are met but balanced cond met', () => {
			let ass = experimentUtils.resolveAssignmentScheme(undefined, testPIDMap, "pid", [1,1]);
			expect(ass).to.equal("balanced");
		})
		it('returns balanced when PID not in map but balanced cond met', () => {
			let ass = experimentUtils.resolveAssignmentScheme("egg", testPIDMap, "pid", [1,1]);
			expect(ass).to.equal("balanced");
		})
		it('returns balanced when PID map not valid but balanced cond met', () => {
			let ass = experimentUtils.resolveAssignmentScheme("123", undefined, "pid", [1,1]);
			expect(ass).to.equal("balanced");
		})
		it('returns random when PID condition not met and balanced cond not met', () => {
			let ass = experimentUtils.resolveAssignmentScheme("123", undefined, "pid", [0,0]);
			expect(ass).to.equal("random");
		})
		it('returns random when random selected', () => {
			let ass = experimentUtils.resolveAssignmentScheme("123", testPIDMap, "random", [1,1]);
			expect(ass).to.equal("random");
		})
	})
	describe('Fails appropriately', () => {
		it('Should pass when everything valid', () => {
			const result = experimentUtils.assignToCondition('1234', map, relConditionSizes, currentAssignments,"pid")
			expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
		});
		it('Should fail when assignmentScheme not valid', () => {
			const result = experimentUtils.assignToCondition('1234', map, relConditionSizes, currentAssignments,"george")
			expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
			expect(typeof result.data).to.equal("string");
		});

		it('Should fail when relConditionSizes undefined', () => {
			const result = experimentUtils.assignToCondition('1234', map, undefined, currentAssignments,"pid")
			expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
			expect(typeof result.data).to.equal("string");
		});
		it('Should fail when relConditionSizes empty', () => {
			const result = experimentUtils.assignToCondition('1234', map, [], currentAssignments,"pid")
			expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
			expect(typeof result.data).to.equal("string");
		});
		it('Should fail when relConditionSizes all zero', () => {
			const result = experimentUtils.assignToCondition('1234', map, [0,0], currentAssignments,"pid")
			expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
			expect(typeof result.data).to.equal("string");
		});
		it('Should fail when currentAssignments undefined', () => {
			const result = experimentUtils.assignToCondition('1234', map, relConditionSizes, undefined,"pid")
			expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
			expect(typeof result.data).to.equal("string");
		});
		it('Should fail when currentAssignments empty', () => {
			const result = experimentUtils.assignToCondition('1234', map, relConditionSizes, [],"pid")
			expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
			expect(typeof result.data).to.equal("string");
		});
		it('Should fail when currentAssignments and relConditionSizes unequal length', () => {
			const result = experimentUtils.assignToCondition('1234', map, relConditionSizes, currentAssignments2,"pid")
			expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
			expect(typeof result.data).to.equal("string");
		});
	})
	describe('Pid Map', () => {
		it('assigns to condition by PID successfully', () => {
			const result = experimentUtils.assignToCondition('1234', map, relConditionSizes, currentAssignments,"pid")
			expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			expect(result.data).to.equal(0);
		})
		it('assigns to condition by balanced when PID not recognized', () => {
			const result = experimentUtils.assignToCondition('1235', map, relConditionSizes, currentAssignments,"pid")
			expect(result.returnCode).to.equal(1);
			expect(result.data).to.equal(DevConfig.SUCCESS_CODE);
		})
	})
	describe('Natural assignment', () => {
		it('balances by condition - 1', () => {
			const result = experimentUtils.assignToCondition('1235', map, relConditionSizes, currentAssignments,"balanced")
			expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			expect(result.data).to.equal(1);
		})
		it('balances by condition - 2', () => {
			const result = experimentUtils.assignToCondition('1235', map, relConditionSizes2, currentAssignments2,"balanced")
			expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			expect(result.data).to.equal(2);
		})
		it('balances by condition - 3', () => {
			const result = experimentUtils.assignToCondition('1235', map, relConditionSizes2, currentAssignments3,"balanced")
			expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			expect(result.data).to.equal(2);
		})
		it('tends to the natural balance', () => {
			const numParts = 100;
			const curAssignments = [0,0,0];
			const conAssignments = [5,3,2];
		    
		    let relParts = conAssignments.reduce((a, b) => a + b, 0);
		    let relReqAssignments = conAssignments.map(n => parseFloat(n / relParts));

		    for(let i = 0; i < numParts; i++){
		    	let assignment = experimentUtils.assignToCondition('1235', map, conAssignments, curAssignments, "balanced");
		    	expect(assignment.returnCode).to.equal(DevConfig.SUCCESS_CODE);
		    	curAssignments[assignment.data] += 1;
		    }

		    let totalParts = curAssignments.reduce((a, b) => a + b, 0);
		    let relCurAssignments = curAssignments.map(n => parseFloat(n / totalParts));

		    let relDiffs = [];
		    for(let i=0; i < relCurAssignments.length; i++){
		      relDiffs.push(relReqAssignments[i] - relCurAssignments[i]);
		    }
		    expect(relDiffs.every(val => Math.abs(val) < 0.05)).to.be.true;
		})
	})
})

describe('Date functions', () => {
	describe('Get date object', () => {
		it('Should parse a moment date string properly (ahead of UTC)', () => {
			let dateString = "2022-04-29T01:32:34+02:00";
			let dateObjObj = experimentUtils.parseMomentDateString(dateString);
			let dateObj = dateObjObj.data;
			expect(dateObjObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			expect(dateObj.days).to.equal(29);
			expect(dateObj.years).to.equal(2022);
			expect(dateObj.months).to.equal(4);
			expect(dateObj.hours).to.equal(1);
			expect(dateObj.minutes).to.equal(32);
			expect(dateObj.seconds).to.equal(34);
			expect(dateObj.dayOfWeek).to.equal(5);

		})

		it('Should parse a moment date string properly (behind UTC)', () => {
			let dateString = "2022-05-24T01:32:34-02:00";
			let dateObjObj = experimentUtils.parseMomentDateString(dateString);
			let dateObj = dateObjObj.data;
			expect(dateObjObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			expect(dateObj.days).to.equal(24);
			expect(dateObj.years).to.equal(2022);
			expect(dateObj.months).to.equal(5);
			expect(dateObj.hours).to.equal(1);
			expect(dateObj.minutes).to.equal(32);
			expect(dateObj.seconds).to.equal(34);
			expect(dateObj.dayOfWeek).to.equal(2);
		})
	})
	describe('Get minutes diff', () => {
		it('Should work for same day, time2 > time1', () => {
			let time1 = {
				dayIndex: 1,
				time: "13:00"
			};
			let time2 = {
				dayIndex : 1,
				time: "15:48"
			}
			let diff = experimentUtils.getMinutesDiff(time1, time2);
			expect(diff).to.equal(2*60 + 48);
		})
		it('Should work for same day, time2 > time1, min1 > min2', () => {
			let time1 = {
				dayIndex: 1,
				time: "13:50"
			};
			let time2 = {
				dayIndex : 1,
				time: "15:48"
			}
			let diff = experimentUtils.getMinutesDiff(time1, time2);
			expect(diff).to.equal(60 + 58);
		})
		it('Should work for day2 > day1, time2 > time1', () => {
			let time1 = {
				dayIndex: 1,
				time: "13:00"
			};
			let time2 = {
				dayIndex : 4,
				time: "15:48"
			}
			let diff = experimentUtils.getMinutesDiff(time1, time2);
			expect(diff).to.equal(3 * 24 * 60 + 2*60 + 48);
		})
		it('Should work for day2 > day1, time2 < time1', () => {
			let time1 = {
				dayIndex: 1,
				time: "15:48"
			};
			let time2 = {
				dayIndex : 4,
				time: "13:00"
			}
			let diff = experimentUtils.getMinutesDiff(time1, time2);
			expect(diff).to.equal(3 * 24 * 60 - 2*60 - 48);
		})
		it('Should work for day1 > day2, time2 > time1', () => {
			let time1 = {
				dayIndex: 3,
				time: "13:00"
			};
			let time2 = {
				dayIndex : 1,
				time: "15:48"
			}
			let diff = experimentUtils.getMinutesDiff(time1, time2);
			expect(diff).to.equal(5 * 24 * 60 + 2*60 + 48);
		})
		it('Should work for day1 > day2, time2 < time1', () => {
			let time1 = {
				dayIndex: 3,
				time: "15:48"
			};
			let time2 = {
				dayIndex : 1,
				time: "13:00"
			}
			let diff = experimentUtils.getMinutesDiff(time1, time2);
			expect(diff).to.equal(5 * 24 * 60 - 2*60 - 48);
		})
		it('Should work for same day, time2 < time1', () => {
			let time1 = {
				dayIndex: 0,
				time: "15:48"
			};
			let time2 = {
				dayIndex : 0,
				time: "13:00"
			}
			let diff = experimentUtils.getMinutesDiff(time1, time2);
			expect(diff).to.equal(7 * 24 * 60 - 2*60 - 48);
		})
	})

})

describe('Rotate left', () => {
	describe('Rotate left by one', () => {
		it('Should rotate left normally', () => {
			let arr = [1,2,3,4,5];
			let newArr = experimentUtils.rotateLeftByOne(arr);
			expect(newArr).to.eql(arr);
			expect(arr.length).to.equal(5);
			expect(arr[0]).to.equal(2)
			expect(arr[4]).to.equal(1);
		})
		it('Should return empty if array is empty', () => {
			let arr = [];
			let newArr = experimentUtils.rotateLeftByOne(arr);
			expect(newArr).to.eql(arr);
			expect(arr).to.eql([])
		})
		it('Should return empty if arg not array', () => {
			let arr = "stimp";
			let newArr = experimentUtils.rotateLeftByOne(arr);
			expect(newArr).to.eql([])
		})
	})
	describe('Rotate left by many', () => {
		it('Should rotate left by one', () => {
			let arr = [1,2,3,4,5];
			let newArr = experimentUtils.rotateLeftByMany(arr, 1);
			expect(newArr).to.eql(arr);
			expect(arr.length).to.equal(5);
			expect(arr[0]).to.equal(2)
			expect(arr[4]).to.equal(1);
		})
		it('Should rotate left by two', () => {
			let arr = [1,2,3,4,5];
			let newArr = experimentUtils.rotateLeftByMany(arr, 2);
			expect(newArr).to.eql(arr);
			expect(arr.length).to.equal(5);
			expect(arr[0]).to.equal(3)
			expect(arr[4]).to.equal(2);
		})
		it('Should rotate left by zero', () => {
			let arr = [1,2,3,4,5];
			let newArr = experimentUtils.rotateLeftByMany(arr, 0);
			expect(newArr).to.eql(arr);
			expect(arr.length).to.equal(5);
			expect(arr[0]).to.equal(1)
			expect(arr[4]).to.equal(5);
		})
		it('Should rotate left more than array length', () => {
			let arr = [1,2,3,4,5];
			let newArr = experimentUtils.rotateLeftByMany(arr, 7);
			expect(newArr).to.eql(arr);
			expect(arr.length).to.equal(5);
			expect(arr[0]).to.equal(3)
			expect(arr[4]).to.equal(2);
		})
		it('Should return empty if array is empty', () => {
			let arr = [];
			let newArr = experimentUtils.rotateLeftByMany(arr, 1);
			expect(newArr).to.eql(arr);
			expect(arr).to.eql([])
		})
		it('Should return empty if arg not array', () => {
			let arr = "stimp";
			let newArr = experimentUtils.rotateLeftByMany(arr, 1);
			expect(newArr).to.eql([])
		})
	})
})

describe("Edit distance", () => {
	describe('Edit distance of two strings', () => {
		it('Should be 0', () => {
			let str1 = "test";
			let str2 = "test";
			let returnVal = experimentUtils.calcLevDistance(str1, str2);
			expect(returnVal).to.equal(0);
		})
		it('Should be 1', () => {
			let str1 = "test";
			let str2 = "est";
			let returnVal = experimentUtils.calcLevDistance(str1, str2);
			expect(returnVal).to.equal(1);
		})
		it('Should be 3', () => {
			let str1 = "saturday";
			let str2 = "sunday";
			let returnVal = experimentUtils.calcLevDistance(str1, str2);
			expect(returnVal).to.equal(3);
		})
		it('Should be length of str1', () => {
			let str1 = "saturday";
			let str2 = "";
			let returnVal = experimentUtils.calcLevDistance(str1, str2);
			expect(returnVal).to.equal(str1.length);
		})
		it('Should be length of str2', () => {
			let str1 = "";
			let str2 = "saturday";
			let returnVal = experimentUtils.calcLevDistance(str1, str2);
			expect(returnVal).to.equal(str2.length);
		})
	})
	describe('Find closest strings', () => {
		it('Should find top N strings (n < arr.length) ', () => {
			let str = "test";
			let strArr = ["tasty", "testy", "sporty"];
			let expectedArr = ["testy", "tasty"];
			let returnObj = experimentUtils.getClosestStrings(str, strArr, 2);
			expect(returnObj.returnCode).to.eql(DevConfig.SUCCESS_CODE);
			expect(returnObj.data).to.eql(expectedArr);
		})
		it('Should return sorted strings (n > arr.length) ', () => {
			let str = "test";
			let strArr = ["tasty", "testy", "sporty"];
			let expectedArr = ["testy", "tasty", "sporty"];
			let returnObj = experimentUtils.getClosestStrings(str, strArr, 4);
			expect(returnObj.returnCode).to.eql(DevConfig.SUCCESS_CODE);
			expect(returnObj.data).to.eql(expectedArr);
		})
		it('Should work when arr.length === 1', () => {
			let str = "test";
			let strArr = ["tasty"];
			let expectedArr = ["tasty"];
			let returnObj = experimentUtils.getClosestStrings(str, strArr, 4);
			expect(returnObj.returnCode).to.eql(DevConfig.SUCCESS_CODE);
			expect(returnObj.data).to.eql(expectedArr);
		})

		it('Should return top string (n < 1) ', () => {
			let str = "test";
			let strArr = ["tasty", "testy", "sporty"];
			let expectedArr = ["testy"];
			let returnObj = experimentUtils.getClosestStrings(str, strArr, 0);
			expect(returnObj.returnCode).to.eql(DevConfig.SUCCESS_CODE);
			expect(returnObj.data).to.eql(expectedArr);
		})

		it('Should fail when input not string ', () => {
			let str = 3;
			let strArr = ["tasty", "testy", "sporty"];
			let returnObj = experimentUtils.getClosestStrings(str, strArr, 2);
			expect(returnObj.returnCode).to.eql(DevConfig.FAILURE_CODE);
		})
		it('Should fail when one el of array not string ', () => {
			let str = "3";
			let strArr = ["tasty", 3, "sporty"];
			let returnObj = experimentUtils.getClosestStrings(str, strArr, 2);
			expect(returnObj.returnCode).to.eql(DevConfig.FAILURE_CODE);
		})
		it('Should fail when array empty ', () => {
			let str = "test";
			let strArr = [];
			let returnObj = experimentUtils.getClosestStrings(str, strArr, 2);
			expect(returnObj.returnCode).to.eql(DevConfig.FAILURE_CODE);
		})
		it('Should fail when not array ', () => {
			let str = "test";
			let strArr = "test";
			let returnObj = experimentUtils.getClosestStrings(str, strArr, 2);
			expect(returnObj.returnCode).to.eql(DevConfig.FAILURE_CODE);
		})

	})
})

describe('Image validation', () => {
	describe('General fails', () => {
		it('Should fail when image source type not present', async () => {
			let imageObj = {
				"source" : "data/test/images/cookie.jpg"
			}
			let returnObj = await experimentUtils.validateImageSource(imageObj);
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
		})
		it('Should fail when image source not present', async () => {
			let imageObj = {
				"sourceType" : "local",
			}
			let returnObj = await experimentUtils.validateImageSource(imageObj);
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
		})
		it('Should fail when image source type not string', async () => {
			let imageObj = {
				"sourceType" : 3,
				"source" : "data/test/images/cookie.jpg"
			}
			let returnObj = await experimentUtils.validateImageSource(imageObj);
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
		})
		it('Should fail when image source not string', async () => {
			let imageObj = {
				"sourceType" : "local",
				"source" : 3
			}
			let returnObj = await experimentUtils.validateImageSource(imageObj);
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
		})
		it('Should fail when image source type not valid', async () => {
			let imageObj = {
				"sourceType" : "locally",
				"source" : "data/test/images/cookie.jpg"
			}
			let returnObj = await experimentUtils.validateImageSource(imageObj);
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
		})
	})
	describe('Local', () => {
		it('Should validate local image', async () => {
			let imageObj = {
				"sourceType" : "local",
				"source" : "data/test/images/cookie.jpg"
			}
			let returnObj = await experimentUtils.validateImageSource(imageObj);
			expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE)
		})
		it('Should fail when file extension not image', async () => {
			let imageObj = {
				"sourceType" : "local",
				"source" : "data/test/images/bigimageURL.txt"
			}
			let returnObj = await experimentUtils.validateImageSource(imageObj);
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
		})
		it('Should fail when file doesnt exist', async () => {
			let imageObj = {
				"sourceType" : "local",
				"source" : "data/test/images/cookita.jpg"
			}
			let returnObj = await experimentUtils.validateImageSource(imageObj);
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
		})
	})
	describe('URL', () => {
		it('Should validate URL image', async () => {
			let imageObj = {
				"sourceType" : "url",
				"source" : "https://images.freeimages.com/images/large-previews/043/test-tube-1539259.jpg"
			}
			let returnObj = await experimentUtils.validateImageSource(imageObj);
			expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE)
		})
		it('Should fail when URL errors', async () => {
			let imageObj = {
				"sourceType" : "url",
				"source" : "http"
			}
			let returnObj = await experimentUtils.validateImageSource(imageObj);
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
		})
	})
})
describe('Time string operations', () => {
	describe("Validating time string", () => {
		it("Should validate normal time string", () => {
			let testStr = "04:23";
			let returnVal = experimentUtils.validateTimeString(testStr)
			assert(returnVal)
		})
		it("Should validate normal time string - min", () => {
			let testStr = "00:00";
			let returnVal = experimentUtils.validateTimeString(testStr)
			assert(returnVal)
		})
		it("Should validate normal time string - max", () => {
			let testStr = "23:59";
			let returnVal = experimentUtils.validateTimeString(testStr)
			assert(returnVal)
		})
		it("Should fail when hours invalid", () => {
			let testStr = "24:59";
			let returnVal = experimentUtils.validateTimeString(testStr)
			assert(!returnVal)
		})
		it("Should fail when mins invalid", () => {
			let testStr = "23:60";
			let returnVal = experimentUtils.validateTimeString(testStr)
			assert(!returnVal)
		})
		it("Should fail when length incorrect", () => {
			let testStr = "2459";
			let returnVal = experimentUtils.validateTimeString(testStr)
			assert(!returnVal)
		})
		it("Should fail when incorrect separator", () => {
			let testStr = "24-59";
			let returnVal = experimentUtils.validateTimeString(testStr)
			assert(!returnVal)
		})
		it("Should fail when hours doesn't have numbers", () => {
			let testStr = "ab:59";
			let returnVal = experimentUtils.validateTimeString(testStr)
			assert(!returnVal)
		})
		it("Should fail when mins doesn't have numbers", () => {
			let testStr = "23:cd";
			let returnVal = experimentUtils.validateTimeString(testStr)
			assert(!returnVal)
		})
		it("Should fail when not string", () => {
			let testStr = 23;
			let returnVal = experimentUtils.validateTimeString(testStr)
			assert(!returnVal)
		})
	})
	describe("Converting string to mins", () => {
		it("Should return normal time string - min", () => {
			let testStr = "00:00";
			let returnVal = experimentUtils.HHMMToMins(testStr)
			expect(returnVal).to.equal(0)
		})
		it("Should return normal time string - max", () => {
			let testStr = "23:59";
			let returnVal = experimentUtils.HHMMToMins(testStr)
			expect(returnVal).to.equal(23 * 60 + 59)
		})
		it("Should return normal time string - in between", () => {
			let testStr = "12:24";
			let returnVal = experimentUtils.HHMMToMins(testStr)
			expect(returnVal).to.equal(12 * 60 + 24)
		})
	})
	describe("Getting random time within range", () => {
		it('Should succeed within same hour', () => {
			let start = "04:12";
			let end = "04:33";
			let returnObj = experimentUtils.getRandomTimeInWindow(start, end);
			expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			let startMins = experimentUtils.HHMMToMins(start);
			let endMins = experimentUtils.HHMMToMins(end);
			let returnMins = experimentUtils.HHMMToMins(returnObj.data);
			assert(experimentUtils.validateTimeString(returnObj.data))
			assert(startMins <= returnMins && returnMins <= endMins);
		})
		it('Should succeed with different hours', () => {
			let start = "04:12";
			let end = "05:33";
			let returnObj = experimentUtils.getRandomTimeInWindow(start, end);
			expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			let startMins = experimentUtils.HHMMToMins(start);
			let endMins = experimentUtils.HHMMToMins(end);
			let returnMins = experimentUtils.HHMMToMins(returnObj.data);
			assert(experimentUtils.validateTimeString(returnObj.data))
			assert(startMins <= returnMins && returnMins <= endMins);
		})
		it('Should succeed with start mins less than end mins', () => {
			let start = "04:49";
			let end = "05:33";
			let returnObj = experimentUtils.getRandomTimeInWindow(start, end);
			expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			let startMins = experimentUtils.HHMMToMins(start);
			let endMins = experimentUtils.HHMMToMins(end);
			let returnMins = experimentUtils.HHMMToMins(returnObj.data);
			assert(experimentUtils.validateTimeString(returnObj.data))
			assert(startMins <= returnMins && returnMins <= endMins);
		})
		it('Should fail when start time greater than end time', () => {
			let start = "04:49";
			let end = "04:33";
			let returnObj = experimentUtils.getRandomTimeInWindow(start, end);
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

		})
	})
	describe("Getting hashed time within range", () => {
		it('Should return same time for same string', () => {
			let testString = "123456"
			let start = "04:12";
			let end = "04:33";

			let startMins = experimentUtils.HHMMToMins(start);
			let endMins = experimentUtils.HHMMToMins(end);

			let returnObj1 = experimentUtils.getHashedTimeInWindow(start, end, testString);
			expect(returnObj1.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			let returnMins1 = experimentUtils.HHMMToMins(returnObj1.data);
			console.log(returnObj1);
			assert(experimentUtils.validateTimeString(returnObj1.data))
			assert(startMins <= returnMins1 && returnMins1 <= endMins);

			let returnObj2 = experimentUtils.getHashedTimeInWindow(start, end, testString);
			expect(returnObj2.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			let returnMins2 = experimentUtils.HHMMToMins(returnObj2.data);
			assert(experimentUtils.validateTimeString(returnObj2.data))
			assert(startMins <= returnMins2 && returnMins2 <= endMins);

			expect(returnMins1).to.equal(returnMins2);
		})
		it('Should return different time for different string', () => {
			let testString1 = "123456"
			let testString2 = "1234567"
			let start = "04:12";
			let end = "04:33";

			let startMins = experimentUtils.HHMMToMins(start);
			let endMins = experimentUtils.HHMMToMins(end);

			let returnObj1 = experimentUtils.getHashedTimeInWindow(start, end, testString1);
			expect(returnObj1.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			let returnMins1 = experimentUtils.HHMMToMins(returnObj1.data);
			assert(experimentUtils.validateTimeString(returnObj1.data))
			assert(startMins <= returnMins1 && returnMins1 <= endMins);

			let returnObj2 = experimentUtils.getHashedTimeInWindow(start, end, testString2);
			expect(returnObj2.returnCode).to.equal(DevConfig.SUCCESS_CODE);
			let returnMins2 = experimentUtils.HHMMToMins(returnObj2.data);
			assert(experimentUtils.validateTimeString(returnObj2.data))
			assert(startMins <= returnMins2 && returnMins2 <= endMins);

			expect(returnMins1).to.not.equal(returnMins2);
		})

		it('Should fail when start time greater than end time', () => {
			let start = "04:49";
			let end = "04:33";
			let returnObj = experimentUtils.getHashedTimeInWindow(start, end, "abcde");
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
			console.log(returnObj.data);

		})
		it('Should fail when hash string not a string', () => {
			let start = "04:49";
			let end = "05:33";
			let returnObj = experimentUtils.getHashedTimeInWindow(start, end, 1234);
			expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
			console.log(returnObj.data);

		})
	})
})