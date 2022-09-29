const { MongoMemoryServer } = require('mongodb-memory-server');

const transcripts = require('../src/apiControllers/transcriptApiController');

const mongo = require('mongoose');
const moment = require("moment-timezone");

const expect = require('chai').expect;

const testId = '123';
const testId2 = '321';
const testExptId = 'testExptId';
describe('Transcript Controller API: ', () =>{
		

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
	
	it('Should add and get transcript doc', async () => {
		
		await transcripts.add(testId);
		let experiment = await transcripts.getCurrent(testId);
		expect(experiment).to.not.be.null;
		expect(experiment.uniqueId).to.equal(testId);
		
		
	});
	it('Should initialize an transcript doc', async() => {
		let savedExp = await transcripts.initializeTranscript(testId, testExptId);
		let newExp = await transcripts.getCurrent(testId);
		expect(newExp['experimentId']).to.equal(testExptId);
		expect(newExp['current']).to.equal(true);
		expect(newExp['start']).to.equal(true);
		expect(newExp['linkId']).to.not.be.undefined;
		expect(newExp['lastLinkId']).to.be.undefined;
	})
	it('Should add and get transcript doc - 2', async () => {

		await transcripts.add(testId2);
		let experiment = await transcripts.getCurrent(testId2);
		expect(experiment).to.not.be.null;
		expect(experiment.uniqueId).to.equal(testId2);


	});
	it('Should initialize an transcript doc - 2', async() => {
		let savedExp = await transcripts.initializeTranscript(testId2, testExptId);
		let newExp = await transcripts.getCurrent(testId2);
		expect(newExp['experimentId']).to.equal(testExptId);
		expect(newExp['current']).to.equal(true);
		expect(newExp['start']).to.equal(true);
		expect(newExp['linkId']).to.not.be.undefined;
		expect(newExp['lastLinkId']).to.be.undefined;
	})
	it('Should add a single message', async () => {
		const testAnswer = {
			message : "Zombotron1",
			from: "zombie?",
			timeStamp: moment.tz().format()
		}
		await transcripts.addMessages(testId, [testAnswer]);
		let participant = await transcripts.getCurrent(testId)
		// console.log(participant["messages"]);
		let lastIdx = participant["messages"].length - 1
		expect(participant["messages"][lastIdx]['message']).to.eql(testAnswer.message);
		expect(participant["messages"][lastIdx]['from']).to.eql(testAnswer.from);
		expect(participant["messages"][lastIdx]['timeStamp']).to.eql(testAnswer.timeStamp);
	});
	it('Should have not changed any other document', async () => {

		let participant = await transcripts.getCurrent(testId2)
		// console.log(participant["messages"]);
		expect(participant["messages"].length).to.eql(0);
	});

	let startLinkId;
	it('Should create a new node in the linked list with empty array', async () => {
		let currentDebugInfo = await transcripts.getCurrent(testId);
		startLinkId = currentDebugInfo.linkId;
		await transcripts.addNode(testId);
		let oldDebugInfo = await transcripts.getByLinkId(testId, currentDebugInfo.linkId)
		let newDebugInfo = await transcripts.getCurrent(testId);
		expect(oldDebugInfo.nextLinkId).to.equal(newDebugInfo.linkId);
		expect(newDebugInfo.nextLinkId).to.be.undefined;
		expect(newDebugInfo.start).to.equal(false);
		expect(oldDebugInfo.start).to.equal(true);
		expect(oldDebugInfo.messages.length).equal(1);
		expect(newDebugInfo.messages.length).equal(0);
	})
	let partDocs;
	it('Should get all documents for participant', async () => {
		partDocs = await transcripts.getAllForId(testId);
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
	it('Should add multiple answer objects to new node', async () => {
		const testAnswers = [
			{
				message : "Zombotron2",
				from: "user?",
				timeStamp: moment.tz().format()
			},
			{
				message : "Zombotron3",
				from: "zombie?",
				timeStamp: moment.tz().format()
			}
		]
		await transcripts.addMessages(testId, testAnswers);
		let participant = await transcripts.getCurrent(testId)
		// console.log(participant["messages"]);
		let lastIdx = participant["messages"].length - 1
		expect(participant["messages"][0]['message']).to.eql(testAnswers[0].message);
		expect(participant["messages"][0]['from']).to.eql(testAnswers[0].from);
		expect(participant["messages"][0]['timeStamp']).to.eql(testAnswers[0].timeStamp);

		expect(participant["messages"][1]['message']).to.eql(testAnswers[1].message);
		expect(participant["messages"][1]['from']).to.eql(testAnswers[1].from);
		expect(participant["messages"][1]['timeStamp']).to.eql(testAnswers[1].timeStamp);
	});

	it('Should not have added anything to old document', async () => {

		let transcript = await transcripts.getByLinkId(testId, startLinkId);
		expect(transcript.messages.length).to.equal(1)
		expect(transcript.messages[0].message).to.equal("Zombotron1")
	});


	it('Should build a single list of all messages from linked list', async () => {
		let list = await transcripts.getSingleList(testId);
		expect(list.length).to.equal(3);
		for(let i = 0; i < list.length; i++){
			expect(list[i].message).to.equal("Zombotron" + (i+1))
		}
	})
	it('Should remove answers for Id', async () => {
		await transcripts.removeAllForId(testId);
		let experiment = await transcripts.getCurrent(testId);
		expect(experiment).to.be.null;
	});
	it('Should not have removed debug infos for other Id', async () => {
		let experiment = await transcripts.getCurrent(testId2);
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
