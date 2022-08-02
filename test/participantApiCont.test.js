const { MongoMemoryServer } = require('mongodb-memory-server');

const participants = require('../src/apiControllers/participantApiController');

const ConfigReader = require('../src/configReader');
const config = ConfigReader.getExpConfig()

const mongo = require('mongoose');

const {assert, expect} = require('chai');

const moment = require('moment-timezone');


const testId = "123";
const testId2 = "321";
const testExptId = config.experimentId;
describe('Participant Controller API: ', () =>{
		

	it('Should connect to memory server', async () => {
		mongoServer = await MongoMemoryServer.create()
		try{
			await mongo.connect(mongoServer.getUri(), { dbName: "verifyMASTER" });
			console.log('\tConnection successful!');
		} catch (err) {
			console.log(err);
		}
		
		const result = mongo.connection.readyState;
		expect(result).to.equal(1);
	});
	
	it('Should add and get participant', async () => {
		
		await participants.add(testId);
		var participant = await participants.get(testId);
		expect(participant).to.not.be.null;
		expect(participant.uniqueId).to.equal(testId);
		
		
	});
	it('Should initialize a participant', async() => {
		const expectedParams = {
			"language": "English",
		};
		let savedPart = await participants.initializeParticipant(testId, config);
		let newPart = await participants.get(testId);
		expect(newPart['experimentId']).to.equal(testExptId);
		expect(newPart['parameters']['language']).to.eql(expectedParams.language);
		expect(newPart['currentState']).to.equal("starting");
		for(const [key,value] of Object.entries(config.mandatoryParameters)){
			console.log(key+": "+value);
			assert(key in newPart.parameterTypes);
			assert(newPart.parameterTypes[key] === value);
		}
		for(const [key,value] of Object.entries(config.customParameters)){
			assert(key in newPart.parameterTypes);
			assert(newPart.parameterTypes[key] === value);
		}
	})
	it('Should add and get participant - 2', async () => {

		await participants.add(testId2);
		let participant = await participants.get(testId2);
		expect(participant).to.not.be.null;
		expect(participant.uniqueId).to.equal(testId2);


	});
	it('Should initialize a participant - 2', async() => {

		const testDefaultLang = 'Shona';
		const expectedParams = {
			"language": "English",
		};
		let savedPart = await participants.initializeParticipant(testId2, config);
		let newPart = await participants.get(testId2);
		expect(newPart['experimentId']).to.equal(testExptId);
		expect(newPart['parameters']['language']).to.eql(expectedParams.language);
		expect(newPart['currentState']).to.equal("starting");
		for(const [key,value] of Object.entries(config.mandatoryParameters)){
			console.log(key+": "+value);
			assert(key in newPart.parameterTypes);
			assert(newPart.parameterTypes[key] === value);
		}
		for(const [key,value] of Object.entries(config.customParameters)){
			assert(key in newPart.parameterTypes);
			assert(newPart.parameterTypes[key] === value);
		}
	})
	it('Should get all participants by experiment ID', async() => {
		let pList = await participants.getByExperimentId(testExptId);
		expect(pList.length).to.equal(2);
		expect(pList[0].uniqueId).to.equal(testId);
		expect(pList[1].uniqueId).to.equal(testId2);
	})
	it('Should update Number field', async () => {
		
		const testCondIdx = 2;
		await participants.updateField(testId, 'conditionIdx', testCondIdx);
		
		let participant = await participants.get(testId)
		
		expect(participant.conditionIdx).to.equal(testCondIdx);
		
	});
	it('Should update String field', async () => {
		
		const testState = 'peem';
		await participants.updateField(testId, 'currentState', testState);
		
		let participant = await participants.get(testId)
		
		expect(participant.currentState).to.equal(testState);
		
	});

	it('Should update string parameter', async () => {
		
		const paramField = 'timezone';
		const paramValue = 'zbeengo';
		
		await participants.updateParameter(testId, paramField, paramValue);
		let part = await participants.get(testId);
		expect(part.parameters[paramField]).to.equal(paramValue);	
		
	});
	it('Should update number parameter', async () => {

		const paramField = 'testNum';
		const paramValue = 3;

		await participants.updateParameter(testId, paramField, paramValue);
		let part = await participants.get(testId);
		expect(part.parameters[paramField]).to.equal(paramValue);

	});
	it('Should update string stages parameter', async () => {

		const paramField = 'stageName';
		const paramValue = 'zbeengo';

		await participants.updateStageParameter(testId, paramField, paramValue);
		let part = await participants.get(testId);
		expect(part.stages[paramField]).to.equal(paramValue);

	});
	it('Should update number stages parameter', async () => {

		const paramField = 'stageDay';
		const paramValue = 3;

		await participants.updateStageParameter(testId, paramField, paramValue);
		let part = await participants.get(testId);
		expect(part.stages[paramField]).to.equal(paramValue);

	});
	it('Should clear stage parameter (num)', async () => {

		const paramField = 'stageDay';

		await participants.clearStageParam(testId, paramField);
		let part = await participants.get(testId);
		expect(part.stages[paramField]).to.equal(0);

	});
	it('Should clear stage parameter (str)', async () => {

		const paramField = 'stageName';

		await participants.clearStageParam(testId, paramField);
		let part = await participants.get(testId);
		expect(part.stages[paramField]).to.equal("");

	});

	it('Should add to parameter', async () => {

		const paramField = 'testStrArr';
		const paramValue = 'zbeengo';

		await participants.addToArrParameter(testId, paramField, paramValue);
		let part = await participants.get(testId);
		expect(part.parameters[paramField]).to.eql([paramValue]);

	});
	it('Should add to parameter - 2', async () => {

		const paramField = 'testStrArr';
		const paramValue = 'zbeengo2';

		await participants.addToArrParameter(testId, paramField, paramValue);
		let part = await participants.get(testId);
		expect(part.parameters[paramField]).to.eql(["zbeengo", paramValue]);

	});
	it('Should clear array param', async () => {

		const paramField = 'testStrArr';

		await participants.clearParamValue(testId, paramField);
		let part = await participants.get(testId);
		expect(part.parameters[paramField]).to.eql([]);

	});
	it('Should clear non array param (str)', async () => {

		const paramField = 'timezone';

		await participants.clearParamValue(testId, paramField);
		let part = await participants.get(testId);
		expect(part.parameters[paramField]).to.equal("");

	});
	it('Should clear non array param (num)', async () => {

		const paramField = 'testNum';

		await participants.clearParamValue(testId, paramField);
		let part = await participants.get(testId);
		expect(part.parameters[paramField]).to.equal(0);

	});

	it('Should add an answer', async () => {
		const testAnswer = {
			qId : "Zombotron",
			text: "Are you a zombie please?",
			askTimeStamp: moment.tz().format(),
			answerTimeStamp: moment.tz().format(),
			answer: ["yes","no","maybe so"]
		}
		await participants.addAnswer(testId, testAnswer);
		let participant = await participants.get(testId)
		// console.log(participant["answers"]);
		expect(participant["answers"][0]['qId']).to.eql(testAnswer.qId);
		expect(participant["answers"][0]['text']).to.eql(testAnswer.text);
		expect(participant["answers"][0]['askTimeStamp']).to.eql(testAnswer.askTimeStamp);
		expect(participant["answers"][0]['answerTimeStamp']).to.eql(testAnswer.answerTimeStamp);
		expect(participant["answers"][0]['answer']).to.eql(testAnswer.answer);
	});
	it('Should add an action', async () => {
		let oldParticipant = await participants.get(testId)
		oldParticipant['stages'].stageName = "Test-Stage"
		oldParticipant['stages'].stageDay = 69
		const testActionObj = {
			parameters: oldParticipant.parameters,
			stages : oldParticipant.stages,
			timeStamp: moment.tz().format(),
			actionObj: {
				aType: "testAction",
				args: ["testArgs1", "testArgs2"]
			},
			from: "test"
		}
		await participants.addAction(testId, testActionObj);
		let participant = await participants.get(testId)
		// console.log(participant["answers"]);
		// for(const [key, value] of participant.parameters){
		// 	expect(participant["actions"][0]['parameters'][key]).to.eql(value);
		// }
		expect(participant["actions"][0]['parameters']).to.eql(oldParticipant.parameters);
		expect(participant["actions"][0]['stages']['stageName']).to.eql(oldParticipant.stages.stageName);
		expect(participant["actions"][0]['stages']['stageDay']).to.eql(oldParticipant.stages.stageDay);
		expect(participant["actions"][0]['actionObj']['aType']).to.eql(testActionObj.actionObj.aType);
		expect(participant["actions"][0]['actionObj']['args']).to.eql(testActionObj.actionObj.args);
		expect(participant["actions"][0]['timeStamp']).to.eql(testActionObj.timeStamp);
		expect(participant["actions"][0]['from']).to.eql(testActionObj.from);
	});
	it('Should add to an array field', async () => {
		const testAnswer = {
			qId : "Zombotron2",
			text: "Are you a zombie please?",
			askTimeStamp: moment.tz().format(),
			answer: ["yes","no","maybe so"]
		}
		await participants.addToArrField(testId, "answers", testAnswer);
		let participant = await participants.get(testId)
		expect(participant["answers"].length).to.equal(2);
		expect(participant["answers"][1]['qId']).to.eql(testAnswer.qId);
		expect(participant["answers"][1]['text']).to.eql(testAnswer.text);
		expect(participant["answers"][1]['askTimeStamp']).to.eql(testAnswer.askTimeStamp);
		expect(participant["answers"][1]['answer']).to.eql(testAnswer.answer);
	});
	it('Should add stage activity', async () => {
		const testActivity = {
			name : "test",
			what : "add",
			when : "now"
		}
		await participants.addStageActivity(testId, testActivity);
		let participant = await participants.get(testId)
		expect(participant["stages"]["activity"].length).to.equal(1);
		expect(participant["stages"]["activity"][0]['name']).to.eql(testActivity.name);
		expect(participant["stages"]["activity"][0]['when']).to.eql(testActivity.when);
		expect(participant["stages"]["activity"][0]['what']).to.eql(testActivity.what);
	});
	const testQJob = {
		jobId: "testJobJa",
		qId : "speep.Zombotron",
		atTime: "10:00",
		onDays: ["Mon", "Tue", "Wed"]
	}
	it('Should add a scheduled question', async () => {

		await participants.addScheduledOperation(testId, "questions", testQJob);
		let participant = await participants.get(testId)
		let scheduledQs = participant["scheduledOperations"]["questions"];
		expect(scheduledQs[0]['jobId']).to.eql(testQJob.jobId);
		expect(scheduledQs[0]['qId']).to.eql(testQJob.qId);
		expect(scheduledQs[0]['atTime']).to.eql(testQJob.atTime);
		expect(scheduledQs[0]['onDays']).to.eql(testQJob.onDays);
	});
	it('Should have the scheduled question', async () => {
		let hasQ = await participants.hasScheduledOperation(testId, "questions", testQJob);
		assert(hasQ);
	})
	it('Should not have a question that wasnt scheduled', async () => {
		let fakeJob = {};
		fakeJob = Object.assign(fakeJob, testQJob);
		fakeJob.qId = "fakeQuestion";
		let hasQ = await participants.hasScheduledOperation(testId, "questions", fakeJob);
		assert(!hasQ);
	})
	it('Should not add the same scheduled question again', async () => {

		let participant = await participants.get(testId);
		expect(participant.scheduledOperations["questions"].length).to.equal(1);
		await participants.addScheduledOperation(testId, "questions", testQJob);
		participant = await participants.get(testId)
		expect(participant.scheduledOperations["questions"].length).to.equal(1);
	});
	it('Should return normally if removed question doesnt exist', async () => {
		let DBHasJob = (jobArray, jobId) => {
			let foundJob = false;
			for(let i = 0; i < jobArray.length; i++){
				if(jobArray[i]["jobId"] === jobId){
					foundJob = true;
					break;
				}
			}
			return foundJob;
		}
		await participants.removeScheduledOperation(testId, "questions",'fakeJobId');
		let participant = await participants.get(testId)
		let scheduledQs = participant["scheduledOperations"]["questions"];
		assert(DBHasJob(scheduledQs, testQJob.jobId));
	});
	it('Should remove a scheduled question', async () => {
		let DBHasJob = (jobArray, jobId) => {
			let foundJob = false;
			for(let i = 0; i < jobArray.length; i++){
				if(jobArray[i]["jobId"] === jobId){
					foundJob = true;
					break;
				}
			}
			return foundJob;
		}
		await participants.removeScheduledOperation(testId, "questions", testQJob.jobId);
		let participant = await participants.get(testId)
		let scheduledQs = participant["scheduledOperations"]["questions"];
		assert(!DBHasJob(scheduledQs, testQJob.jobId));
	});
	const testAJob = {
		jobId: "testActionJa",
		aType : "Zombotron",
		args : ["test1", "test2"],
		atTime: "10:00",
		onDays: ["Mon", "Tue", "Wed"]
	}
	it('Should add a scheduled action', async () => {

		await participants.addScheduledOperation(testId, "actions", testAJob);
		let participant = await participants.get(testId)
		let scheduledQs = participant["scheduledOperations"]["actions"];
		expect(scheduledQs[0]['jobId']).to.eql(testAJob.jobId);
		expect(scheduledQs[0]['aType']).to.eql(testAJob.aType);
		expect(scheduledQs[0]['args']).to.eql(testAJob.args);
		expect(scheduledQs[0]['atTime']).to.eql(testAJob.atTime);
		expect(scheduledQs[0]['onDays']).to.eql(testAJob.onDays);
	});
	it('Should have the scheduled question', async () => {
		let hasQ = await participants.hasScheduledOperation(testId, "actions", testAJob);
		assert(hasQ);
	})
	it('Should not have a question that wasnt scheduled', async () => {
		let fakeJob = {};
		fakeJob = Object.assign(fakeJob, testAJob);
		fakeJob.qId = "fakeQuestion";
		let hasQ = await participants.hasScheduledOperation(testId, "actions", fakeJob);
		assert(!hasQ);
	})
	it('Should not add the same scheduled action again', async () => {

		let participant = await participants.get(testId);
		expect(participant.scheduledOperations["actions"].length).to.equal(1);
		await participants.addScheduledOperation(testId, "actions", testAJob);
		participant = await participants.get(testId)
		expect(participant.scheduledOperations["actions"].length).to.equal(1);
	});
	it('Should return normally if removed action doesnt exist', async () => {
		let DBHasJob = (jobArray, jobId) => {
			let foundJob = false;
			for(let i = 0; i < jobArray.length; i++){
				if(jobArray[i]["jobId"] === jobId){
					foundJob = true;
					break;
				}
			}
			return foundJob;
		}
		await participants.removeScheduledOperation(testId, "actions",'fakeJobId');
		let participant = await participants.get(testId)
		let scheduledQs = participant["scheduledOperations"]["actions"];
		assert(DBHasJob(scheduledQs, testAJob.jobId));
	});
	it('Should remove a scheduled action', async () => {
		let DBHasJob = (jobArray, jobId) => {
			let foundJob = false;
			for(let i = 0; i < jobArray.length; i++){
				if(jobArray[i]["jobId"] === jobId){
					foundJob = true;
					break;
				}
			}
			return foundJob;
		}
		await participants.removeScheduledOperation(testId, "actions", testAJob.jobId);
		let participant = await participants.get(testId)
		let scheduledQs = participant["scheduledOperations"]["actions"];
		assert(!DBHasJob(scheduledQs, testAJob.jobId));
	});
	it('Should add an answer to current answer', async () => {

		await participants.addToCurrentAnswer(testId, "answer1");
		let participant = await participants.get(testId)
		let cAnswer = participant["currentAnswer"];
		expect(cAnswer).to.eql(["answer1"]);
	});
	it('Should add an answer to current answer 2', async () => {

		await participants.addToCurrentAnswer(testId, "answer2");
		let participant = await participants.get(testId)
		let cAnswer = participant["currentAnswer"];
		expect(cAnswer).to.eql(["answer1", "answer2"]);
	});
	it('Should add not add duplicate to current answer', async () => {

		await participants.addToCurrentAnswer(testId, "answer2");
		let participant = await participants.get(testId)
		let cAnswer = participant["currentAnswer"];
		expect(cAnswer).to.eql(["answer1", "answer2"]);
	});
	it('Should add erase the current answer', async () => {

		await participants.eraseCurrentAnswer(testId);
		let participant = await participants.get(testId)
		let cAnswer = participant["currentAnswer"];
		expect(cAnswer).to.eql([]);
	});


	it('Should remove participant', async () => {
		await participants.remove(testId);
		let participant = await participants.get(testId);
		expect(participant).to.be.null;
		
	});

	it('Should close connection', async () => {
		try
		{
			await mongo.connection.close();	
			console.log('\tConnection closed!')
		} catch(err) {
			console.log(err)
		}
		
		const result = mongo.connection.readyState;
		expect(result).to.equal(0);
	});
});
