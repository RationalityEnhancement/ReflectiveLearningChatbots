const { MongoMemoryServer } = require('mongodb-memory-server');

const idMaps = require('../src/apiControllers/idMapApiController');

const mongo = require('mongoose');

const { expect, assert } = require('chai');


const testExperimentId = '12345';
const testMappings = [{
	chatId : "123",
	uniqueId: "66465367"
},
{
	chatId : "234",
	uniqueId: "88486631"
},
{
	chatId : "345",
	uniqueId: "72737529"
}];

describe('ID Mappings API: ', () =>{
		
	describe('Connection to DB' ,() => {
		it('Should connect to memory server', async () => {
			let mongoServer = await MongoMemoryServer.create()
			try{
				await mongo.connect(mongoServer.getUri(), { dbName: "verifyMASTER" });
				console.log('\tConnection successful!');
			} catch (err) {
				console.log(err);
			}

			const result = mongo.connection.readyState;
			expect(result).to.equal(1);
		});

		it('Should add and get experiment', async () => {

			await idMaps.addExperiment(testExperimentId);
			let experiment = await idMaps.getExperiment(testExperimentId);
			expect(experiment).to.not.be.null;
			expect(experiment.experimentId).to.equal(testExperimentId);


		});
	})

	describe('Check if list of mappings has IDs', () => {

		it('Should return true when chat ID present', () => {
			assert(idMaps.hasChatId(testMappings, "123"))
			assert(idMaps.hasChatId(testMappings, "234"))
		})
		it('Should return false when chat ID not present', () => {
			assert(!idMaps.hasChatId(testMappings, "2134"))
		})
		it('Should return true when unique ID present', () => {
			assert(idMaps.hasUniqueId(testMappings, "66465367"))
			assert(idMaps.hasUniqueId(testMappings, "88486631"))
		})
		it('Should return false when unique ID not present', () => {
			assert(!idMaps.hasUniqueId(testMappings, "2134"))
		})
	})
	describe('Adding', () => {
		it('Should add a new mapping', async () => {
			let curMap = testMappings[0];
			await idMaps.addIDMapping(testExperimentId, curMap.chatId, curMap.uniqueId);

			let experiment = await idMaps.getExperiment(testExperimentId);
			let newMappings = experiment.IDMappings;
			expect(newMappings.length).to.equal(1);
			assert(idMaps.hasChatId(newMappings, curMap.chatId))
			assert(idMaps.hasUniqueId(newMappings, curMap.uniqueId))

		});
	})

	describe('Getting mappings', () => {
		let curMap = testMappings[0]
		it('Should get by chatId', async () => {
			let foundMap = await idMaps.getByChatId(testExperimentId, curMap.chatId);
			expect(foundMap).to.not.be.undefined;
			expect(foundMap.chatId).to.equal(curMap.chatId);
			expect(foundMap.uniqueId).to.equal(curMap.uniqueId);
		})
		it('Should get by uniqueId', async () => {
			let foundMap = await idMaps.getByUniqueId(testExperimentId, curMap.uniqueId);
			expect(foundMap).to.not.be.undefined;
			expect(foundMap.chatId).to.equal(curMap.chatId);
			expect(foundMap.uniqueId).to.equal(curMap.uniqueId);
		})
		it('Should return undefined when chatId doesnt exist', async () => {
			let foundMap = await idMaps.getByChatId(testExperimentId, "skeep");
			expect(foundMap).to.be.undefined;

		})
		it('Should return undefined when uniqueId doesnt exist', async () => {
			let foundMap = await idMaps.getByUniqueId(testExperimentId, "skeep");
			expect(foundMap).to.be.undefined;
		})
	})
	describe('Generating new IDs', () => {
		it('Should generate a new unique id of proper length', async () => {

			let newId = await idMaps.generateUniqueId(testExperimentId);
			let experiment = await idMaps.getExperiment(testExperimentId);
			let newMappings = experiment.IDMappings;
			expect(newId.length).to.equal(8);
			assert(!idMaps.hasUniqueId(newMappings, newId))

		});
	})

	describe('Updating uniqueId', () => {

		it('Should update the mapping when chatId is present', async () => {
			let curMap = testMappings[0];
			await idMaps.updateUniqueId(testExperimentId, curMap.chatId, "12345678");
			let experiment = await idMaps.getExperiment(testExperimentId);
			let newMap = await idMaps.getByChatId(testExperimentId, curMap.chatId);
			expect(experiment.IDMappings.length).to.equal(1);
			expect(newMap).to.not.be.undefined;
			expect(newMap.uniqueId).to.equal("12345678");
		})
		it('Should add the mapping when chatId is not present', async () => {
			let curMap = testMappings[1];
			await idMaps.updateUniqueId(testExperimentId, curMap.chatId, curMap.uniqueId);
			let experiment = await idMaps.getExperiment(testExperimentId);
			let newMap = await idMaps.getByChatId(testExperimentId, curMap.chatId);
			expect(experiment.IDMappings.length).to.equal(2);
			expect(newMap).to.not.be.undefined;
			expect(newMap.uniqueId).to.equal(curMap.uniqueId);
		})
	})
	describe('Deleting mappings' ,() => {
		it('Should delete by chatId', async() => {
			await idMaps.deleteByChatId(testExperimentId, testMappings[0].chatId);

			let experiment = await idMaps.getExperiment(testExperimentId);
			let oldMap = await idMaps.getByChatId(testExperimentId, testMappings[0].chatId);

			expect(experiment.IDMappings.length).to.equal(1);
			expect(oldMap).to.be.undefined;
			expect(!idMaps.hasChatId(experiment.IDMappings), testMappings[0].chatId);
		})
		it('Should do nothing when chatId not present', async() => {
			await idMaps.deleteByChatId(testExperimentId, "775");

			let experiment = await idMaps.getExperiment(testExperimentId);

			expect(experiment.IDMappings.length).to.equal(1);

		})
		it('Should do nothing when uniqueId not present', async() => {
			await idMaps.deleteByUniqueId(testExperimentId, "77523465");

			let experiment = await idMaps.getExperiment(testExperimentId);

			expect(experiment.IDMappings.length).to.equal(1);

		})
		it('Should delete by uniqueId', async() => {
			await idMaps.deleteByUniqueId(testExperimentId, testMappings[1].uniqueId);

			let experiment = await idMaps.getExperiment(testExperimentId);
			let oldMap = await idMaps.getByUniqueId(testExperimentId, testMappings[1].uniqueId);

			expect(experiment.IDMappings.length).to.equal(0);
			expect(oldMap).to.be.undefined;
			expect(!idMaps.hasUniqueId(experiment.IDMappings), testMappings[1].uniqueId);
		})
	})
	describe('Severing DB connection', () => {
		it('Should remove experiment', async () => {
			await idMaps.remove(testExperimentId);

			let experiment = await idMaps.getExperiment(testExperimentId);
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
	})
});
