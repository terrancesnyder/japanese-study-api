'use strict';

// opening/writing files ... of course
const Fs  = require('fs');

// wrap line processor to allow promise structure (...().then().error())
const Promise = require('bluebird');

// process file line by line
const lineReader = require('line-reader');
var eachLine = Promise.promisify(lineReader.eachLine);

// output CSV for quizlet
const Csv = require('csv');
const stringify = require('csv-stringify');
const generate = require('csv-generate');

// axios
const superagent = require('superagent');

var argv = require('minimist')(process.argv.slice(2));
let input  = argv._[0];

if (!input) {
  console.error('Missing argument for japanese-io TSV file.')
  return;
}

var kanji = [];

eachLine(input, function(line) {
    // good lines have numeric start and then tab...
    if (line.match(/^[0-9]+\t.*$/)) {
      var obj = {
        id: line.split(/\t/)[0],
        word: line.split(/\t/)[1],
        reading: line.split(/\t/)[2],
        definition: line.split(/\t/)[3].replace(/\"/,'')
      };
      kanji.push(obj);
    } else {
      // continuation of kanji description
      if (kanji[kanji.length-1]) {
        kanji[kanji.length-1].definition += ' ... ' + line;
      }
    }
    
}).then(function() {
  console.log('[--- done processing ' + kanji.length + ' kanji ---]');
  Fs.writeFileSync('output.json', JSON.stringify(kanji));

  Fs.writeFileSync('japanese-io-quizlet.csv', 'word,reading\n');
  kanji.forEach(function(obj) {
    Fs.appendFileSync('japanese-io-quizlet.csv', obj.word + ',' + obj.reading + '\n');
  });

  kanji_jisho_api_lookup(kanji[0].word).done((data) => {
    console.log(data);
  })

});

/**
 * Grab and lookup the kanji from open API to get other definitions
 * and other key information
 * 
 * @param {*} kanji The kanji character to lookup
 */
var kanji_jisho_api_lookup = function(kanji) {
  return new Promise(function (resolve, reject) {
  superagent.get('https://jisho.org/api/v1/search/words')
    .query({ keyword: kanji })
    .end((err, res) => {
      if (err) { 
        reject(err);
        return console.log(err); 
      }
      resolve(res.body.data[0])
    });
  });
}