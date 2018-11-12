var fs = require('fs');
var path = require('path');
var async = require('async')
var coreNlp = require("../nlp/coreNlp..js");
var thesaurus = require("../nlp/thesaurus..js");


var graphBuilder = {

    extractAllTokens: function (docs, callback) {
        var tokenizedDocs = [];
        var allNounTokens = {};
        var allNumTokens = [];
        async.eachSeries(docs, function (doc, callbackEachDoc) {
            var text = doc.text + " " + doc.title;
            if (doc.table)
                text += " " + doc.table.replace(/<[^>]*>/, " ")
            //  var text = doc.Texte;//+ " "+doc.Title;

            coreNlp.extractTokens(text, function (err, tokens) {
                if(err){
                    console.log(err)
                    return callback(err);

                }
if (!tokens)
    callbackEachDoc(null);
              else   {
                    var nouns = tokens.nouns;
                    var numValues = tokens.numValues;


                    doc.numTokens = tokens.numValues;
                    doc.nounTokens = [];
                    if (!doc.numTokens)
                        doc.numTokens = [];

                    tokenizedDocs.push(doc);
                    async.eachSeries(tokens.nouns, function (token, callbackEachToken) {
                        // tokens.nouns.forEach(function(token){
                        var lemma = token.lemma.toLocaleLowerCase();
                        if (lemma.length > 3 && lemma.indexOf("<") < 0) {
                            doc.nounTokens.push(lemma);
                            if (!allNounTokens[lemma] ) {
                                var obj = {term: lemma, concepts: []}
                                allNounTokens[lemma]=obj;
                                thesaurus.findInElasticThesaurus(lemma, "totalref_thesaurus", function (err, result) {
                                    if(result && result.forEach) {
                                        result.forEach(function (thesaurusEntry) {
                                            allNounTokens[lemma].concepts.push(thesaurusEntry._source)
                                        })
                                    }


                                });

                            }

                        }
                        callbackEachToken(null);
                    }, function (err) {
                         callbackEachDoc();


                    })


                }


            })
        }, function (err) {
                if (err)
                    return callback(err)
                return callback(null, {tokenizedDocs: tokenizedDocs, allNounTokens: allNounTokens})

            } )
    }


}


if (true
) {

    var file = "D:\\Total\\docs\\GM MEC Word\\documents\\test\\elasticAllParagraphs.json";
    var file = "D:\\Total\\docs\\GM MEC Word\\documents\\elasticAllParagraphs.json";
    var data = "" + fs.readFileSync(file);
    var docs = JSON.parse(data);
    graphBuilder.extractAllTokens(docs, function (err, result) {
        fs.writeFileSync("D:\\Total\\docs\\nlp\\allNounTokens.json",JSON.stringify(result.allNounTokens, null, 2))
        fs.writeFileSync("D:\\Total\\docs\\nlp\\tokenizedDocs.json",JSON.stringify(result.tokenizedDocs, null, 2))
        //   thesaurus.getWordsConcepts(result.allNounTokens,"totalRef")

    });

}

module.exports = graphBuilder;