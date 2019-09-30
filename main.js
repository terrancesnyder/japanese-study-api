'use strict';

// opening/writing files ... of course
const fs = require('fs');

// wrap line processor to allow promise structure (...().then().error())
const promise = require('bluebird');
const _ = require('underscore');

// process file line by line
const line_reader = require('line-reader');
var eachLine = promise.promisify(line_reader.eachLine);

// output CSV for quizlet
const Csv = require('csv');
const stringify = require('csv-stringify');
const generate = require('csv-generate');

// axios
const superagent = require('superagent');

// api
const jishoApi = require('unofficial-jisho-api');
const jisho = new jishoApi();

// process arguments
var argv = require('minimist')(process.argv.slice(2));
let input  = argv._[0];

if (!input) {
  console.error('Missing argument for japanese-io TSV file.')
  return;
}

// create our output directory
if (!fs.existsSync('output')){
  fs.mkdirSync('output');
}

var kanji = [];

eachLine(input, function(line) {
    // good lines have numeric start and then tab...
    if (line.match(/^[0-9]+\t.*$/)) {
      var obj = {
        id: line.split(/\t/)[0],
        word: line.split(/\t/)[1].split(';')[0],
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
  console.log('[--- input complete processing ' + kanji.length + ' kanji ---]');
  fs.writeFileSync('output/kanji.json', JSON.stringify(kanji));

  fs.writeFileSync('output/kanji.db.json', '');

  var pop = function() {
    var obj = kanji.pop();
    if (obj == null) {
      return;
    }

    console.log(`Processing Kanji ${obj.word} ... ${kanji.length} remaining...`);

    superagent.get('https://jisho.org/api/v1/search/words').query({ keyword: obj.word }).then((res) => {

      // take first argument as result
      var data = res.body.data[0];

      var record = {
        word: data.word,
        jlpt: data.jlpt,
        japanese: {
          word: data.japanese[0].word,
          reading: data.japanese[0].reading
        },
        english: {
          definitions: data.senses[0].english_definitions,
          parts_of_speach: data.senses[0].parts_of_speech
        }
      };

      // grab example sentences
      jisho.searchForExamples(obj.word).then(result => {
        if (result.found) {
          record.examples = result.results;
        }

        fs.appendFileSync('output/kanji.db.json', JSON.stringify(record) + '\n');

        pop();
      });

    }).catch(err => {
      console.log(err);
    });

  }

  pop();

  kanji.forEach(function(obj) {

    // agent.get('https://jisho.org/api/v1/search/words').query({ keyword: kanji }).end((err, result) => {
    //   console.log(err);
    // })

    // superagent.get('https://kanjiapi.dev/v1/' + kanji).end((err, result) => {
    //   console.log(result);
    // });

    // // obj.word.split('')
    // kanji_jisho_api_lookup(obj.word).done((data) => {    
    //   var info = {
    //     slug: data.slug,
    //     jlpt: data.jlpt,
    //     japanese: {
    //       word: data.japanese.word,
    //       reading: data.japanese.reading
    //     },
    //     english: {
    //       definitions: data.senses[0].english_definitions,
    //       parts_of_speach: data.senses[0].parts_of_speech
    //     }
    //   }
    //    console.log(data.slug + ' - ' + data.jlpt + ' - ' + );
    // });

    // fs.appendFileSync('output/japanese-io-quizlet.csv', obj.word + ',' + obj.reading + '\n');
  });

});