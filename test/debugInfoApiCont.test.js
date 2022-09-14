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
		let experiment = await debugs.get(testId);
		expect(experiment).to.not.be.null;
		expect(experiment.uniqueId).to.equal(testId);
		
		
	});
	it('Should initialize an answer doc', async() => {
		let savedExp = await debugs.initializeDebugInfo(testId, testExptId);
		let newExp = await debugs.get(testId);
		expect(newExp['experimentId']).to.equal(testExptId);
	})
	it('Should add and get answer doc - 2', async () => {

		await debugs.add(testId2);
		let experiment = await debugs.get(testId2);
		expect(experiment).to.not.be.null;
		expect(experiment.uniqueId).to.equal(testId2);


	});
	it('Should initialize an answer doc - 2', async() => {
		let savedExp = await debugs.initializeDebugInfo(testId2, testExptId);
		let newExp = await debugs.get(testId2);
		expect(newExp['experimentId']).to.equal(testExptId);
	})
	it('Should add a debugInfo object', async () => {
		let oldParticipant = {
			"stages" : {

			},
			"scheduledOperations" : {
				"questions": [],
				"actions": [],
				"reminders": []
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
			from: "test"
		}
		await debugs.addDebugInfo(testId, testInfoObj);
		let participant = await debugs.get(testId)

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

		let participant = await debugs.get(testId2)
		// console.log(participant["answers"]);
		expect(participant["debugInfo"].length).to.eql(0);
	});

	it('Should remove experiment', async () => {
		await debugs.remove(testId);
		let experiment = await debugs.get(testId);
		expect(experiment).to.be.null;
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
