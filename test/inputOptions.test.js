const InputOptions = require('../src/inputOptions');
const { expect, assert } = require('chai')
const config = require('../src/configReader').getExpConfig();

describe('Get keyboard layout', () => {
    describe('Single choice', () => {
        let options = ["1", "2", "3", "4"]
        it('Should return normal with no input', () => {
            let expectedReturn = options.slice();
            let ret = InputOptions.getButtonLayout(options);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return normal with 0', () => {
            let expectedReturn = options.slice();
            let ret = InputOptions.getButtonLayout(options, 0);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 1 column when 1', () => {
            let expectedReturn = [["1"], ["2"], ["3"], ["4"]]
            let ret = InputOptions.getButtonLayout(options, 1);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 2 column when 2', () => {
            let expectedReturn = [["1", "2"], ["3", "4"]]
            let ret = InputOptions.getButtonLayout(options, 2);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 3 column when 3', () => {
            let expectedReturn = [["1", "2", "3"], ["4"]]
            let ret = InputOptions.getButtonLayout(options, 3);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 3 column when 2.5', () => {
            let expectedReturn = [["1", "2", "3"], ["4"]]
            let ret = InputOptions.getButtonLayout(options, 2.5);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 4 column when 4', () => {
            let expectedReturn = [["1", "2", "3", "4"]]
            let ret = InputOptions.getButtonLayout(options, 4);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 4 column when > 4', () => {
            let expectedReturn = [["1", "2", "3", "4"]]
            let ret = InputOptions.getButtonLayout(options, 5);
            expect(ret).to.eql(expectedReturn)
        })

    })
    describe('Multi choice', () => {
        let options = ["1", "2", "3", "4"]
        it('Should return normal with no input', () => {
            let expectedReturn = options.slice();
            let termWord = config.phrases.keyboards.terminateAnswer["English"]
            expectedReturn.push(termWord)
            let ret = InputOptions.getButtonLayout(options, undefined, termWord);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return normal with 0', () => {
            let expectedReturn = options.slice();
            let termWord = config.phrases.keyboards.terminateAnswer["English"]
            expectedReturn.push(termWord)
            let ret = InputOptions.getButtonLayout(options, 0, termWord);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 1 column when 1', () => {
            let expectedReturn = [["1"], ["2"], ["3"], ["4"]]
            let termWord = config.phrases.keyboards.terminateAnswer["English"]
            expectedReturn.push([termWord])
            let ret = InputOptions.getButtonLayout(options, 1, termWord);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 2 column when 2', () => {
            let expectedReturn = [["1", "2"], ["3", "4"]]
            let termWord = config.phrases.keyboards.terminateAnswer["English"]
            expectedReturn.push([termWord])
            let ret = InputOptions.getButtonLayout(options, 2, termWord);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 3 column when 3', () => {
            let expectedReturn = [["1", "2", "3"], ["4"]]
            let termWord = config.phrases.keyboards.terminateAnswer["English"]
            expectedReturn.push([termWord])
            let ret = InputOptions.getButtonLayout(options, 3, termWord);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 3 column when 2.5', () => {
            let expectedReturn = [["1", "2", "3"], ["4"]]
            let termWord = config.phrases.keyboards.terminateAnswer["English"]
            expectedReturn.push([termWord])
            let ret = InputOptions.getButtonLayout(options, 2.5, termWord);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 4 column when 4', () => {
            let expectedReturn = [["1", "2", "3", "4"]]
            let termWord = config.phrases.keyboards.terminateAnswer["English"]
            expectedReturn.push([termWord])
            let ret = InputOptions.getButtonLayout(options, 4, termWord);
            expect(ret).to.eql(expectedReturn)
        })
        it('Should return 4 column when > 4', () => {
            let expectedReturn = [["1", "2", "3", "4"]]
            let termWord = config.phrases.keyboards.terminateAnswer["English"]
            expectedReturn.push([termWord])
            let ret = InputOptions.getButtonLayout(options, 5, termWord);
            expect(ret).to.eql(expectedReturn)
        })

    })
})