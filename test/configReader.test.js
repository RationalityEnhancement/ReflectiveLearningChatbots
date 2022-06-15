const ConfigReader = require('../src/configReader');
const { assert, expect } = require('chai');

const testFile = require('../json/test/filename/filenameTest.json');

describe('Replacing file name deeply', () =>{
    it('Replacing normally', ()=>{
        let returnObj = ConfigReader.replaceFilenameDeeply(testFile["normal"].input);
        expect(returnObj).to.eql(testFile["normal"].target);
    })
    it('Invalid JSON', ()=>{
        let returnObj = ConfigReader.replaceFilenameDeeply(testFile["invalidJSON"].input);
        expect(returnObj).to.eql(testFile["invalidJSON"].target);
    })
    it('Missing extension', ()=>{
        let returnObj = ConfigReader.replaceFilenameDeeply(testFile["missingExtension"].input);
        expect(returnObj).to.eql(testFile["missingExtension"].target);
    })
    it('File doesnt exist', ()=>{
        let returnObj = ConfigReader.replaceFilenameDeeply(testFile["fileNotExist"].input);
        expect(returnObj).to.eql(testFile["fileNotExist"].target);
    })
})