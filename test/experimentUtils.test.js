const experimentUtils = require('../src/experimentUtils');
const expect = require('chai').expect
const moment = require('moment-timezone');
const {getNowDateObject} = require("../src/experimentUtils");

const map = {'1234': 0};
const conditionAssignments = [0.5, 0.5]
const conditionAssignments2 = [1, 1, 2];
const currentAssignments = [2,1];
const currentAssignments2 = [1,1,1]
const currentAssignments3 = [20,20,35]

describe('Condition assignment', () => {
	describe('Pid Map', () => {
		it('assigns to condition by PID', () => {
			const result = experimentUtils.assignToCondition('1234', map, conditionAssignments, currentAssignments,"pid")
			expect(result).to.equal(0);
		})
		it('assigns to condition by balanced when PID not recognized', () => {
			const result = experimentUtils.assignToCondition('1235', map, conditionAssignments, currentAssignments,"pid")
			expect(result).to.equal(1);
		})
	})
	describe('Natural assignment', () => {
		it('balances by condition - 1', () => {
			const result = experimentUtils.assignToCondition('1235', map, conditionAssignments, currentAssignments,"balanced")
			expect(result).to.equal(1);
		})
		it('balances by condition - 2', () => {
			const result = experimentUtils.assignToCondition('1235', map, conditionAssignments2, currentAssignments2,"balanced")
			expect(result).to.equal(2);
		})
		it('balances by condition - 3', () => {
			const result = experimentUtils.assignToCondition('1235', map, conditionAssignments2, currentAssignments3,"balanced")
			expect(result).to.equal(2);
		})
		it('tends to the natural balance', () => {
			const numParts = 100;
			const curAssignments = [0,0,0];
			const conAssignments = [5,3,2];
		    
		    relParts = conAssignments.reduce((a, b) => a + b, 0);
		    relReqAssignments = conAssignments.map(n => parseFloat(n / relParts));

		    for(let i = 0; i < numParts; i++){
		    	let assignment = experimentUtils.assignToCondition('1235', map, conAssignments, curAssignments, "balanced");
		    	
		    	curAssignments[assignment] += 1;

		    }

		    totalParts = curAssignments.reduce((a, b) => a + b, 0);
		    relCurAssignments = curAssignments.map(n => parseFloat(n / totalParts));

		    relDiffs = [];
		    for(let i=0; i < relCurAssignments.length; i++){
		      relDiffs.push(relReqAssignments[i] - relCurAssignments[i]);
		    }
		    expect(relDiffs.every(val => Math.abs(val) < 0.05)).to.be.true;
		})
	})
})

describe('Date functions', () => {
	it('Should parse a moment date string properly (ahead of UTC)', () => {
		let dateString = "2022-04-29T01:32:34+02:00";
		let dateObj = experimentUtils.parseMomentDateString(dateString);

		expect(dateObj.days).to.equal(29);
		expect(dateObj.years).to.equal(2022);
		expect(dateObj.months).to.equal(4);
		expect(dateObj.hours).to.equal(1);
		expect(dateObj.minutes).to.equal(32);
		expect(dateObj.seconds).to.equal(34);

	})

	it('Should parse a moment date string properly (behind of UTC)', () => {
		let dateString = "2022-04-29T01:32:34-02:00";
		let dateObj = experimentUtils.parseMomentDateString(dateString);

		expect(dateObj.days).to.equal(29);
		expect(dateObj.years).to.equal(2022);
		expect(dateObj.months).to.equal(4);
		expect(dateObj.hours).to.equal(1);
		expect(dateObj.minutes).to.equal(32);
		expect(dateObj.seconds).to.equal(34);

	})


})