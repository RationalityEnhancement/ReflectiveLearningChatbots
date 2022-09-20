const { MongoMemoryServer } = require('mongodb-memory-server');

const debugs = require('../src/apiControllers/debugInfoApiController');

const mongo = require('mongoose');
const moment = require("moment-timezone");
const participants = require("../src/apiControllers/participantApiController");

const expect = require('chai').expect;


const testId = '123';
const testId2 = '321';
const testExptId = 'testExptId';
describe('Debug Info Controller API: ', () =>{
		

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
	
	it('Should add and get answer doc', async () => {
		
		await debugs.add(testId);
		let experiment = await debugs.getCurrent(testId);
		expect(experiment).to.not.be.null;
		expect(experiment.uniqueId).to.equal(testId);
		
		
	});
	it('Should initialize an answer doc', async() => {
		let savedExp = await debugs.initializeDebugInfo(testId, testExptId);
		let newExp = await debugs.getCurrent(testId);
		expect(newExp['experimentId']).to.equal(testExptId);
		expect(newExp['current']).to.equal(true);
		expect(newExp['start']).to.equal(true);
		expect(newExp['linkId']).to.not.be.undefined;
		expect(newExp['lastLinkId']).to.be.undefined;
	})
	it('Should add and get answer doc - 2', async () => {

		await debugs.add(testId2);
		let experiment = await debugs.getCurrent(testId2);
		expect(experiment).to.not.be.null;
		expect(experiment.uniqueId).to.equal(testId2);


	});
	it('Should initialize an answer doc - 2', async() => {
		let savedExp = await debugs.initializeDebugInfo(testId2, testExptId);
		let newExp = await debugs.getCurrent(testId2);
		expect(newExp['experimentId']).to.equal(testExptId);
		expect(newExp['current']).to.equal(true);
		expect(newExp['start']).to.equal(true);
		expect(newExp['linkId']).to.not.be.undefined;
		expect(newExp['lastLinkId']).to.be.undefined;
	})
	it('Should add a debugInfo object', async () => {
		let oldParticipant = {
			"stages" : {

			},
			"scheduledOperations" : {
				"questions": [],
				"actions": [],
				"reminders": []
			},
			"parameters" : {
				"language" : "English"
			}
		}
		oldParticipant['stages'].stageName = "Test-Stage"
		oldParticipant['stages'].stageDay = 69
		oldParticipant['scheduledOperations']['questions'] = [
			{
				jobId : "testJobId",
				qId: "testQiD",
				atTime : "testTime",
				onDays : ["Day1", "Day2"],
				if : "testIf",
				tz : "testTz"
			},
		]
		const testActionObj = {
			aType: "testAction",
			args: ["testArgs1", "testArgs2"]
		};
		const testInfoObj = {
			infoType: "action",
			scheduledOperations: oldParticipant.scheduledOperations,
			parameters: oldParticipant.parameters,
			stages : oldParticipant.stages,
			timeStamp: moment.tz().format(),
			info: [testActionObj.aType, ...testActionObj.args],
			from: "test1"
		}
		await debugs.addDebugInfo(testId, testInfoObj);
		let participant = await debugs.getCurrent(testId)

		expect(participant["debugInfo"][0]['parameters']).to.eql(oldParticipant.parameters);
		expect(participant["debugInfo"][0]['stages']['stageName']).to.eql(oldParticipant.stages.stageName);
		expect(participant["debugInfo"][0]['stages']['stageDay']).to.eql(oldParticipant.stages.stageDay);
		expect(participant["debugInfo"][0]['info'][0]).to.eql(testActionObj.aType);
		expect(participant["debugInfo"][0]['info'].slice(1)).to.eql(testActionObj.args);
		expect(participant["debugInfo"][0]['timeStamp']).to.eql(testInfoObj.timeStamp);
		expect(participant["debugInfo"][0]['from']).to.eql(testInfoObj.from);
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['jobId'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['jobId'])
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['qId'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['qId'])
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['atTime'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['atTime'])
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['onDays'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['onDays'])
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['tz'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['tz'])
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['if'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['if'])
	});
	it('Should have not changed any other document', async () => {

		let participant = await debugs.getCurrent(testId2)
		// console.log(participant["answers"]);
		expect(participant["debugInfo"].length).to.eql(0);
	});

	it('Should create a new node in the linked list with empty array', async () => {
		let currentDebugInfo = await debugs.getCurrent(testId);
		await debugs.addNode(testId);
		let oldDebugInfo = await debugs.getByLinkId(testId, currentDebugInfo.linkId)
		let newDebugInfo = await debugs.getCurrent(testId);
		expect(oldDebugInfo.nextLinkId).to.equal(newDebugInfo.linkId);
		expect(newDebugInfo.nextLinkId).to.be.undefined;
		expect(newDebugInfo.start).to.equal(false);
		expect(oldDebugInfo.start).to.equal(true);
		expect(oldDebugInfo.debugInfo.length).equal(1);
		expect(newDebugInfo.debugInfo.length).equal(0);
	})
	let partDocs;
	it('Should get all documents for participant', async () => {
		partDocs = await debugs.getAllForId(testId);
		expect(partDocs.length).to.equal(2)
		partDocs.forEach(doc => {
			expect(doc.uniqueId).to.equal(testId)
		})
	})
	it('Only one of the partDocs should be current', async () => {
		let currentCount = 0
		partDocs.forEach(doc => {
			if(doc.current) currentCount++;
		})
		expect(currentCount).to.equal(1);
	})
	it('Should add multiple debugInfo objects to new node', async () => {
		let oldParticipant = {
			"stages" : {

			},
			"scheduledOperations" : {
				"questions": [],
				"actions": [],
				"reminders": []
			},
			"parameters" : {
				"language" : "English"
			}
		}
		oldParticipant['stages'].stageName = "Test-Stage"
		oldParticipant['stages'].stageDay = 69
		oldParticipant['scheduledOperations']['questions'] = [
			{
				jobId : "testJobId",
				qId: "testQiD",
				atTime : "testTime",
				onDays : ["Day1", "Day2"],
				if : "testIf",
				tz : "testTz"
			},
		]
		const testActionObj = {
			aType: "testAction",
			args: ["testArgs1", "testArgs2"]
		};
		const testInfoObj2 = {
			infoType: "action",
			scheduledOperations: oldParticipant.scheduledOperations,
			parameters: oldParticipant.parameters,
			stages : oldParticipant.stages,
			timeStamp: moment.tz().format(),
			info: [testActionObj.aType, ...testActionObj.args],
			from: "test2"
		}
		const testInfoObj3 = {
			infoType: "action",
			scheduledOperations: oldParticipant.scheduledOperations,
			parameters: oldParticipant.parameters,
			stages : oldParticipant.stages,
			timeStamp: moment.tz().format(),
			info: [testActionObj.aType, ...testActionObj.args],
			from: "test3"
		}
		await debugs.addDebugInfo(testId, testInfoObj2);
		await debugs.addDebugInfo(testId, testInfoObj3);

		let participant = await debugs.getCurrent(testId)

		expect(participant["debugInfo"][0]['parameters']).to.eql(oldParticipant.parameters);
		expect(participant["debugInfo"][0]['stages']['stageName']).to.eql(oldParticipant.stages.stageName);
		expect(participant["debugInfo"][0]['stages']['stageDay']).to.eql(oldParticipant.stages.stageDay);
		expect(participant["debugInfo"][0]['info'][0]).to.eql(testActionObj.aType);
		expect(participant["debugInfo"][0]['info'].slice(1)).to.eql(testActionObj.args);
		expect(participant["debugInfo"][0]['timeStamp']).to.eql(testInfoObj2.timeStamp);
		expect(participant["debugInfo"][0]['from']).to.eql(testInfoObj2.from);
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['jobId'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['jobId'])
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['qId'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['qId'])
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['atTime'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['atTime'])
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['onDays'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['onDays'])
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['tz'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['tz'])
		expect(participant["debugInfo"][0]['scheduledOperations']['questions'][0]['if'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['if'])

		expect(participant["debugInfo"][1]['parameters']).to.eql(oldParticipant.parameters);
		expect(participant["debugInfo"][1]['stages']['stageName']).to.eql(oldParticipant.stages.stageName);
		expect(participant["debugInfo"][1]['stages']['stageDay']).to.eql(oldParticipant.stages.stageDay);
		expect(participant["debugInfo"][1]['info'][0]).to.eql(testActionObj.aType);
		expect(participant["debugInfo"][1]['info'].slice(1)).to.eql(testActionObj.args);
		expect(participant["debugInfo"][1]['timeStamp']).to.eql(testInfoObj3.timeStamp);
		expect(participant["debugInfo"][1]['from']).to.eql(testInfoObj3.from);
		expect(participant["debugInfo"][1]['scheduledOperations']['questions'][0]['jobId'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['jobId'])
		expect(participant["debugInfo"][1]['scheduledOperations']['questions'][0]['qId'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['qId'])
		expect(participant["debugInfo"][1]['scheduledOperations']['questions'][0]['atTime'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['atTime'])
		expect(participant["debugInfo"][1]['scheduledOperations']['questions'][0]['onDays'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['onDays'])
		expect(participant["debugInfo"][1]['scheduledOperations']['questions'][0]['tz'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['tz'])
		expect(participant["debugInfo"][1]['scheduledOperations']['questions'][0]['if'])
			.to.eql(oldParticipant.scheduledOperations['questions'][0]['if'])
	});
	it('Should build a single list of all debug infos from linked list', async () => {
		let list = await debugs.getSingleList(testId);
		expect(list.length).to.equal(3);
		for(let i = 0; i < list.length; i++){
			expect(list[i].from).to.equal("test" + (i+1))
		}
	})
	it('Should remove debug infos for Id', async () => {
		await debugs.removeAllForId(testId);
		let experiment = await debugs.getCurrent(testId);
		expect(experiment).to.be.null;
	});
	it('Should not have removed debug infos for other Id', async () => {
		let experiment = await debugs.getCurrent(testId2);
		expect(experiment).to.not.be.null;
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
